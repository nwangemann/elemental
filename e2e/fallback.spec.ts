import { expect, test } from '@playwright/test';

// A browser without WebGL: the scene cannot start, and the page must still work as text.
test('without WebGL the page explains, and the panel, list and explorer still work', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type.startsWith('webgl')) return null;
      return (original as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/#/Au');

  await expect(page.getByRole('alert')).toContainText("couldn't start 3D graphics");
  await expect(page.getByRole('complementary', { name: 'Gold' })).toBeVisible();

  await page.getByRole('button', { name: 'List' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Neon' }).click();
  await expect(page.getByRole('complementary', { name: 'Neon' })).toBeVisible();

  await expect(page).toHaveURL(/#\/Ne$/);

  await page.keyboard.press('/');
  const search = page.getByRole('combobox', { name: /search/i });
  await expect(search).toBeFocused();
  await search.fill('iron');
  await expect(
    page.getByRole('listbox', { name: 'Elements' }).getByRole('option').first(),
  ).toContainText('Iron');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary', { name: 'Iron' })).toBeVisible();
  await expect(page).toHaveURL(/#\/Fe$/);
});
