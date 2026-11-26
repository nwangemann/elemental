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
