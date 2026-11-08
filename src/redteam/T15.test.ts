import { test } from 'node:test';
import assert from 'node:assert/strict';
import { play, ambience, stopAll } from '../sound.ts';

// Each test stubs AudioContext and counts constructions. Sound off must never build one.
function countContexts(run: () => void): number {
  const original = globalThis.AudioContext;
  let made = 0;
  class Counting {
    constructor() { made++; throw new Error('AudioContext must not be built'); }
  }
  (globalThis as any).AudioContext = Counting;
  try {
    run();
  } finally {
    (globalThis as any).AudioContext = original;
  }
  return made;
}

test('T15 1: sound off never constructs AudioContext for any sfx or ambience', () => {
  const made = countContexts(() => {
    for (const sfx of ['flip', 'whoosh', 'correct', 'wrong'] as const) play(sfx, false);
    ambience('Library', false);
    ambience(null, false);
    stopAll();
  });
  assert.equal(made, 0);
});

test('T15 2: stopAll called twice with no audio started does not throw', () => {
  assert.doesNotThrow(() => {
    stopAll();
    stopAll();
  });
});

test('T15 3: ambience(null, true) stops and never throws or builds a context', () => {
  const made = countContexts(() => {
    assert.doesNotThrow(() => ambience(null, true));
  });
  assert.equal(made, 0);
});

test('T15 4: repeated ambience for the same room with sound off is a no-op', () => {
  const made = countContexts(() => {
    for (let i = 0; i < 5; i++) ambience('Kitchen', false);
  });
  assert.equal(made, 0);
});

test('T15 5: sound on without any AudioContext in the environment does not throw', () => {
  const original = globalThis.AudioContext;
  (globalThis as any).AudioContext = undefined;
  try {
    assert.doesNotThrow(() => {
      play('correct', true);
      play('wrong', true);
      ambience('Library', true);
      ambience('Library', true);
      stopAll();
      stopAll();
    });
  } finally {
    (globalThis as any).AudioContext = original;
  }
});

test('T15 6: after stopAll, sound off stays silent (no context created by a later off call)', () => {
  stopAll();
  const made = countContexts(() => {
    play('flip', false);
    ambience('Observatory', false);
  });
  assert.equal(made, 0);
});
