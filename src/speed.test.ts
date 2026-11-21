import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DECK } from './deck.ts';
import { compareSpeed, SPEED_MEMORIZE_LIMIT_MS, SPEED_RECALL_LIMIT_MS, speedBest, speedScore } from './speed.ts';
import type { CardId, DrillResult } from './types.ts';

function speedDrill(patch: Partial<DrillResult> = {}): DrillResult {
  const sequence = [...DECK];
  return {
    at: '2026-10-23T10:00:00Z', seed: 'speed', daily: false,
    sequence, answers: [...sequence], memorizeMs: 10000, recallMs: 1000, mode: 'speed', ...patch,
  };
}

test('limits follow IAM 5-minute memorization and 5-minute recall periods', () => {
  assert.equal(SPEED_MEMORIZE_LIMIT_MS, 300000);
  assert.equal(SPEED_RECALL_LIMIT_MS, 300000);
});

test('a complete exact deck records its elapsed memorize time', () => {
  assert.deepEqual(speedScore(speedDrill({ memorizeMs: 12345 })), { perfect: true, cards: 52, seconds: 12.345 });
});

test('one wrong card records the longest correct prefix from either end', () => {
  const answers = [...DECK];
  answers[4] = answers[5];
  assert.deepEqual(speedScore(speedDrill({ answers })), { perfect: false, cards: 47, seconds: 10 });
});

test('wrong first answer can score a 51-card bottom-up prefix; fully reversed scores zero', () => {
  const wrongFirst = [...DECK];
  wrongFirst[0] = wrongFirst[1];
  assert.deepEqual(speedScore(speedDrill({ answers: wrongFirst })), { perfect: false, cards: 51, seconds: 10 });
  const reversed = [...DECK].reverse();
  assert.equal(speedScore(speedDrill({ sequence: [...DECK], answers: reversed })).cards, 0);
});

test('a deck recalled from the opposite end receives the correct longest-end prefix', () => {
  const answers = [...DECK];
  answers[0] = answers[1];
  assert.equal(speedScore(speedDrill({ answers })).cards, 51);
});

test('perfect decks rank before any partial deck; fastest perfect ranks first', () => {
  const slow = speedDrill({ memorizeMs: 20000 });
  const fast = speedDrill({ memorizeMs: 10000 });
  const partial = [...DECK];
  partial[0] = partial[1];
  const partialDrill = speedDrill({ answers: partial, memorizeMs: 1 });
  assert.ok(compareSpeed(speedScore(fast), speedScore(slow)) < 0);
  assert.ok(compareSpeed(speedScore(slow), speedScore(partialDrill)) < 0);
});

test('among partial results, the longer correct prefix wins regardless of time', () => {
  const four = [...DECK];
  four[4] = four[5];
  const nine = [...DECK];
  nine[9] = nine[10];
  assert.ok(compareSpeed(speedScore(speedDrill({ answers: four, memorizeMs: 100000 })),
    speedScore(speedDrill({ answers: nine, memorizeMs: 1 }))) < 0);
});

test('both ends incorrect return zero because neither comparison starts with a correct card', () => {
  const answers = [...DECK];
  answers[0] = answers[1];
  answers[51] = answers[50];
  assert.deepEqual(speedScore(speedDrill({ answers })), { perfect: false, cards: 0, seconds: 10 });
});

test('speedBest selects the top score and returns null with no valid Speed Cards result', () => {
  const partialAnswers = [...DECK];
  partialAnswers[0] = partialAnswers[1];
  const partial = speedDrill({ answers: partialAnswers });
  const slow = speedDrill({ memorizeMs: 20000 });
  const fast = speedDrill({ memorizeMs: 10000 });
  assert.equal(speedBest([partial, slow, fast]), fast);
  assert.equal(speedBest([]), null);
  assert.equal(speedBest([speedDrill({ mode: undefined })]), null);
});

test('speedScore rejects non-speed drills, non-52 decks, duplicates, and unknown card IDs', () => {
  const normal = speedDrill({ mode: undefined });
  const short = speedDrill({ sequence: DECK.slice(0, 3) as CardId[], answers: DECK.slice(0, 3) as CardId[] });
  const duplicate = [...DECK];
  duplicate[51] = duplicate[0];
  const unknown = [...DECK] as string[];
  unknown[0] = 'JOKER';
  assert.deepEqual(speedScore(normal), { perfect: false, cards: 0, seconds: 0 });
  assert.equal(speedScore(short).cards, 0);
  assert.equal(speedScore(speedDrill({ sequence: duplicate as CardId[] })).cards, 0);
  assert.equal(speedScore(speedDrill({ sequence: unknown as CardId[] })).cards, 0);
});

test('speedScore rejects times beyond either event limit and invalid finite values', () => {
  assert.equal(speedScore(speedDrill({ memorizeMs: SPEED_MEMORIZE_LIMIT_MS + 1 })).cards, 0);
  assert.equal(speedScore(speedDrill({ recallMs: SPEED_RECALL_LIMIT_MS + 1 })).cards, 0);
  assert.equal(speedScore(speedDrill({ memorizeMs: Number.NaN })).cards, 0);
  assert.equal(speedScore(speedDrill({ recallMs: Number.POSITIVE_INFINITY })).cards, 0);
  assert.equal(speedScore(speedDrill({ memorizeMs: -1 })).cards, 0);
});

test('full-deck perfect time may be zero, while partial zero-time result remains partial', () => {
  assert.deepEqual(speedScore(speedDrill({ memorizeMs: 0 })), { perfect: true, cards: 52, seconds: 0 });
  const answers = [...DECK];
  answers[0] = answers[1];
  assert.deepEqual(speedScore(speedDrill({ answers, memorizeMs: 0 })), { perfect: false, cards: 51, seconds: 0 });
});

test('speedBest ignores malformed runtime entries and is stable for exact ties', () => {
  const first = speedDrill({ memorizeMs: 10000 });
  const tied = speedDrill({ memorizeMs: 10000, seed: 'other' });
  assert.equal(speedBest([null as unknown as DrillResult, {} as DrillResult, first, tied]), first);
});
