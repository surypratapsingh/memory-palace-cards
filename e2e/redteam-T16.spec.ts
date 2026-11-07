import { writeFile } from 'node:fs/promises';
import { test, expect } from './fixtures.ts';
import { completeOnboarding, memorizeAll, playPerfectFirstDrill, readCard, readSave, typeCard } from './helpers.ts';

test('double-click Start First Drill opens one drill', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I know the method' }).click();
  await page.getByRole('button', { name: 'Start First Drill' }).dblclick();
  await expect(page.getByRole('button', { name: 'Start Memorizing' })).toHaveCount(1);
});

test('resize to phone width mid-drill keeps the drill usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I know the method' }).click();
  await page.getByRole('button', { name: 'Start First Drill' }).click();
  await page.getByRole('button', { name: 'Start Memorizing' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /Next|Done Memorizing/ })).toBeVisible();
  await memorizeAll(page, 3);
});

test('two tabs: onboarding in a stale tab does not erase a drill saved in another', async ({ page, context }) => {
  // Tab 2 loads a fresh save (onboarding) and keeps that state in memory.
  const stale = await context.newPage();
  await stale.goto('/');
  await expect(stale.getByRole('button', { name: 'Watch three cards' })).toBeVisible();
  // Tab 1 plays a drill and saves it.
  await playPerfectFirstDrill(page);
  expect((await readSave(page)).drills.length).toBe(1);
  // Tab 2 finishes its stale onboarding without reloading. It must not drop tab 1's drill.
  await stale.getByRole('button', { name: 'Watch three cards' }).click();
  const seen: string[] = [];
  for (let i = 1; i <= 3; i++) {
    seen.push(await readCard(stale, `Locus ${i} of 3:`));
    await stale.getByRole('button', { name: /^(Next|Test Recall)/ }).click();
  }
  for (let i = 1; i <= 3; i++) {
    await expect.poll(() => stale.locator('body').innerText()).toContain(`Recall Locus ${i} of 3`);
    await typeCard(stale, seen[i - 1]);
  }
  await stale.getByRole('button', { name: 'Continue' }).click();
  await stale.close();
  expect((await readSave(page)).drills.length).toBeGreaterThanOrEqual(1);
});

test('import of a 5 MB file is rejected without crashing', async ({ page }, testInfo) => {
  await completeOnboarding(page);
  const before = await readSave(page);
  const big = testInfo.outputPath('big.json');
  await writeFile(big, '{"drills":"' + 'a'.repeat(5_000_000) + '"}');
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByLabel('Import save file').setInputFiles(big);
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await readSave(page)).toEqual(before);
});

test('two Escape presses open then close the quit dialog, never stack it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I know the method' }).click();
  await page.getByRole('button', { name: 'Start First Drill' }).click();
  await page.getByRole('button', { name: 'Start Memorizing' }).click();
  await expect(page.locator('body')).toContainText('Locus 1 / 3');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Quit', exact: true })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Quit', exact: true })).toHaveCount(0);
  await expect(page.locator('body')).toContainText('Locus 1 / 3');
});

test('unknown keys and wrong input during recall do not break the drill', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I know the method' }).click();
  await page.getByRole('button', { name: 'Start First Drill' }).click();
  await page.getByRole('button', { name: 'Start Memorizing' }).click();
  const cards = await memorizeAll(page, 3);
  for (const key of ['X', '!', 'Z']) await page.keyboard.press(key);
  for (const card of cards) await typeCard(page, card);
  await expect(page.getByText(/Perfect Drill!|Drill Results/)).toBeVisible();
});
