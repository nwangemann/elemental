/// <reference lib="dom" />
// The DOM lib is referenced here because this file's callbacks run in the page.
import type { Page } from '@playwright/test';

export interface ContrastResult {
  selector: string;
  text: string;
  ratio: number;
  required: number;
}

/**
 * Measures text contrast for every visible text element in the DOM interface, including text
 * that sits over the 3D scene, which axe reports as "incomplete" because it cannot see behind a
 * canvas. It screenshots the scene with the interface hidden, then, for each element, composites
 * its own and its ancestors' background colours over the lightest and the darkest scene pixel
 * behind it and keeps the worse of the two ratios. Returns the elements below WCAG AA (4.5:1, or
 * 3:1 for large text).
 */
export async function contrastFailures(page: Page): Promise<ContrastResult[]> {
  // Hiding the interface drops focus to the body; the handle puts it back afterwards.
  const focused = await page.evaluateHandle(() => document.activeElement);
  await page.evaluate(() => {
    const root = document.getElementById('root');
    for (const el of root?.children ?? [])
      if (el instanceof HTMLElement && !el.querySelector('canvas')) {
        el.dataset.contrastHidden = el.style.visibility;
        el.style.visibility = 'hidden';
      }
  });
  const shot = (await page.screenshot({ animations: 'disabled' })).toString('base64');
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-contrast-hidden]')) {
      el.style.visibility = el.dataset.contrastHidden ?? '';
      delete el.dataset.contrastHidden;
    }
  });
  await focused.evaluate((el) => {
    if (el instanceof HTMLElement) el.focus();
  });
  await focused.dispose();

  return page.evaluate(async (png) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const scale = img.width / window.innerWidth;

    type Rgba = [number, number, number, number];
    const probe = document.createElement('canvas').getContext('2d')!;
    const parse = (css: string): Rgba => {
      // Let the browser resolve any colour syntax to rgba via a 1×1 fill.
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = css;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
      return [r!, g!, b!, a! / 255];
    };
    const over = (top: Rgba, below: Rgba): Rgba => [
      top[0] * top[3] + below[0] * (1 - top[3]),
      top[1] * top[3] + below[1] * (1 - top[3]),
      top[2] * top[3] + below[2] * (1 - top[3]),
      1,
    ];
    // Everything here runs in the page, so helpers stay inside this callback.
    // oxlint-disable-next-line unicorn/consistent-function-scoping -- serialized into the page
    const linear = (v: number) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const lum = ([r, g, b]: Rgba) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    const ratio = (a: Rgba, b: Rgba) =>
      (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

    const failures: ContrastResult[] = [];

    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (!own || el.closest('[inert], [aria-hidden="true"], .visually-hidden, canvas')) continue;
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      const style = getComputedStyle(el);
      if (style.visibility !== 'visible' || Number(style.opacity) === 0) continue;

      // Backgrounds from the element outwards, stopping at the first opaque one.
      const layers: Rgba[] = [];
      for (let p: Element | null = el; p; p = p.parentElement) {
        const bg = parse(getComputedStyle(p).backgroundColor);
        if (bg[3] > 0) layers.push(bg);
        if (bg[3] >= 1) break;
        // An open modal dialog paints its ::backdrop between the page and itself.
        if (p instanceof HTMLDialogElement && p.open)
          layers.push(parse(getComputedStyle(p, '::backdrop').backgroundColor));
      }
      // Paint from the outermost layer in, over the scene pixel.
      const paint = (base: Rgba) => layers.reduceRight((acc, l) => over(l, acc), base);

      let darkest: Rgba = [255, 255, 255, 1];
      let lightest: Rgba = [0, 0, 0, 1];
      const x0 = Math.max(0, Math.floor(box.left * scale));
      const y0 = Math.max(0, Math.floor(box.top * scale));
      const w = Math.min(c.width - x0, Math.ceil(box.width * scale));
      const h = Math.min(c.height - y0, Math.ceil(box.height * scale));
      if (w <= 0 || h <= 0) continue;
      const data = ctx.getImageData(x0, y0, w, h).data;
      for (let i = 0; i < data.length; i += 4) {
        const px: Rgba = [data[i]!, data[i + 1]!, data[i + 2]!, 1];
        if (lum(px) < lum(darkest)) darkest = px;
        if (lum(px) > lum(lightest)) lightest = px;
      }
      const fg = parse(style.color);
      const worst = Math.min(
        ...[darkest, lightest].map((scene) => {
          const bg = paint(scene);
          return ratio(over(fg, bg), bg);
        }),
      );
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const required = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (worst < required)
        failures.push({
          selector: el.id
            ? `#${el.id}`
            : `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`,
          text: (el.textContent ?? '').trim().slice(0, 40),
          ratio: Math.round(worst * 100) / 100,
          required,
        });
    }
    return failures;
  }, shot);
}
