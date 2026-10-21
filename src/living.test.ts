import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptySave } from './store.ts';
import type { CardId, DrillResult, SaveData, SrsState } from './types.ts';
import {
  GHOST_HALF_LIFE_H,
  GHOST_MIN,
  GHOST_START,
  GHOST_WARN,
  PRIOR_K,
  WEAK_MARGIN,
  WEAK_MAX,
  WEAK_MIN_TRIES,
  ghostOpacity,
  ghostWarning,
  ghosts,
  leeches,
  shrunkMissRates,
  weakLoci,
} from './living.ts';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const rateAt = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
const emptyStats = (): SaveData['locusStats'] => ({});
const drill = (at: string, sequence: CardId[]): DrillResult => ({
  at,
  seed: 'seed',
  daily: false,
  sequence,
  answers: sequence,
  memorizeMs: 1,
  recallMs: 1,
});
const stateWithLapses = (lapses: number): SrsState => ({
  ...emptySave().srs.AS!,
  lapses,
});

test('living constants match the spec', () => {
  assert.equal(PRIOR_K, 5);
  assert.equal(WEAK_MARGIN, 0.15);
  assert.equal(WEAK_MIN_TRIES, 3);
  assert.equal(WEAK_MAX, 5);
  assert.equal(GHOST_START, 0.35);
  assert.equal(GHOST_HALF_LIFE_H, 2);
  assert.equal(GHOST_MIN, 0.05);
  assert.equal(GHOST_WARN, 0.15);
});

test('shrunkMissRates matches both worked examples to 1e-9', () => {
  const worked: SaveData['locusStats'] = {
    0: { tries: 10, misses: 8 },
    1: { tries: 10, misses: 2 },
    2: { tries: 10, misses: 2 },
    3: { tries: 10, misses: 2 },
    4: { tries: 10, misses: 2 },
    5: { tries: 10, misses: 2 },
    6: { tries: 10, misses: 2 },
    7: { tries: 10, misses: 2 },
    8: { tries: 10, misses: 2 },
    9: { tries: 10, misses: 2 },
    10: { tries: 2, misses: 2 },
  };
  const rates = shrunkMissRates(worked);
  const globalRate = 28 / 102;
  assert.ok(Math.abs(rates.get(0)! - (8 + PRIOR_K * globalRate) / 15) < 1e-9);
  for (let index = 1; index <= 9; index++) {
    assert.ok(Math.abs(rates.get(index)! - (2 + PRIOR_K * globalRate) / 15) < 1e-9);
  }
  assert.ok(Math.abs(rates.get(10)! - (2 + PRIOR_K * globalRate) / 7) < 1e-9);
  assert.deepEqual(weakLoci(worked), [0]);

  const equal: SaveData['locusStats'] = {};
  for (let index = 0; index < 10; index++) equal[index] = { tries: 10, misses: 5 };
  const equalRates = shrunkMissRates(equal);
  assert.equal(equalRates.size, 10);
  for (const rate of equalRates.values()) assert.ok(Math.abs(rate - 0.5) < 1e-9);
  assert.deepEqual(weakLoci(equal), []);
});

test('shrunkMissRates returns numeric locus keys and an empty map when no tries exist', () => {
  const stats = JSON.parse(JSON.stringify({ '17': { tries: 5, misses: 4 } })) as SaveData['locusStats'];
  assert.deepEqual([...shrunkMissRates(stats).keys()], [17]);
  assert.deepEqual(shrunkMissRates(emptyStats()), new Map());
  assert.deepEqual(shrunkMissRates({ 0: { tries: 0, misses: 0 } }), new Map());
});

test('weakLoci enforces sample and relative-margin thresholds', () => {
  assert.deepEqual(weakLoci(emptyStats()), []);
  assert.deepEqual(weakLoci({ 0: { tries: 2, misses: 2 } }), []);
  assert.deepEqual(weakLoci({ 0: { tries: 10, misses: 1 } }), []);
  assert.deepEqual(weakLoci({
    0: { tries: 10, misses: 8 },
    1: { tries: 10, misses: 2 },
    2: { tries: 10, misses: 2 },
    3: { tries: 10, misses: 2 },
    4: { tries: 10, misses: 2 },
    5: { tries: 10, misses: 2 },
    6: { tries: 10, misses: 2 },
    7: { tries: 10, misses: 2 },
    8: { tries: 10, misses: 2 },
    9: { tries: 10, misses: 2 },
    10: { tries: 2, misses: 2 },
  }), [0]);
  assert.deepEqual(weakLoci({ 0: { tries: 10, misses: 8 } }), []);
  assert.equal(WEAK_MIN_TRIES, 3);
  assert.equal(WEAK_MARGIN, 0.15);
});

test('weakLoci returns five highest rates and resolves ties by ascending index', () => {
  const stats: SaveData['locusStats'] = {};
  for (let index = 0; index < 10; index++) {
    stats[index] = { tries: 10, misses: index === 0 ? 8 : 2 };
  }
  assert.deepEqual(weakLoci(stats), [0]);

  const tie: SaveData['locusStats'] = {
    0: { tries: 10, misses: 8 },
    1: { tries: 10, misses: 8 },
    2: { tries: 10, misses: 0 },
  };
  assert.deepEqual(weakLoci(tie), [0, 1]);
  const tiedRates = shrunkMissRates(tie);
  assert.equal(tiedRates.get(0), tiedRates.get(1));
});

