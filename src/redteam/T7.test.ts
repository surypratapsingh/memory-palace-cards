import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { next, type Event, type Screen } from '../router.ts';

const ALL_SCREENS: readonly Screen[] = ['home', 'train', 'drill', 'settings'];

const VALID_TRANSITIONS: Record<Screen, Partial<Record<Event, Screen>>> = {
  home: { train: 'train', drill: 'drill', settings: 'settings' },
  train: { back: 'home' },
  drill: { result: 'home', cancel: 'home' },
  settings: { back: 'home' },
};

test('redteam T7 1: pure router transitions for every valid screen x event pair', () => {
  for (const screen of ALL_SCREENS) {
    for (const [evt, target] of Object.entries(VALID_TRANSITIONS[screen]) as [Event, Screen][]) {
      assert.equal(next(screen, evt), target, `Expected ${screen} + ${evt} -> ${target}`);
    }
  }
});

test('redteam T7 2: unknown events and unallowed transitions always preserve current screen', () => {
  const arbitraryEvents = [
    '',
    '   ',
    'UNKNOWN',
    '__proto__',
    'constructor',
    'toString',
    'valueOf',
    '123',
    'null',
    'undefined',
    'drill:done',
    'settings:save',
    'ESCAPE',
    'ENTER',
  ];

  for (const screen of ALL_SCREENS) {
    for (const evt of arbitraryEvents) {
      const res = next(screen, evt as any);
      assert.equal(res, screen, `Expected ${screen} + ${evt} -> ${screen}`);
    }

    // Also test valid events that are not allowed on this screen
    for (const otherEvt of ['train', 'drill', 'settings', 'back', 'result', 'cancel'] as Event[]) {
      if (!(otherEvt in VALID_TRANSITIONS[screen])) {
        assert.equal(next(screen, otherEvt), screen, `Expected disallowed ${screen} + ${otherEvt} -> ${screen}`);
      }
    }
  }
});

test('redteam T7 3: unknown screen inputs return the input safely without throwing', () => {
  const badScreens = ['', 'unknown', 'lobby', 'menu', 'pause', '123'];
  for (const s of badScreens) {
    for (const evt of ['train', 'drill', 'back', 'result', ''] as Event[]) {
      assert.equal(next(s as Screen, evt), s);
    }
  }
});

test('redteam T7 4: source audit for main.ts: DOM XSS, save error banner, settings sanitization', async () => {
  const mainSrc = await readFile(new URL('../main.ts', import.meta.url), 'utf8');

  // Verify no user/dynamic text into innerHTML in main.ts
  assert.equal(mainSrc.includes('.innerHTML ='), false, 'main.ts should not assign to innerHTML');

  // Verify save error handler registration
  assert.match(mainSrc, /setSaveErrorHandler\(/, 'main.ts must register setSaveErrorHandler');

  // Verify settings sanitization on load and on save replacement
  assert.match(mainSrc, /data\.settings\s*=\s*sanitizeSettings\(data\.settings\)/);
  assert.match(mainSrc, /applySettings\(/);
  assert.match(mainSrc, /view\.setGlideMs\(/);

  // Verify streak tracking on completed drill result
  assert.match(mainSrc, /updateStreak\(data\.streak,\s*localDay\(\)\)/);

  // Verify unmount of current screen before mounting new screen
  assert.match(mainSrc, /unmountCurrent\?\.\(\)/);
});

test('redteam T7 5: reduced-motion preference check applies only to fresh profile without progress', async () => {
  const mainSrc = await readFile(new URL('../main.ts', import.meta.url), 'utf8');
  assert.match(mainSrc, /prefers-reduced-motion:\s*reduce/);
  assert.match(mainSrc, /!hasProgress/);
});

test('redteam T7 6: motion kit integration: feedback, countUp, swap imported and wired', async () => {
  const mainSrc = await readFile(new URL('../main.ts', import.meta.url), 'utf8');
  assert.match(mainSrc, /import.*feedback.*from.*motion\.ts/);
  assert.match(mainSrc, /import.*countUp.*from.*motion\.ts/);
  assert.match(mainSrc, /import.*swap.*from.*motion\.ts/);
  assert.match(mainSrc, /feedback\(row,\s*row\.classList\.contains\('correct'\)\s*\?\s*'correct'\s*:\s*'wrong'\)/);
  assert.match(mainSrc, /countUp\(value,\s*correct/);
});
