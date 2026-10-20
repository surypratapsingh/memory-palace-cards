import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shrunkMissRates, weakLoci, PRIOR_K, WEAK_MARGIN, WEAK_MAX, WEAK_MIN_TRIES } from './living.ts';
import { ghostOpacity, ghosts, ghostWarning } from './living.ts';
import { leeches } from './living.ts';
import type { SaveData, DrillResult, CardId } from './types.ts';

test('PRIOR_K = 5', () => {
  assert.equal(PRIOR_K, 5);
});

test('WEAK_MARGIN = 0.15', () => {
  assert.equal(WEAK_MARGIN, 0.15);
});

test('WEAK_MAX = 5', () => {
  assert.equal(WEAK_MAX, 5);
});

test('WEAK_MIN_TRIES = 3', () => {
  assert.equal(WEAK_MIN_TRIES, 3);
});

test('shrunkMissRates with worked example from MATHS.md section 5', () => {
  // From MATHS.md: 10 loci each 10 tries, locus 0: 8 misses, loci 1-9: 2 misses each, locus 10: 2 misses in 2 tries
  // m = 28/102 = 0.27451, k·m = 1.37255
  const stats: SaveData['locusStats'] = {
    '0': { tries: 10, misses: 8 },
    '1': { tries: 10, misses: 2 },
    '2': { tries: 10, misses: 2 },
    '3': { tries: 10, misses: 2 },
    '4': { tries: 10, misses: 2 },
    '5': { tries: 10, misses: 2 },
    '6': { tries: 10, misses: 2 },
    '7': { tries: 10, misses: 2 },
    '8': { tries: 10, misses: 2 },
    '9': { tries: 10, misses: 2 },
    '10': { tries: 2, misses: 2 },
  };

  const result = shrunkMissRates(stats);

  // Locus 0: (8 + 1.37255) / 15 = 0.62484
  assert.ok(result.get(0)!.toFixed(5) === '0.62484', `locus 0: expected 0.62484, got ${result.get(0)}`);

  // Loci 1-9: (2 + 1.37255) / 15 = 0.22484
  for (let i = 1; i <= 9; i++) {
    const r = result.get(i);
    assert.ok(r!.toFixed(5) === '0.22484', `locus ${i}: expected 0.22484, got ${r}`);
  }

  // Locus 10: (2 + 1.37255) / 7 = 0.48179, but tries < 3 so not weak
  assert.ok(result.get(10)!.toFixed(5) === '0.48179', `locus 10: expected 0.48179, got ${result.get(10)}`);
});

test('shrunkMissRates with empty stats', () => {
  const result = shrunkMissRates({});
  assert.deepEqual(result, new Map<number, number>());
});

test('shrunkMissRates with zero tries', () => {
  const result = shrunkMissRates({ '0': { tries: 0, misses: 0 } });
  assert.deepEqual(result, new Map<number, number>());
});

test('weakLoci with no stats', () => {
  const result = weakLoci({});
  assert.deepEqual(result, []);
});

test('weakLoci with one locus below margin', () => {
  const stats = { '0': { tries: 10, misses: 1 } };
  const result = weakLoci(stats);
  assert.deepEqual(result, []);
});

test('weakLoci with one locus above margin', () => {
  const stats = { '0': { tries: 10, misses: 8 } }; // r = 0.62484, m = 0.27451, r - m = 0.35033 >= 0.15
  const result = weakLoci(stats);
  assert.ok(result.includes(0), 'locus 0 should be weak');
});

test('weakLoci returns at most 5', () => {
  // Create 10 loci all above margin
  const stats: SaveData['locusStats'] = {};
  for (let i = 0; i < 10; i++) {
    ;(stats as any)[String(i)] = { tries: 10, misses: 8 };
  }
  const result = weakLoci(stats);
  assert.ok(result.length <= 5, `Expected at most 5, got ${result.length}`);
});

test('weakLoci with more than 5 candidates returns 5', () => {
  const stats: SaveData['locusStats'] = {};
  for (let i = 0; i < 10; i++) {
    ;(stats as any)[String(i)] = { tries: 10, misses: 8 };
  }
  const result = weakLoci(stats);
  assert.equal(result.length, 5, 'Expected exactly 5 weak loci');
});

test('weakLoci ties broken by lower index', () => {
  // All loci have same r, so should sort by index ascending
  const stats: SaveData['locusStats'] = {};
  for (let i = 0; i < 5; i++) {
    ;(stats as any)[String(i)] = { tries: 10, misses: 8 };
  }
  const result = weakLoci(stats);
  // Should be 0, 1, 2, 3, 4 (already in order)
  assert.deepEqual(result, [0, 1, 2, 3, 4]);
});

test('weakLoci with string keys after JSON round trip', () => {
  const stats = JSON.parse(JSON.stringify({
    '0': { tries: 10, misses: 8 },
    '1': { tries: 10, misses: 2 },
  }));
  const result = weakLoci(stats);
  // After JSON round trip, keys are strings, shrunkMissRates should convert with Number()
  assert.ok(result.length > 0);
});

test('weakLoci with tries < 3 never weak', () => {
  const stats = { '0': { tries: 2, misses: 2 } };
  const result = weakLoci(stats);
  assert.deepEqual(result, []);
});

test('weakLoci m + 0.15 > 1 no weak loci', () => {
  // If global miss rate is very high, r_i - m can't exceed 0.15
  const stats = { '0': { tries: 10, misses: 9 } }; // m = 0.9, r = (9 + 0.45) / 15 = 0.63, r - m = -0.27
  const result = weakLoci(stats);
  assert.deepEqual(result, []);
});

