import { expect, test } from '@playwright/test';

// CI runners draw with a software GPU, often below 10 fps. Walking caps each frame's step at
// 0.1 s, so there it moves slower than real time: give anything that waits on the scene longer.
const slow = (ms: number) => (process.env.CI ? ms * 4 : ms);

test('the app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'elemental' })).toBeVisible();
});

test('the panel shows the element under the character', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('complementary', { name: 'Hydrogen' });
  await expect(panel).toBeVisible({ timeout: slow(15_000) });
  await panel.getByRole('tab', { name: 'Properties' }).click();
  await expect(panel.getByText('Melting point', { exact: true })).toBeVisible();
  await expect(panel.getByRole('list', { name: 'Highlights' })).toContainText(
    'Least dense of all elements',
  );
});

test('clicking the tile below hydrogen walks onto lithium', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(15_000) });
  // Let the establishing shot settle, so the camera frames hydrogen at the centre.
  await page.waitForTimeout(3_000);
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + box.height * 0.22);
  await expect(status).toHaveAttribute('data-tile', '3', { timeout: slow(5_000) });
  await expect(page.getByRole('complementary', { name: 'Lithium' })).toBeVisible();
});

test('a deep link starts on its element', async ({ page }) => {
  await page.goto('/#/Au');
  await expect(page.getByRole('complementary', { name: 'Gold' })).toBeVisible({
    timeout: slow(15_000),
  });
});

test('the explorer finds an element and flies there', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(15_000) });
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
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(15_000) });

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
    await expect(status).toHaveAttribute('data-tile', tile, { timeout: slow(10_000) });
  }

  // Esc closes the panel; Enter opens it with focus inside.
  const panel = page.getByRole('complementary', { name: 'Carbon' });
  await expect(panel).toHaveAttribute('data-open', 'true');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('data-open', 'false');
  await page.keyboard.press('Enter');
  await expect(panel).toHaveAttribute('data-open', 'true');
  await expect(panel).toBeFocused();
  // Add to Combine comes first, then the tabs.
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: /Add to Combine/ })).toBeFocused();
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
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(15_000) });

  // Hydrogen sits on the left edge: walk left off it onto the ground.
  await page.keyboard.down('ArrowLeft');
  await expect(status).toHaveAttribute('data-off', 'true', { timeout: slow(5_000) });
  await page.keyboard.up('ArrowLeft');
  await expect(status).toHaveText('Off the table. Press R to return.');
  await expect(status).toHaveAttribute('data-tile', '');
  await expect(page.getByRole('button', { name: /back to the table/i })).toBeVisible({
    timeout: slow(5_000),
  });

  await page.keyboard.press('r');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(10_000) });
  await expect(status).toHaveAttribute('data-off', 'false');
  await expect(page.getByRole('button', { name: /back to the table/i })).toBeHidden();
});

test('] and [ step by atomic number', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(15_000) });
  await page.keyboard.press(']');
  await expect(status).toHaveAttribute('data-tile', '2', { timeout: slow(10_000) });
  await expect(page.getByRole('complementary', { name: 'Helium' })).toBeVisible();
  await page.keyboard.press('[');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(10_000) });
});

