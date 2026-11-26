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
  await expect(panel.getByText('Melting point')).toBeVisible();
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
