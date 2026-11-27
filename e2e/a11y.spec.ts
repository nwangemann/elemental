import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { contrastFailures } from './contrast.ts';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Loads the app and waits until the character stands on its first tile and the camera settles. */
async function ready(page: Page, path = '/', tile = '1') {
  await page.goto(path);
  await expect(page.locator('[data-tile]')).toHaveAttribute('data-tile', tile, { timeout: 15_000 });
  await page.waitForTimeout(3_000);
}

/** axe finds nothing, and text over the scene (which axe cannot judge) meets AA too. */
async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
  expect(await contrastFailures(page)).toEqual([]);
}

test('the interface passes an accessibility audit with the panel open', async ({ page }) => {
  await ready(page);
  await expect(page.getByRole('complementary', { name: 'Hydrogen' })).toHaveAttribute(
    'data-open',
    'true',
  );
  await audit(page);
  // The scene follows the HUD in the DOM; the title must still be drawn on top of it.
  const onTop = await page.getByRole('heading', { name: 'elemental' }).evaluate((h) => {
    // The HUD ignores the pointer; let it be hit for this probe only.
    h.style.pointerEvents = 'auto';
    const r = h.getBoundingClientRect();
    const hit = h.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    h.style.pointerEvents = '';
    return hit;
  });
  expect(onTop).toBe(true);
});

test('a transition metal panel passes too', async ({ page }) => {
  await ready(page, '/#/Au', '79');
  await audit(page);
});

test('the colour lens legend passes an accessibility audit', async ({ page }) => {
  await ready(page, '/#/Fe?colour=density', '26');
  await expect(page.getByRole('figure', { name: /Density/ })).toBeVisible();
  await audit(page);
});

test('the temperature lens row passes an accessibility audit', async ({ page }) => {
  await ready(page, '/#/Ga?t=310.15', '31');
  await expect(page.getByRole('slider', { name: 'Temperature' })).toBeVisible();
  await expect(page.locator('.scrub-summary')).toBeVisible();
  await audit(page);
});

test('the discovery lens row passes an accessibility audit', async ({ page }) => {
  await ready(page, '/#/Ne?year=1869', '10');
  await expect(page.getByRole('slider', { name: 'Discovery' })).toBeVisible();
  await expect(page.locator('.era-lens .scrub-summary').first()).toBeVisible();
  await audit(page);
});

test('the explorer, key map and element list pass an accessibility audit', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('/');
  await expect(page.getByRole('dialog', { name: /explore/i })).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');

  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keys' })).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'List' }).click();
  await expect(page.getByRole('dialog', { name: /all 118 elements/i })).toBeVisible();
  await audit(page);
});

test('tab order runs from the title buttons to the table, then the panel', async ({ page }) => {
  await ready(page);
  const order: string[] = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate(() => {
        const a = document.activeElement;
        if (a?.tagName === 'SELECT' || a?.tagName === 'INPUT') return 'lens';
        return a?.id === 'scene' ? 'scene' : a?.textContent?.trim() || '';
      }),
    );
  }
  // Four lens stops: the height and colour selects, the temperature and discovery toggles.
  expect(order.slice(0, 8)).toEqual([
    expect.stringMatching(/^Explore/),
    expect.stringMatching(/^Keys/),
    'List',
    'lens',
    'lens',
    'lens',
    'lens',
    'scene',
  ]);
  // After the table, focus moves into the open panel (its selected tab).
  expect(order[8]).toBe('Overview');
});

test('the element list reads the table as text and walks to a choice', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'List' }).click();
  const list = page.getByRole('dialog', { name: /all 118 elements/i });
  const table = list.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(119);
  await expect(table.getByRole('row', { name: /Hydrogen/ })).toHaveAttribute(
    'aria-current',
    'location',
  );
  await expect(table.getByRole('row', { name: /Gold/ })).toContainText('Transition metal');

  await table.getByRole('button', { name: 'Gold' }).click();
  await expect(list).toBeHidden();
  await expect(page.locator('[data-tile]')).toHaveAttribute('data-tile', '79', { timeout: 10_000 });
  await expect(page.getByRole('complementary', { name: 'Gold' })).toBeVisible();
});
