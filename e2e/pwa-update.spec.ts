import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from './fixtures.ts';

// A new build is a different sw.js. The browser's own update check does not go through Playwright routes,
// so this test puts a second worker script (same bytes plus a comment) into dist/ and registers it.
// The worker installs and waits: the page must show the line, and Reload must swap it once.
test('update flow: new version waits behind the line, Reload swaps it once, no self reload', async ({ page }) => {
  const nextFile = resolve('dist', 'sw-next.js');
  writeFileSync(nextFile, readFileSync(resolve('dist', 'sw.js'), 'utf8') + '\n// next build (test)\n');
  try {
    let mainNavigations = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) mainNavigations++;
    });

    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await expect(page.getByText('New version ready')).toHaveCount(0);

    await page.evaluate(() => navigator.serviceWorker.register('./sw-next.js', { scope: './' }));

    const line = page.locator('.pwa-update');
    await expect(line).toBeVisible();
    await expect(line).toContainText('New version ready');
    // Waiting, not active: the page has not reloaded under the player.
    expect(mainNavigations).toBe(1);

    const navigationsBeforeReload = mainNavigations;
    await page.getByRole('button', { name: 'Reload' }).click();
    await expect.poll(() => mainNavigations).toBe(navigationsBeforeReload + 1);
    await expect(page.getByRole('button', { name: 'I know the method' })).toBeVisible();

    // Exactly one reload from the Reload click, not a loop. The line may return after the reload,
    // because this test registers a second script URL and the page registers sw.js again.
    await page.waitForTimeout(1000);
    expect(mainNavigations - navigationsBeforeReload).toBe(1);
  } finally {
    unlinkSync(nextFile);
  }
});
