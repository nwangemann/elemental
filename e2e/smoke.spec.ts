import { expect, test } from '@playwright/test';

test('the app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'elemental' })).toBeVisible();
});

test('the panel shows the element under the character', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('complementary', { name: 'Hydrogen' });
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await panel.getByRole('tab', { name: 'Properties' }).click();
  await expect(panel.getByText('Melting point', { exact: true })).toBeVisible();
  await expect(panel.getByRole('list', { name: 'Highlights' })).toContainText(
    'Least dense of all elements',
  );
});

test('clicking the tile below hydrogen walks onto lithium', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: 15_000 });
  // Let the establishing shot settle, so the camera frames hydrogen at the centre.
  await page.waitForTimeout(3_000);
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + box.height * 0.22);
  await expect(status).toHaveAttribute('data-tile', '3', { timeout: 5_000 });
  await expect(page.getByRole('complementary', { name: 'Lithium' })).toBeVisible();
});

test('a deep link starts on its element', async ({ page }) => {
  await page.goto('/#/Au');
  await expect(page.getByRole('complementary', { name: 'Gold' })).toBeVisible({ timeout: 15_000 });
});

test('the explorer finds an element and flies there', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: 15_000 });
  await page.keyboard.press('/');
  const search = page.getByRole('combobox', { name: /search/i });
  await expect(search).toBeFocused();
  await search.fill('neon');
  await expect(
    page.getByRole('listbox', { name: 'Elements' }).getByRole('option').first(),
  ).toContainText('Neon');
  await page.keyboard.press('Enter');
  await expect(status).toHaveAttribute('data-tile', '10');
  await expect(page.getByRole('complementary', { name: 'Neon' })).toBeVisible();
  await expect(page).toHaveURL(/#\/Ne$/);
});

test('the keyboard alone tours tiles and reads a panel', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: 15_000 });

  // Tab reaches the focusable table.
  const scene = page.getByRole('application', { name: /periodic table/i });
  for (let i = 0; i < 8 && (await page.locator('#scene:focus').count()) === 0; i++)
    await page.keyboard.press('Tab');
  await expect(scene).toBeFocused();

  // H → Li → Be → B (over the transition gap) → C.
  for (const [key, tile] of [
    ['k', '3'],
    ['l', '4'],
    ['l', '5'],
    ['l', '6'],
  ] as const) {
    await page.keyboard.press(key);
    await expect(status).toHaveAttribute('data-tile', tile, { timeout: 10_000 });
  }

  // Esc closes the panel; Enter opens it with focus inside.
  const panel = page.getByRole('complementary', { name: 'Carbon' });
  await expect(panel).toHaveAttribute('data-open', 'true');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('data-open', 'false');
  await page.keyboard.press('Enter');
  await expect(panel).toHaveAttribute('data-open', 'true');
  await expect(panel).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowRight');
  await expect(panel.getByRole('tab', { name: 'Properties' })).toBeFocused();
  await expect(panel.getByText('Melting point', { exact: true })).toBeVisible();
  // Esc from inside the panel returns to the table.
  await page.keyboard.press('Escape');
  await expect(scene).toBeFocused();

  // `?` shows the key map; Esc closes it.
  await page.keyboard.press('?');
  const help = page.getByRole('dialog', { name: 'Keys' });
  await expect(help).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});

test('walking off the table and pressing R returns to the last tile', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: 15_000 });

  // Hydrogen sits on the left edge: walk left off it onto the ground.
  await page.keyboard.down('ArrowLeft');
  await expect(status).toHaveAttribute('data-off', 'true', { timeout: 5_000 });
  await page.keyboard.up('ArrowLeft');
  await expect(status).toHaveText('Off the table. Press R to return.');
  await expect(status).toHaveAttribute('data-tile', '');
  await expect(page.getByRole('button', { name: /back to the table/i })).toBeVisible({
    timeout: 5_000,
  });

  await page.keyboard.press('r');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: 10_000 });
  await expect(status).toHaveAttribute('data-off', 'false');
  await expect(page.getByRole('button', { name: /back to the table/i })).toBeHidden();
});

test('] and [ step by atomic number', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: 15_000 });
  await page.keyboard.press(']');
  await expect(status).toHaveAttribute('data-tile', '2', { timeout: 10_000 });
  await expect(page.getByRole('complementary', { name: 'Helium' })).toBeVisible();
  await page.keyboard.press('[');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: 10_000 });
});