test('weakLoci treats the 0.15 margin as inclusive', () => {
  const stats: SaveData['locusStats'] = {
    0: { tries: 5, misses: 4 },
    1: { tries: 5, misses: 1 },
  };
  const rates = shrunkMissRates(stats);
  const globalRate = 0.5;
  assert.ok(Math.abs((rates.get(0)! - globalRate) - WEAK_MARGIN) < 1e-12);
  assert.deepEqual(weakLoci(stats), [0]);
});

test('weakLoci caps output at five among multiple eligible loci', () => {
  const stats: SaveData['locusStats'] = {
    0: { tries: 100, misses: 90 },
    1: { tries: 100, misses: 90 },
    2: { tries: 100, misses: 90 },
    3: { tries: 100, misses: 90 },
    4: { tries: 100, misses: 90 },
    5: { tries: 100, misses: 90 },
    6: { tries: 100, misses: 10 },
    7: { tries: 100, misses: 10 },
    8: { tries: 100, misses: 10 },
    9: { tries: 100, misses: 10 },
    10: { tries: 100, misses: 10 },
    11: { tries: 100, misses: 10 },
  };
  const result = weakLoci(stats);
  assert.equal(result.length, WEAK_MAX);
  assert.deepEqual(result, [0, 1, 2, 3, 4]);
});

test('weakLoci ignores malformed entries without letting them poison valid loci', () => {
  const stats = {
    0: { tries: 10, misses: 8 },
    1: { tries: 10, misses: 2 },
    '-1': { tries: 1000, misses: 1000 },
    2: { tries: -3, misses: 0 },
    3: { tries: 10, misses: 11 },
    4: { tries: Number.NaN, misses: 0 },
    5: { tries: 10, misses: Number.NaN },
    bad: { tries: 100, misses: 100 },
    '01': { tries: 100, misses: 100 },
  } as unknown as SaveData['locusStats'];
  assert.deepEqual(weakLoci(stats), [0]);
});

test('ghostOpacity matches h=0, 2, and 4 exactly', () => {
  assert.equal(ghostOpacity(rateAt(0), NOW), 0.35);
  assert.equal(ghostOpacity(rateAt(2), NOW), 0.175);
  assert.equal(ghostOpacity(rateAt(4), NOW), 0.0875);
});

test('ghostOpacity applies warning and hide cutoffs around 2.445h and 5.615h', () => {
  assert.ok(ghostOpacity(rateAt(2.44), NOW) >= GHOST_WARN);
  assert.ok(ghostOpacity(rateAt(2.45), NOW) < GHOST_WARN);
  assert.ok(ghostOpacity(rateAt(5.61), NOW) >= GHOST_MIN);
  assert.equal(ghostOpacity(rateAt(5.62), NOW), 0);
});

test('ghostOpacity clamps future drill dates and rejects invalid timestamps', () => {
  assert.equal(ghostOpacity('2026-10-21T12:00:00.000Z', NOW), GHOST_START);
  assert.equal(ghostOpacity('', NOW), 0);
  assert.equal(ghostOpacity('not a date', NOW), 0);
  assert.equal(ghostOpacity(rateAt(0), new Date(Number.NaN)), 0);
});

test('ghosts chooses the largest valid at timestamp, even when drills are unordered', () => {
  const drills = [
    drill('2026-10-18T10:00:00Z', ['AS']),
    drill('2026-10-20T11:00:00Z', ['2S', '3S']),
    drill('2026-10-19T10:00:00Z', ['4S']),
    drill('invalid', ['5S']),
  ];
  assert.deepEqual(ghosts(drills, NOW), [
    { index: 0, card: '2S', opacity: GHOST_START * 2 ** (-1 / GHOST_HALF_LIFE_H) },
    { index: 1, card: '3S', opacity: GHOST_START * 2 ** (-1 / GHOST_HALF_LIFE_H) },
  ]);
  assert.deepEqual(ghosts([], NOW), []);
  assert.deepEqual(ghosts([drill(rateAt(6), ['AS'])], NOW), []);
});

test('ghostWarning follows opacity threshold of the latest drill', () => {
  assert.equal(ghostWarning([drill(rateAt(2.4), ['AS'])], NOW), true);
  assert.equal(ghostWarning([drill(rateAt(2.5), ['AS'])], NOW), false);
  assert.equal(ghostWarning([drill('invalid', ['AS'])], NOW), false);
  assert.equal(ghostWarning([], NOW), false);
});

test('leeches applies the four-lapse boundary, ignores invalid keys and sorts by lapses then deck order', () => {
  const srs: SaveData['srs'] = {
    QS: stateWithLapses(5),
    AS: stateWithLapses(5),
    KS: stateWithLapses(7),
    '2S': stateWithLapses(3),
    AD: stateWithLapses(4),
  };
  (srs as Record<string, SrsState>).JOKER = stateWithLapses(99);
  assert.deepEqual(leeches(srs), ['KS', 'AS', 'QS', 'AD']);
});

test('leeches ignores non-finite and non-numeric lapses', () => {
  const srs = {
    AS: { lapses: Number.NaN },
    '2S': { lapses: Number.POSITIVE_INFINITY },
    '3S': { lapses: '4' },
    '4S': { lapses: 4 },
  } as unknown as SaveData['srs'];
  assert.deepEqual(leeches(srs), ['4S']);
});
