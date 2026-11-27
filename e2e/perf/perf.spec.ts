/// <reference lib="dom" />
// This spec runs timing code inside the page, so it needs the DOM types the other e2e files avoid.
import { expect, test, type Page } from '@playwright/test';

// `npm run perf`: load and frame-time numbers for the production build (see docs/performance.md).
// Not part of `npm run test:e2e`; run it before and after work that could cost load or frame time.

/** Time to first move target (ADR 0003) on the throttled "fast connection" profile. */
const FIRST_MOVE_BUDGET_MS = 2000;
/** Cold-cache loads per run; the report gives each and the median first move. */
const RUNS = 3;
/** Fast connection: 20 Mbps down, 5 Mbps up, 40 ms round trip. Held to the budget. */
const FAST = { latency: 40, downloadThroughput: (20e6 / 8) | 0, uploadThroughput: (5e6 / 8) | 0 };
/**
 * Slow connection, Lighthouse's mobile profile: 1.6 Mbps down, 750 kbps up, 150 ms round trip.
 * Reported only, as the baseline for load work (preloading, smaller chunks).
 */
const SLOW = {
  latency: 150,
  downloadThroughput: (1.6e6 / 8) | 0,
  uploadThroughput: (750e3 / 8) | 0,
};

interface LoadNumbers {
  firstPaint: number;
  sceneChunkStart: number;
  sceneChunkEnd: number;
  firstFrame: number;
  firstMove: number;
}

