import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { memorizeAll, typeCard } from './helpers.ts';

// three.js reports every WebGLRenderer it creates to window.__THREE_DEVTOOLS__ (a test-only hook that
// three.js checks for itself), so the test reads renderer.info without any DEV code in the app bundle.
async function observeRenderers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const renderers: unknown[] = [];
    const devtools = new EventTarget();
    devtools.addEventListener('observe', (event) => renderers.push((event as CustomEvent).detail));
    Object.assign(window, { __renderers: renderers, __THREE_DEVTOOLS__: devtools });
  });
}

async function rendererStats(page: Page): Promise<{ geometries: number; textures: number; calls: number }> {
  return page.evaluate(() => {
    // three.js reports other objects too; the renderer is the one with renderer.info.
    const renderers = (window as unknown as { __renderers: any[] }).__renderers;
    const renderer = renderers.filter((r) => r?.info?.memory).at(-1);
    if (!renderer) throw new Error('no WebGL renderer observed');
    return {
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      calls: renderer.info.render.calls,
    };
  });
}

/** One 3-card drill from the home screen: memorize, recall all three, back to home. Returns draw calls seen. */
async function playDrill(page: Page, start: string): Promise<number[]> {
  await page.getByRole('button', { name: start, exact: true }).first().click();
  // After a recent drill the game may warn about fresh ghosts first.
  const startButton = page.getByRole('button', { name: 'Start Memorizing' });
  const playAnyway = page.getByRole('button', { name: 'Play anyway' });
  await expect(startButton.or(playAnyway)).toBeVisible();
  if (await playAnyway.isVisible()) await playAnyway.click();
  await startButton.click();
  const cards = await memorizeAll(page, 3);
  const drawCalls = [(await rendererStats(page)).calls];
  for (const card of cards) await typeCard(page, card);
  await expect(page.getByText('Perfect Drill!')).toBeVisible();
  await page.getByRole('button', { name: /Back to Palace/ }).click();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
  return drawCalls;
}

test('leak: 10 drills in a row keep geometries and textures within baseline + 4', async ({ page }) => {
  test.setTimeout(300_000);
  await observeRenderers(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'I know the method' }).click();
  await expect.poll(() => page.evaluate(() =>
    ((window as any).__renderers ?? []).filter((r: any) => r?.info?.memory).length), { timeout: 30_000 })
    .toBeGreaterThan(0);

  // Drill 1 warms up shared resources, so the baseline is taken after it.
  await playDrill(page, 'Start First Drill');
  const baseline = await rendererStats(page);

  const allDrawCalls: number[] = [];
  for (let drill = 2; drill <= 10; drill++) {
    // Ladder level 0 (LADDER[0] = 3 cards); the Practice button would pick a level by recall history.
    allDrawCalls.push(...(await playDrill(page, 'Play')));
  }
  const after = await rendererStats(page);
  console.log(`perf: baseline ${JSON.stringify(baseline)} after10 ${JSON.stringify(after)} maxDrawCalls ${Math.max(...allDrawCalls)}`);

  expect(after.geometries, 'geometries after drill 10').toBeLessThanOrEqual(baseline.geometries + 4);
  expect(after.textures, 'textures after drill 10').toBeLessThanOrEqual(baseline.textures + 4);
  expect(Math.max(...allDrawCalls), 'draw calls per frame during drills').toBeLessThanOrEqual(300);
});
