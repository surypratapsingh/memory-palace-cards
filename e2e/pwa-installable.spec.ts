import { test, expect } from './fixtures.ts';

// The same checks DevTools' Application > Manifest panel runs, read over CDP.
test('installable: manifest parses with no errors, has 192 and 512 PNG icons, and the page is installable', async ({ page, context }) => {
  await page.goto('/');
  const cdp = await context.newCDPSession(page);

  const manifest = await cdp.send('Page.getAppManifest');
  expect(manifest.errors, 'manifest parse errors').toEqual([]);
  const parsed = JSON.parse(manifest.data ?? 'null') as { name?: string; display?: string; icons?: { src: string; sizes: string; type: string }[] } | null;
  expect(parsed?.name).toBe('Memory Palace');
  expect(parsed?.display).toBe('standalone');
  const pngSizes = (parsed?.icons ?? []).filter((i) => i.type === 'image/png').map((i) => i.sizes);
  expect(pngSizes).toEqual(expect.arrayContaining(['192x192', '512x512']));

  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors, 'installability errors').toEqual([]);
});