// Records when the scene first reports a tile (the character can walk from then on), and wraps
// requestAnimationFrame so each frame's work, GPU included (`gl.finish`), can be timed on demand.
const INIT = () => {
  const w = window as unknown as Record<string, unknown>;
  w.perfFirstMove = 0;
  w.perfFirstFrame = 0;
  w.perfFrames = null;
  new MutationObserver((_, obs) => {
    const s = document.getElementById('tile-status');
    if (s?.dataset.tile) {
      w.perfFirstMove = performance.now();
      obs.disconnect();
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-tile'] });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    raf((t) => {
      if (!w.perfFirstFrame && document.querySelector('canvas'))
        w.perfFirstFrame = performance.now();
      const frames = w.perfFrames as number[] | null;
      if (!frames) return cb(t);
      const start = performance.now();
      cb(t);
      const gl = document.querySelector('canvas')?.getContext('webgl2');
      gl?.finish();
      frames.push(performance.now() - start);
    });
};

async function loadNumbers(page: Page): Promise<LoadNumbers> {
  await expect(page.locator('#tile-status')).not.toHaveAttribute('data-tile', '', {
    timeout: 20_000,
  });
  return page.evaluate(() => {
    const scene = performance
      .getEntriesByType('resource')
      .find((e) => /\/Scene-[^/]+\.js$/.test(e.name)) as PerformanceResourceTiming | undefined;
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    const w = window as unknown as { perfFirstMove: number; perfFirstFrame: number };
    return {
      firstPaint: Math.round(paint?.startTime ?? 0),
      sceneChunkStart: Math.round(scene?.startTime ?? 0),
      sceneChunkEnd: Math.round(scene?.responseEnd ?? 0),
      firstFrame: Math.round(w.perfFirstFrame),
      firstMove: Math.round(w.perfFirstMove),
    };
  });
}

const quantile = (sorted: number[], q: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;

async function measureLoad(page: Page, network: typeof FAST, label: string) {
  // A fresh browser also starts its GPU process on the first WebGL page, which a visitor's
  // running browser has already done. Pay that on a blank page first.
  await page.goto('about:blank');
  await page.evaluate(() => document.createElement('canvas').getContext('webgl2')?.finish());

  await page.addInitScript(INIT);
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.emulateNetworkConditions', { offline: false, ...network });
  const runs: LoadNumbers[] = [];
  for (let i = 0; i < RUNS; i++) {
    await page.goto('/');
    runs.push(await loadNumbers(page));
  }
  const firstMoves = runs.map((r) => r.firstMove).toSorted((a, b) => a - b);
  const median = quantile(firstMoves, 0.5);
  console.log(`${label} ${JSON.stringify({ medianFirstMove: median, runs })}`);
  return median;
}

test('load: time to first move', async ({ page }) => {
  expect(await measureLoad(page, FAST, 'perf:load')).toBeLessThan(FIRST_MOVE_BUDGET_MS);
});

test('load: time to first move on a slow connection', async ({ page }) => {
  test.setTimeout(120_000);
  expect(await measureLoad(page, SLOW, 'perf:load-slow')).toBeGreaterThan(0);
});

test('frame work while walking', async ({ page }) => {
  await page.addInitScript(INIT);
  await page.goto('/?perf&quality=off');
  await expect(page.locator('#tile-status')).toHaveAttribute('data-tile', '1', {
    timeout: 20_000,
  });
  // Let the establishing shot finish so the walk measures the normal follow view.
  await page.waitForTimeout(3_500);
  await page.evaluate(() => ((window as unknown as { perfFrames: number[] }).perfFrames = []));
  for (const [key, ms] of [
    ['ArrowDown', 2500],
    ['ArrowRight', 3000],
    ['ArrowUp', 1500],
    ['ArrowLeft', 2000],
  ] as const) {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  }
  const frames = await page.evaluate(
    () => (window as unknown as { perfFrames: number[] }).perfFrames,
  );
  const overlay = page.locator('output.perf');
  const sorted = frames.toSorted((a, b) => a - b);
  const result = {
    frames: sorted.length,
    medianMs: +quantile(sorted, 0.5).toFixed(2),
    p95Ms: +quantile(sorted, 0.95).toFixed(2),
    maxMs: +(sorted.at(-1) ?? 0).toFixed(2),
    drawCalls: Number(await overlay.getAttribute('data-calls')),
    dpr: Number(await overlay.getAttribute('data-dpr')),
  };
  console.log(`perf:frames ${JSON.stringify(result)}`);
  expect(result.frames).toBeGreaterThan(100);
  // Frame work, not interval: it must leave most of a 60 Hz frame free.
  expect(result.p95Ms).toBeLessThan(8);
});

test('frame work while the colour lens eases', async ({ page }) => {
  await page.addInitScript(INIT);
  await page.goto('/?perf&quality=off#/H?colour=meltingPoint');
  await expect(page.locator('#tile-status')).toHaveAttribute('data-tile', '1', {
    timeout: 20_000,
  });
  await page.waitForTimeout(3_500);
  await page.evaluate(() => ((window as unknown as { perfFrames: number[] }).perfFrames = []));
  // Walk with the lens on, switching it (each switch eases the whole table) along the way.
  await page.keyboard.down('ArrowRight');
  for (const colour of ['density', 'electronegativity', 'yearDiscovered', 'meltingPoint']) {
    await page.evaluate((c) => (window.location.hash = `#/H?colour=${c}`), colour);
    await page.waitForTimeout(700);
  }
  await page.keyboard.up('ArrowRight');
  await expect(page).toHaveURL(/colour=meltingPoint/);
  const frames = await page.evaluate(
    () => (window as unknown as { perfFrames: number[] }).perfFrames,
  );
  const overlay = page.locator('output.perf');
  const sorted = frames.toSorted((a, b) => a - b);
  const result = {
    frames: sorted.length,
    medianMs: +quantile(sorted, 0.5).toFixed(2),
    p95Ms: +quantile(sorted, 0.95).toFixed(2),
    maxMs: +(sorted.at(-1) ?? 0).toFixed(2),
    drawCalls: Number(await overlay.getAttribute('data-calls')),
  };
  console.log(`perf:tint ${JSON.stringify(result)}`);
  expect(result.frames).toBeGreaterThan(60);
  expect(result.drawCalls).toBe(11);
  expect(result.p95Ms).toBeLessThan(8);
});

/** Idle seconds counted, after the establishing shot and the pacer's settle time. */
const IDLE_SECONDS = 5;

test('frames while idle', async ({ page }) => {
  await page.addInitScript(INIT);
  await page.goto('/?perf&quality=off');
  await expect(page.locator('#tile-status')).toHaveAttribute('data-tile', '1', {
    timeout: 20_000,
  });
  // Establishing shot (2.5 s) plus the pacer's settle time (1.5 s), with room to spare.
  await page.waitForTimeout(5_000);
  await page.evaluate(() => ((window as unknown as { perfFrames: number[] }).perfFrames = []));
  await page.waitForTimeout(IDLE_SECONDS * 1000);
  const frames = await page.evaluate(
    () => (window as unknown as { perfFrames: number[] }).perfFrames.length,
  );
  const result = { seconds: IDLE_SECONDS, frames, fps: +(frames / IDLE_SECONDS).toFixed(1) };
  console.log(`perf:idle ${JSON.stringify(result)}`);
  // The idle rate is 20 fps (CONFIG.pacing); well under a 60 Hz display, and still drawing.
  expect(result.fps).toBeGreaterThan(5);
  expect(result.fps).toBeLessThan(30);
});
