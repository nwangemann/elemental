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
