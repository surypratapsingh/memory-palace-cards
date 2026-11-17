import { test, expect } from './fixtures.ts';
import { playPerfectFirstDrill } from './helpers.ts';

test('installed player plays offline: the app shell and a 3-card drill work', async ({ page, context }) => {
  // The first load is not controlled by the worker. Reload once under control so every asset is cached.
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.reload();
  await expect(page.getByRole('button', { name: 'I know the method' })).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'I know the method' })).toBeVisible();

  const cards = await playPerfectFirstDrill(page);
  expect(new Set(cards).size).toBe(3);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('memory-palace/v1') ?? 'null')))?.drills.length).toBe(1);
});
