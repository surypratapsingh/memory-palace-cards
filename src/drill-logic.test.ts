import assert from 'node:assert/strict';
import test from 'node:test';
import { applyResult, cardFromKeys, drillSeed } from './drill-logic.ts';
import { emptySave } from './store.ts';
import type { CardId, DrillResult } from './types.ts';

test('cardFromKeys: valid combinations', () => {
  assert.equal(cardFromKeys('a', 's'), 'AS');
  assert.equal(cardFromKeys('A', 'S'), 'AS');
  assert.equal(cardFromKeys('2', 'h'), '2H');
  assert.equal(cardFromKeys('9', 'd'), '9D');
  assert.equal(cardFromKeys('t', 'c'), 'TC');
  assert.equal(cardFromKeys('0', 's'), 'TS'); // '0' maps to 'T'
  assert.equal(cardFromKeys('0', 'H'), 'TH');
  assert.equal(cardFromKeys('j', 'd'), 'JD');
  assert.equal(cardFromKeys('q', 'c'), 'QC');
  assert.equal(cardFromKeys('k', 's'), 'KS');
});

test('cardFromKeys: invalid inputs return null', () => {
  assert.equal(cardFromKeys('1', 's'), null);
  assert.equal(cardFromKeys('10', 's'), null);
  assert.equal(cardFromKeys('x', 's'), null);
  assert.equal(cardFromKeys('', 's'), null);
  assert.equal(cardFromKeys('a', ''), null);
  assert.equal(cardFromKeys('a', 'x'), null);
  assert.equal(cardFromKeys('t', 'tt'), null);
  assert.equal(cardFromKeys('tt', 's'), null);
});

test('drillSeed: daily uses localDay, non-daily generates unique id', () => {
  const date = new Date(2026, 9, 21); // 2026-10-21
  const dailySeed = drillSeed(true, date);
  assert.equal(dailySeed, '2026-10-21');

  const seed1 = drillSeed(false, date);
  const seed2 = drillSeed(false, date);
  assert.ok(seed1.startsWith('p-'));
  assert.notEqual(seed1, seed2);
});

test('applyResult: updates drills and locusStats, never mutates data', () => {
  const initial = emptySave();
  const originalClone = structuredClone(initial);

  const result: DrillResult = {
    at: new Date().toISOString(),
    seed: 'test-seed',
    daily: false,
    sequence: ['AS', 'KH', 'QD'] as CardId[],
    answers: ['AS', 'KD', null], // 0 is correct, 1 is wrong card, 2 is skipped (null)
    memorizeMs: 5000,
    recallMs: 4000,
  };

  const next = applyResult(initial, result);

  // Original is unchanged
  assert.deepEqual(initial, originalClone);

  // New save has the result appended
  assert.equal(next.drills.length, 1);
  assert.deepEqual(next.drills[0], result);

  // Locus stats correctly recorded:
  // Locus 0: 1 try, 0 misses (correct)
  // Locus 1: 1 try, 1 miss (wrong card KD vs KH)
  // Locus 2: 1 try, 1 miss (null vs QD)
  assert.deepEqual(next.locusStats[0], { tries: 1, misses: 0 });
  assert.deepEqual(next.locusStats[1], { tries: 1, misses: 1 });
  assert.deepEqual(next.locusStats[2], { tries: 1, misses: 1 });
});

test('applyResult: survives JSON round-trip with string keys in locusStats', () => {
  const initial = emptySave();
  initial.locusStats = {
    0: { tries: 2, misses: 1 },
    1: { tries: 5, misses: 2 },
  };

  // Simulate JSON round trip where keys become strings
  const jsonParsed = JSON.parse(JSON.stringify(initial));

  const result: DrillResult = {
    at: new Date().toISOString(),
    seed: 'seed-2',
    daily: true,
    sequence: ['2C', '3D'] as CardId[],
    answers: ['2C', '4D'],
    memorizeMs: 3000,
    recallMs: 2500,
  };

  const next = applyResult(jsonParsed, result);

  assert.deepEqual(next.locusStats[0], { tries: 3, misses: 1 });
  assert.deepEqual(next.locusStats[1], { tries: 6, misses: 3 });
});

test('applyResult: handles answers shorter than sequence and all null answers', () => {
  const initial = emptySave();
  const result: DrillResult = {
    at: new Date().toISOString(),
    seed: 'short',
    daily: false,
    sequence: ['AS', '2S', '3S'] as CardId[],
    answers: ['AS'], // length 1 < sequence length 3
    memorizeMs: 1000,
    recallMs: 1000,
  };

  const next = applyResult(initial, result);
  assert.deepEqual(next.locusStats[0], { tries: 1, misses: 0 });
  assert.deepEqual(next.locusStats[1], { tries: 1, misses: 1 });
  assert.deepEqual(next.locusStats[2], { tries: 1, misses: 1 });
});
