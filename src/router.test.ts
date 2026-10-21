import assert from 'node:assert/strict';
import test from 'node:test';
import { next, type Event, type Screen } from './router.ts';

const transitionTable: Record<Screen, Partial<Record<Event, Screen>>> = {
  home: { train: 'train', drill: 'drill', settings: 'settings' },
  train: { back: 'home' },
  drill: { result: 'home', cancel: 'home' },
  settings: { back: 'home' },
};

test('router permits only the specified screen transitions', () => {
  for (const screen of Object.keys(transitionTable) as Screen[]) {
    for (const [event, expected] of Object.entries(transitionTable[screen]) as [Event, Screen][]) {
      assert.equal(next(screen, event), expected, `${screen} + ${event}`);
    }
  }
});

test('every unlisted event preserves the current screen', () => {
  const screens: readonly Screen[] = ['home', 'train', 'drill', 'settings'];
  const events: readonly (Event | string)[] = ['unknown', 'back', 'result', 'cancel', 'train', 'drill', 'settings'];
  for (const screen of screens) {
    for (const event of events) {
      if (!(event in transitionTable[screen])) assert.equal(next(screen, event), screen, `${screen} + ${event}`);
    }
  }
});
