import assert from 'node:assert/strict';
import test from 'node:test';
import { DECK, deal } from '../deck.ts';
import { applyResult, cardFromKeys, drillSeed } from '../drill-logic.ts';
import { emptySave } from '../store.ts';
import type { CardId, DrillResult } from '../types.ts';

test('red-team: every rank/suit pair is a distinct valid card, including ten aliases', () => {
  const cards = new Set<CardId>();
  for (const card of DECK) {
    const parsed = cardFromKeys(card[0], card[1]);
    assert.equal(parsed, card);
    cards.add(parsed!);
  }
  assert.equal(cards.size, 52);
  assert.equal(cardFromKeys('0', 's'), 'TS');
  assert.equal(cardFromKeys(' t ', ' c '), 'TC');
});

test('red-team: malformed runtime key values never coerce into cards', () => {
  for (const [rank, suit] of [
    ['10', 'S'], ['1', 'S'], ['TT', 'S'], ['A', 'SS'], ['A', ''], ['', 'H'],
    [null, 'S'], ['A', undefined], [1, 'S'], ['A', {}],
  ] as unknown[][]) {
    assert.equal(cardFromKeys(rank as string, suit as string), null);
  }
});

test('red-team: a full 52-card drill records each mismatch and skip exactly once', () => {
  const original = emptySave();
  const before = structuredClone(original);
  const sequence = deal(52, 'T4 full-deck adversarial test');
  const answers = sequence.map((card, i) => i % 3 === 0 ? card : i % 3 === 1 ? null : sequence[(i + 1) % 52]);
  const result: DrillResult = {
    at: '2026-10-21T12:00:00.000Z', seed: 'full-deck', daily: false,
    sequence, answers, memorizeMs: 1, recallMs: 2,
  };

  const next = applyResult(original, result);
  assert.deepEqual(original, before);
  assert.equal(next.drills.length, 1);
  assert.deepEqual(next.drills[0], result);
  assert.equal(Object.keys(next.locusStats).length, 52);
  sequence.forEach((card, i) => {
    const expectedMisses = answers[i] === card ? 0 : 1;
    assert.deepEqual(next.locusStats[i], { tries: 1, misses: expectedMisses });
  });
});

test('red-team: JSON string-key stats accumulate without changing untouched loci', () => {
  const original = emptySave();
  original.locusStats = {
    0: { tries: 20, misses: 4 },
    12: { tries: 7, misses: 3 },
  };
  const restored = JSON.parse(JSON.stringify(original));
  const before = structuredClone(restored);
  const result: DrillResult = {
    at: '2026-10-21T12:00:00.000Z', seed: 'json-keys', daily: true,
    sequence: ['AS', 'KH'] as CardId[], answers: [null, 'KH'], memorizeMs: 1, recallMs: 2,
  };

  const next = applyResult(restored, result);
  assert.deepEqual(restored, before);
  assert.deepEqual(next.locusStats[0], { tries: 21, misses: 5 });
  assert.deepEqual(next.locusStats[1], { tries: 1, misses: 0 });
  assert.deepEqual(next.locusStats[12], { tries: 7, misses: 3 });
});

test('red-team: a missing answer at a later locus is counted as a miss', () => {
  const result: DrillResult = {
    at: '2026-10-21T12:00:00.000Z', seed: 'short-answers', daily: false,
    sequence: ['AS', '2S', '3S'] as CardId[], answers: ['AS'], memorizeMs: 1, recallMs: 2,
  };
  const next = applyResult(emptySave(), result);
  assert.deepEqual(next.locusStats, {
    0: { tries: 1, misses: 0 },
    1: { tries: 1, misses: 1 },
    2: { tries: 1, misses: 1 },
  });
});

test('red-team: daily seed is stable for the same local date and practice seed includes a distinct ID', () => {
  const date = new Date(2026, 9, 21, 23, 59, 59);
  assert.equal(drillSeed(true, date), drillSeed(true, new Date(2026, 9, 21, 0, 0, 1)));
  assert.notEqual(drillSeed(false, date), drillSeed(false, date));
});
