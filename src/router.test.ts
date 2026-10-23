import assert from 'node:assert/strict';
import test from 'node:test';
import { initialScreen, isFresh, next, type Event, type Screen } from './router.ts';

const transitionTable: Record<Screen, Partial<Record<Event, Screen>>> = {
  home: { train: 'train', drill: 'drill', settings: 'settings', shadowWalk: 'shadowWalk', onboarding: 'onboarding' },
  train: { back: 'home' },
  drill: { result: 'home', cancel: 'home', shadowWalk: 'shadowWalk' },
  settings: { back: 'home' },
  shadowWalk: { back: 'home' },
  onboarding: { skip: 'home', cancel: 'home', back: 'home', result: 'home' },
};

test('router permits only the specified screen transitions', () => {
  for (const screen of Object.keys(transitionTable) as Screen[]) {
    for (const [event, expected] of Object.entries(transitionTable[screen]) as [Event, Screen][]) {
      assert.equal(next(screen, event), expected, `${screen} + ${event}`);
    }
  }
});

test('every unlisted event preserves the current screen', () => {
  const screens: readonly Screen[] = ['home', 'train', 'drill', 'settings', 'shadowWalk', 'onboarding'];
  const events: readonly (Event | string)[] = ['unknown', 'back', 'result', 'cancel', 'train', 'drill', 'settings', 'shadowWalk', 'onboarding', 'skip'];
  for (const screen of screens) {
    for (const event of events) {
      if (!(event in transitionTable[screen])) assert.equal(next(screen, event), screen, `${screen} + ${event}`);
    }
  }
});

test('initialScreen routes fresh players to onboarding and existing players to home', () => {
  assert.equal(isFresh(null), true);
  assert.equal(isFresh(undefined), true);
  assert.equal(isFresh({ drills: [], srs: {} }), true);
  assert.equal(initialScreen({ drills: [], srs: {} }), 'onboarding');
  assert.equal(initialScreen(null), 'onboarding');
  assert.equal(initialScreen(undefined), 'onboarding');

  // Existing players with drills
  assert.equal(isFresh({ drills: [{}] as any, srs: {} }), false);
  assert.equal(initialScreen({ drills: [{}] as any, srs: {} }), 'home');

  // Existing players with SRS reviews but no drills
  assert.equal(isFresh({ drills: [], srs: { AS: {} as any } }), false);
  assert.equal(initialScreen({ drills: [], srs: { AS: {} as any } }), 'home');

  // Imported save with corrupt or non-array fields
  assert.equal(initialScreen({ drills: undefined, srs: undefined }), 'onboarding');
});

test('adversarial router inputs preserve state without throwing', () => {
  for (const screen of ['', 'unknown', '__proto__', 'constructor', 'toString']) {
    for (const event of ['onboarding', 'skip', 'back', 'result']) {
      assert.equal(next(screen as Screen, event), screen);
    }
  }
  for (const screen of ['home', 'onboarding'] as Screen[]) {
    for (const event of [null, undefined, {}, Symbol('skip')]) {
      assert.doesNotThrow(() => assert.equal(next(screen, event as unknown as string), screen));
    }
  }
});
