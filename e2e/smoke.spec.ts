import { test, expect } from './fixtures.ts';
import { completeOnboarding, memorizeAll, playPerfectFirstDrill, readSave, typeCard, readCard } from './helpers.ts';
import { readFile, writeFile } from 'node:fs/promises';

test('fresh player: onboarding under 90 s, reload goes home', async ({ page }) => {
  const ms = await completeOnboarding(page);
  expect(ms).toBeLessThan(90_000);
  await page.reload();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Watch three cards' })).toHaveCount(0);
});

test('practice drill: perfect score and one more saved drill', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I know the method' }).click();
  expect((await readSave(page)) ?? { drills: [] }).toMatchObject({ drills: [] });
  await page.getByRole('button', { name: 'Start First Drill' }).click();
  await page.getByRole('button', { name: 'Start Memorizing' }).click();
  const cards = await memorizeAll(page, 3);
  expect(new Set(cards).size).toBe(3);
  for (const card of cards) await typeCard(page, card);
  await expect(page.getByText('Perfect Drill!')).toBeVisible();
  await page.getByRole('button', { name: /Back to Palace/ }).click();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
  expect((await readSave(page)).drills.length).toBe(1);
});

test('quit mid-drill during memorize and recall saves nothing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I know the method' }).click();
  await page.getByRole('button', { name: 'Start First Drill' }).click();
  await page.getByRole('button', { name: 'Start Memorizing' }).click();
  await readCard(page, 'Locus 1 / 3:');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit', exact: true }).click();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
  expect((await readSave(page)) ?? { drills: [] }).toMatchObject({ drills: [] });

  await page.getByRole('button', { name: 'Start First Drill' }).click();
  await page.getByRole('button', { name: 'Start Memorizing' }).click();
  await memorizeAll(page, 3);
  await expect.poll(() => page.locator('body').innerText()).toContain('Recall');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit', exact: true }).click();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
  expect((await readSave(page)) ?? { drills: [] }).toMatchObject({ drills: [] });
});

test('daily deck: two runs on the same day deal the same cards', async ({ page }) => {
  await completeOnboarding(page);
  const runs: string[][] = [];
  for (let run = 0; run < 2; run++) {
    await page.getByRole('button', { name: 'Daily Deck' }).click();
    // A drill from onboarding leaves fresh ghosts, so the game may warn first.
    await expect(page.getByRole('button', { name: /Start Memorizing|Play anyway/ })).toBeVisible();
    if (await page.getByRole('button', { name: 'Play anyway' }).count()) {
      await page.getByRole('button', { name: 'Play anyway' }).click();
    }
    await page.getByRole('button', { name: 'Start Memorizing' }).click();
    const cards: string[] = [];
    let i = 1;
    while (!(await page.getByRole('button', { name: /Done Memorizing/ }).count())) {
      cards.push(await readCard(page, `Locus ${i} /`));
      await page.keyboard.press('Space');
      i++;
    }
    cards.push(await readCard(page, `Locus ${i} /`));
    runs.push(cards);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Quit', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Daily Deck' })).toBeVisible();
  }
  expect(runs[1]).toEqual(runs[0]);
});

test('settings persist across reload', async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByLabel('Instant', { exact: true }).check();
  await page.getByLabel('Colour-blind-safe colours', { exact: false }).check();
  await page.getByLabel('Sound', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByLabel('Instant', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Colour-blind-safe colours', { exact: false })).toBeChecked();
  await expect(page.getByLabel('Sound', { exact: true })).not.toBeChecked();
  await expect(page.locator('html')).toHaveClass(/color-safe/);
});

test('export downloads JSON; broken import keeps save; valid import replaces it', async ({ page }, testInfo) => {
  await playPerfectFirstDrill(page);
  const before = await readSave(page);

  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Save' }).click(),
  ]);
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.drills.length).toBe(1);

  const broken = testInfo.outputPath('broken.json');
  await writeFile(broken, '{"drills": [ oops');
  await page.getByLabel('Import save file').setInputFiles(broken);
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await readSave(page)).toEqual(before);

  const valid = testInfo.outputPath('valid.json');
  await writeFile(valid, JSON.stringify({ ...exported, settings: { ...exported.settings, glideMs: 0 } }));
  page.once('dialog', (d) => d.accept());
  await page.getByLabel('Import save file').setInputFiles(valid);
  await expect.poll(async () => (await readSave(page)).settings.glideMs).toBe(0);
});

test('Shadow Walk enters and exits', async ({ page }) => {
  await playPerfectFirstDrill(page);
  await page.getByRole('button', { name: 'Shadow Walk' }).click();
  await expect(page.getByRole('button', { name: /Exit/ })).toBeVisible();
  await page.getByRole('button', { name: /Exit/ }).click();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
});