test('the height lens follows the deep link, the H key and the list', async ({ page }) => {
  await page.goto('/#/Fe?lens=density');
  await expect(page.getByRole('complementary', { name: 'Iron' })).toBeVisible({
    timeout: slow(15_000),
  });
  const lens = page.getByRole('combobox', { name: /height/i });
  await expect(lens).toHaveValue('density');

  // H cycles to the next lens, keeps the element in the link and is announced.
  await page.locator('#scene').focus();
  await page.keyboard.press('h');
  await expect(lens).toHaveValue('electronegativity');
  await expect(page).toHaveURL(/#\/Fe\?lens=electronegativity$/);
  await expect(page.locator('.lens-control [role=status]')).toHaveText(
    'Height lens: Electronegativity',
  );

  // The list gains a column for the lens; flat removes the lens from the link.
  await page.getByRole('button', { name: 'List' }).click();
  await expect(page.getByRole('columnheader', { name: 'Electronegativity' })).toBeVisible();
  await page.keyboard.press('Escape');
  await lens.selectOption('');
  await expect(page).toHaveURL(/#\/Fe$/);
});

test('the colour lens follows the deep link and the G key, with a legend', async ({ page }) => {
  await page.goto('/#/Fe?colour=meltingPoint');
  await expect(page.getByRole('complementary', { name: 'Iron' })).toBeVisible({
    timeout: slow(15_000),
  });
  const colour = page.getByRole('combobox', { name: /colour/i });
  await expect(colour).toHaveValue('meltingPoint');
  const legend = page.getByRole('figure', { name: 'Melting point' });
  await expect(legend).toContainText('Lowest: 0.95 K (−272.2 °C)');
  await expect(legend).toContainText('Highest: 3823 K (3550 °C)');
  await expect(legend).toContainText('No data (15)');

  // G cycles to the next lens and is announced; Shift G goes back; the link keeps up.
  await page.locator('#scene').focus();
  await page.keyboard.press('g');
  await expect(colour).toHaveValue('boilingPoint');
  await expect(page).toHaveURL(/#\/Fe\?colour=boilingPoint$/);
  await expect(page.locator('.lens-control [role=status]')).toHaveText(
    'Colour lens: Boiling point',
  );
  await page.keyboard.press('Shift+G');
  await expect(colour).toHaveValue('meltingPoint');

  // Density reads on a log scale; family colours remove the legend and the parameter.
  await colour.selectOption('density');
  await expect(page.getByRole('figure', { name: /Density/ })).toContainText('log scale');
  await colour.selectOption('');
  await expect(page.getByRole('figure')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/Fe$/);
});

test('the temperature lens follows the deep link, the T key and its presets', async ({ page }) => {
  await page.goto('/#/Ga?t=310.15');
  const panel = page.getByRole('complementary', { name: 'Gallium' });
  await expect(panel).toBeVisible({ timeout: slow(15_000) });
  await expect(panel.getByText('At 310 K')).toBeVisible();
  await expect(panel.locator('dt', { hasText: 'At 310 K' }).locator('+ dd')).toHaveText('Liquid');
  const slider = page.getByRole('slider', { name: 'Temperature' });
  await expect(slider).toHaveAttribute('aria-valuetext', '310.1 K (37 °C), body');
  await expect(page.getByRole('button', { name: 'Body' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.scrub-summary')).toHaveText('87 solid, 4 liquid, 11 gas, 16 unknown');

  // A preset moves the slider and the link; the counts are announced once it settles.
  await page.getByRole('button', { name: 'Water boils' }).click();
  await expect(page).toHaveURL(/#\/Ga\?t=373\.15$/);
  await expect(page.locator('.temp-lens [aria-live]')).toHaveText(/\d+ solid, \d+ liquid/);

  // T turns the lens off from the table, which drops the parameter and the panel line...
  await page.locator('#scene').focus();
  await page.keyboard.press('t');
  await expect(slider).toHaveCount(0);
  await expect(page).toHaveURL(/#\/Ga$/);
  await expect(page.locator('.lens-control [role=status]')).toHaveText('Temperature lens off');
  await expect(panel.getByText('At 373 K')).toHaveCount(0);

  // ...and back on at the last temperature, with focus on the slider, whose keys move it.
  await page.keyboard.press('t');
  await expect(slider).toBeFocused();
  await expect(page).toHaveURL(/#\/Ga\?t=373\.15$/);
  await page.keyboard.press('ArrowRight');
  await expect(page).not.toHaveURL(/t=373\.15$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#scene')).toBeFocused();

  // A link edited by hand to carry all three lenses keeps them all.
  await page.evaluate(() => {
    location.hash = '#/Fe?lens=density&colour=meltingPoint&t=1200';
  });
  await expect(page).toHaveURL(/#\/Fe\?lens=density&colour=meltingPoint&t=1200$/);
  await expect(slider).toHaveAttribute('aria-valuetext', /^1200 K/);
});

test('the discovery timeline follows the deep link, the Y key and its presets', async ({
  page,
}) => {
  await page.goto('/#/Ne?year=1869');
  const panel = page.getByRole('complementary', { name: 'Neon' });
  await expect(panel).toBeVisible({ timeout: slow(15_000) });
  await expect(panel.locator('dt', { hasText: 'In 1869' }).locator('+ dd')).toHaveText(
    'Not yet discovered',
  );
  const slider = page.getByRole('slider', { name: 'Discovery' });
  await expect(slider).toHaveAttribute('aria-valuetext', "1869, mendeleev's table");
  await expect(page.getByRole('button', { name: "Mendeleev's table" })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.era-lens .scrub-summary').first()).toHaveText('63 known, 55 to come');

  // A preset moves the slider and the link; the counts are announced once it settles.
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(page).toHaveURL(/#\/Ne\?year=2010$/);
  await expect(panel.locator('dt', { hasText: 'In 2010' }).locator('+ dd')).toHaveText('Known');
  await expect(page.locator('.era-lens [aria-live]')).toHaveText(/^118 known, 0 to come/);

  // Y turns the lens off from the table, which drops the parameter and the panel line...
  await page.locator('#scene').focus();
  await page.keyboard.press('y');
  await expect(slider).toHaveCount(0);
  await expect(page).toHaveURL(/#\/Ne$/);
  await expect(page.locator('.lens-control [role=status]')).toHaveText('Discovery lens off');
  await expect(panel.getByText('In 2010')).toHaveCount(0);

  // ...and back on at the last year, with focus on the slider; Home goes to Antiquity.
  await page.keyboard.press('y');
  await expect(slider).toBeFocused();
  await expect(page.locator('.lens-control [role=status]')).toHaveText('Discovery lens: 2010');
  await page.keyboard.press('Home');
  await expect(page).toHaveURL(/#\/Ne\?year=antiquity$/);
  await expect(slider).toHaveAttribute('aria-valuetext', 'Antiquity, antiquity');
  await page.keyboard.press('Escape');
  await expect(page.locator('#scene')).toBeFocused();
});

test('the timeline plays to today, and the slider pauses it', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/#/Ne?year=antiquity');
  const slider = page.getByRole('slider', { name: 'Discovery' });
  await expect(slider).toBeVisible({ timeout: slow(15_000) });
  const status = page.locator('.lens-control [role=status]');
  const play = page.locator('.era-play');

  // Play announces its start, moves the year on, and any slider input pauses it.
  await play.click();
  await expect(status).toHaveText('Playing the timeline from Antiquity');
  await expect(play).toHaveText('Pause');
  await expect(page).toHaveURL(/year=1[6-9]\d\d$/, { timeout: slow(10_000) });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(play).toHaveText('Play');
  await expect(status).toHaveText(/^Timeline paused at \d{4}$/);

  // Played again, it reaches today and says so; the counts stay quiet until then.
  await play.click();
  await expect(status).toHaveText(/^Playing the timeline from \d{4}$/);
  await expect(page).toHaveURL(/year=2010$/, { timeout: slow(25_000) });
  await expect(status).toHaveText('Timeline reached today');
  await expect(play).toHaveText('Play');
  await expect(page.locator('.era-lens .scrub-summary').first()).toHaveText('118 known, 0 to come');
});

test('with reduced motion the timeline plays a decade at a time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/Ne?year=antiquity');
  await expect(page.getByRole('slider', { name: 'Discovery' })).toBeVisible({
    timeout: slow(15_000),
  });
  await page.locator('.era-play').click();
  await expect(page).toHaveURL(/year=1650$/, { timeout: slow(5_000) });
  await expect(page).toHaveURL(/year=1660$/, { timeout: slow(5_000) });
  await page.locator('.era-play').click();
  await expect(page.locator('.lens-control [role=status]')).toHaveText(
    /^Timeline paused at 16[67]0$/,
  );
});

test('walking a density landscape climbs small steps and stops at a cliff', async ({ page }) => {
  const status = page.locator('[data-tile]');

  // Potassium to iron rises a little at each tile: the walk climbs on through.
  await page.goto('/#/K?lens=density');
  await expect(status).toHaveAttribute('data-tile', '19', { timeout: slow(15_000) });
  await page.waitForTimeout(1_000);
  await page.keyboard.down('ArrowRight');
  await expect(status).toHaveAttribute('data-tile', '26', { timeout: slow(10_000) });
  await page.keyboard.up('ArrowRight');

  // Krypton is a gas, bromine a liquid far denser: walking left from krypton meets a cliff.
  await page.goto('/#/Kr?lens=density');
  await expect(status).toHaveAttribute('data-tile', '36', { timeout: slow(15_000) });
  await page.waitForTimeout(1_000);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(1_500);
  await page.keyboard.up('ArrowLeft');
  await expect(status).toHaveAttribute('data-tile', '36');
  await expect(status).toHaveAttribute('data-off', 'false');

  // A keyboard tile step is a "go to that element": it climbs the cliff.
  await page.keyboard.press('j');
  await expect(status).toHaveAttribute('data-tile', '35', { timeout: slow(10_000) });
});

test('the atom tab draws chromium and notes its filling-rule exception', async ({ page }) => {
  await page.goto('/#/Cr');
  const panel = page.getByRole('complementary', { name: 'Chromium' });
  await expect(panel).toBeVisible({ timeout: slow(15_000) });
  await panel.getByRole('tab', { name: 'Atom' }).click();
  const diagram = panel.getByRole('img', { name: '2, 8, 13, 1 electrons; outer shell 1' });
  await expect(diagram).toBeVisible();
  await expect(diagram.locator('.atom-electron')).toHaveCount(24);
  await expect(panel.getByText('Chromium breaks the filling rule')).toBeVisible();
});

test('C picks up atoms into the Combine tray, which steps, clears and closes', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(15_000) });

  await page.keyboard.press('c');
  await page.keyboard.press('c');
  const tray = page.getByRole('region', { name: 'Combine' });
  await expect(tray).toBeVisible();
  const carried = tray.getByRole('list', { name: 'Carried' });
  await expect(carried).toHaveText(/H 2/);
  await expect(tray.getByRole('status')).toHaveText(
    'Carrying H 2. Makes hydrogen gas. Could become water with one O.',
  );

  await tray.getByRole('button', { name: 'One more hydrogen' }).click();
  await expect(carried).toHaveText(/H 3/);
  await tray.getByRole('button', { name: 'One fewer hydrogen' }).click();
  await tray.getByRole('button', { name: 'One fewer hydrogen' }).click();
  await expect(carried).toHaveText(/H 1/);

  await tray.getByRole('button', { name: 'Clear' }).click();
  await expect(tray.getByRole('list', { name: 'Starters' })).toContainText('Water');
  await expect(tray.getByRole('status')).toHaveText(
    'Carrying nothing. Try water, table salt or carbon dioxide.',
  );

  // Clear removed its own button, so focus moved to Close. Esc there closes the tray and
  // returns to the table; C opens it again.
  await expect(tray.getByRole('button', { name: 'Close Combine' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tray).toBeHidden();
  await expect(page.locator('#scene')).toBeFocused();
  await page.keyboard.press('c');
  await expect(carried).toHaveText(/H 1/);
  await tray.getByRole('button', { name: 'Close Combine' }).click();
  await expect(tray).toBeHidden();
});

test('the tray suggests the nearest compounds and fills in the right amounts', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '1', { timeout: slow(15_000) });
  await page.keyboard.press('c');
  const tray = page.getByRole('region', { name: 'Combine' });
  await expect(tray.getByRole('list', { name: 'Nearest compounds' })).toContainText(
    'Hydrogen gas — 1 more H',
  );

  // Fly to oxygen and pick one up: H 1, O 1 is water's elements in the wrong amounts.
  await page.keyboard.press('/');
  await page.getByRole('combobox', { name: /search/i }).fill('oxygen');
  await expect(
    page.getByRole('listbox', { name: 'Elements' }).getByRole('option').first(),
  ).toContainText('Oxygen');
  await page.keyboard.press('Enter');
  await expect(status).toHaveAttribute('data-tile', '8', { timeout: slow(10_000) });
  await page.keyboard.press('c');
  await expect(tray).toContainText('Water is H₂O: 2 hydrogen, 1 oxygen.');
  await tray.getByRole('button', { name: 'Fill in water' }).click();
  await expect(tray.getByRole('list', { name: 'Carried' })).toHaveText(/H 2.*O 1/s);
  await expect(tray.getByRole('status')).toContainText('Makes water.');
});

test('a matching carry forms, and one formula offers each of its compounds', async ({ page }) => {
  await page.goto('/#/C');
  const status = page.locator('[data-tile]');
  await expect(status).toHaveAttribute('data-tile', '6', { timeout: slow(15_000) });
  await page.keyboard.press('c');
  await page.keyboard.press('c');
  for (const [symbol, number] of [
    ['H', '1'],
    ['O', '8'],
  ] as const) {
    await page.evaluate((s) => (window.location.hash = `#/${s}`), symbol);
    await expect(status).toHaveAttribute('data-tile', number);
    await page.keyboard.press('c');
  }
  const tray = page.getByRole('region', { name: 'Combine' });
  for (let i = 0; i < 5; i++) await tray.getByRole('button', { name: 'One more hydrogen' }).click();
  await expect(tray.getByRole('status')).toContainText('Makes ethanol or dimethyl ether.');

  const choice = tray.getByRole('group', { name: 'Show which compound' });
  const ethanol = choice.getByRole('button', { name: 'Ethanol' });
  const ether = choice.getByRole('button', { name: 'Dimethyl ether' });
  await expect(ethanol).toHaveAttribute('aria-pressed', 'true');
  await ether.click();
  await expect(ether).toHaveAttribute('aria-pressed', 'true');
  await expect(ethanol).toHaveAttribute('aria-pressed', 'false');

  // One more atom and nothing forms: the choice goes away.
  await tray.getByRole('button', { name: 'One more oxygen' }).click();
  await expect(choice).toHaveCount(0);
});