test('ghostOpacity at h = 0', () => {
  const now = new Date();
  const result = ghostOpacity('2026-10-20T10:00:00Z', now);
  // At h = 0: opacity = 0.35
  assert.ok(Math.abs(result - 0.35) < 1e-9, `At h=0: expected 0.35, got ${result}`);
});

test('ghostOpacity at h = 2', () => {
  const now = new Date();
  // 2 hours ago
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const result = ghostOpacity(twoHoursAgo.toISOString(), now);
  // At h = 2: opacity = 0.35 * 2^(-2/2) = 0.35 * 0.5 = 0.175
  assert.ok(Math.abs(result - 0.175) < 1e-9, `At h=2: expected 0.175, got ${result}`);
});

test('ghostOpacity at h = 4', () => {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const result = ghostOpacity(fourHoursAgo.toISOString(), now);
  // At h = 4: opacity = 0.35 * 2^(-4/2) = 0.35 * 0.25 = 0.0875
  assert.ok(Math.abs(result - 0.0875) < 1e-9, `At h=4: expected 0.0875, got ${result}`);
});

test('ghostOpacity negative h (= 0)', () => {
  const now = new Date();
  // Future date - should treat as h = 0
  const result = ghostOpacity('2099-12-31T00:00:00Z', now);
  // h < 0, use h = 0, so opacity = 0.35
  assert.ok(Math.abs(result - 0.35) < 1e-9, `Negative h: expected 0.35, got ${result}`);
});

test('ghostOpacity invalid date', () => {
  const now = new Date();
  const result = ghostOpacity('not a date', now);
  assert.ok(result === 0, `Invalid date: expected 0, got ${result}`);
});

test('ghosts picks latest by at when array out of order', () => {
  const drills: DrillResult[] = [
    { at: '2026-10-18T10:00:00Z', seed: 's1', daily: false, answers: ['AS'], sequence: ['AS'], daily: false, memorizeMs: 100, recallMs: 50 },
    { at: '2026-10-20T10:00:00Z', seed: 's2', daily: false, answers: ['2S'], sequence: ['2S'], daily: false, memorizeMs: 100, recallMs: 50 },
    { at: '2026-10-19T10:00:00Z', seed: 's3', daily: false, answers: ['3S'], sequence: ['3S'], daily: false, memorizeMs: 100, recallMs: 50 },
  ];

  const result = ghosts(drills, new Date('2026-10-20T15:00:00Z'));
  // Latest is 2026-10-20T10:00:00Z (index 1)
  assert.equal(result[0].index, 1, 'Should pick the drill with latest at');
  assert.equal(result[0].card, '2S', 'Should be the card from the latest drill');
});

test('ghosts empty array', () => {
  const result = ghosts([], new Date());
  assert.deepEqual(result, []);
});

test('ghostWarning true at 2.4 h', () => {
  const now = new Date();
  const drills: DrillResult[] = [
    { at: new Date(now.getTime() - 2.4 * 60 * 60 * 1000).toISOString(), seed: 's1', daily: false, answers: ['AS'], sequence: ['AS'], daily: false, memorizeMs: 100, recallMs: 50 },
  ];

  const result = ghostWarning(drills, now);
  assert.ok(result, 'ghostWarning should be true at 2.4 h');
});

test('ghostWarning false at 2.5 h', () => {
  const now = new Date();
  const drills: DrillResult[] = [
    { at: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(), seed: 's1', daily: false, answers: ['AS'], sequence: ['AS'], daily: false, memorizeMs: 100, recallMs: 50 },
  ];

  const result = ghostWarning(drills, now);
  assert.ok(!result, 'ghostWarning should be false at 2.5 h');
});

test('leeches finds cards with lapses >= 4', () => {
  const srs: SaveData['srs'] = {
    'AS': { state: 'learning', stability: 30, due: new Date('2026-11-01').toISOString(), lapses: 5 },
    '2S': { state: 'solid', stability: 100, due: new Date('2026-11-01').toISOString(), lapses: 3 }, // < 4, should not include
    '3S': { state: 'solid', stability: 100, due: new Date('2026-11-01').toISOString(), lapses: 4 },
  };

  const result = leeches(srs);
  assert.ok(result.includes('AS'), 'AS with 5 lapses should be included');
  assert.ok(!result.includes('2S'), '2S with 3 lapses should not be included');
  assert.ok(result.includes('3S'), '3S with 4 lapses should be included');
});

test('leeches sorted by lapses descending then DECK order', () => {
  const srs: SaveData['srs'] = {
    'KS': { lapses: 6 }, // King of spades - higher rank, but lapses 6
    'AS': { lapses: 5 }, // Ace of spades - lapses 5
    'QS': { lapses: 5 }, // Queen of spades - lapses 5, same as AS
  };

  const result = leeches(srs);
  // Both AS and QS have lapses 5, KS has lapses 6
  // Sorted by lapses descending: KS first (6), then AS and QS (5)
  // Among AS and QS (same lapses), DECK order: AS comes before QS
  assert.equal(result[0], 'KS', 'KS should be first (lapses 6)');
  assert.equal(result[1], 'AS', 'AS should be second (lapses 5, DECK order first)');
  assert.equal(result[2], 'QS', 'QS should be third (lapses 5, DECK order second)');
});