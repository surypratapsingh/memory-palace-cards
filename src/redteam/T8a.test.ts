import test from 'node:test';
import assert from 'node:assert/strict';
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
} from '../living.ts';
import { DECK } from '../deck.ts';
import type { CardId, DrillResult, SaveData, SrsState } from '../types.ts';

test('redteam: weakLoci ignores corrupt entries (misses > tries, negatives, NaN, non-integers) without poisoning valid loci', () => {
  const corruptStats = {
    // Valid loci
    0: { tries: 10, misses: 8 },
    1: { tries: 10, misses: 2 },
    // Corrupt locus: misses > tries (hand-edited / corrupted save)
    2: { tries: 5, misses: 9 },
    // Negative numbers
    3: { tries: -10, misses: 0 },
    4: { tries: 10, misses: -5 },
    // Non-finite numbers
    5: { tries: Number.NaN, misses: 5 },
    6: { tries: 10, misses: Number.POSITIVE_INFINITY },
    7: { tries: Number.NEGATIVE_INFINITY, misses: 0 },
    // Non-safe integers / floats
    8: { tries: 10.5, misses: 5.2 },
    // Keys that are not non-negative safe integer representations
    badKey: { tries: 10, misses: 10 },
    '-2': { tries: 10, misses: 10 },
    '01': { tries: 10, misses: 10 },
    '3.14': { tries: 10, misses: 10 },
  } as unknown as SaveData['locusStats'];

  // Global calculation should only include locus 0 and 1:
  // tries = 20, misses = 10 -> m = 0.5.
  // Locus 0: (8 + 5*0.5) / 15 = 10.5 / 15 = 0.7. r_0 - m = 0.2 >= 0.15. Weak!
  // Locus 1: (2 + 5*0.5) / 15 = 4.5 / 15 = 0.3. Not weak.
  const result = weakLoci(corruptStats);
  assert.deepEqual(result, [0]);
});

test('redteam: weakLoci exact boundary condition for WEAK_MIN_TRIES (tries === 3)', () => {
  // Locus 0 has exactly 3 tries and 3 misses.
  // Loci 1..10 have 10 tries and 0 misses each (100 tries, 0 misses).
  // Total tries = 103, total misses = 3.
  // m = 3 / 103 = 0.029126
  // Locus 0: r_0 = (3 + 5 * (3/103)) / (3 + 5) = (3 + 0.14563) / 8 = 0.3932
  // r_0 - m = 0.3932 - 0.0291 = 0.3641 >= 0.15.
  // Since tries_0 = 3 === WEAK_MIN_TRIES, locus 0 MUST be identified as weak.
  const stats: SaveData['locusStats'] = {
    0: { tries: 3, misses: 3 },
  };
  for (let i = 1; i <= 10; i++) {
    stats[i] = { tries: 10, misses: 0 };
  }

  const rates = shrunkMissRates(stats);
  const weak = weakLoci(stats);

  assert.ok(rates.has(0));
  assert.equal(weak.length, 1);
  assert.equal(weak[0], 0);

  // If tries = 2 with 2 misses, it must NOT be weak (tries < WEAK_MIN_TRIES)
  const statsTwoTries: SaveData['locusStats'] = {
    0: { tries: 2, misses: 2 },
  };
  for (let i = 1; i <= 10; i++) {
    statsTwoTries[i] = { tries: 10, misses: 0 };
  }
  assert.deepEqual(weakLoci(statsTwoTries), []);
});

test('redteam: weakLoci 10,000 loci stress test caps output at WEAK_MAX and sorts by numeric index tie-breaker', () => {
  const stats: SaveData['locusStats'] = {};
  const totalLoci = 10000;

  // Loci 0 to 9: 10 loci with identical 100 tries and 90 misses.
  // Loci 10 to 9999: 10 tries and 1 miss.
  for (let i = 0; i < totalLoci; i++) {
    if (i < 10) {
      stats[i] = { tries: 100, misses: 90 };
    } else {
      stats[i] = { tries: 10, misses: 1 };
    }
  }

  const start = performance.now();
  const weak = weakLoci(stats);
  const elapsedMs = performance.now() - start;

  // Must complete well within 200ms
  assert.ok(elapsedMs < 200, `weakLoci took too long: ${elapsedMs}ms`);

  // Must cap at exactly WEAK_MAX (5)
  assert.equal(weak.length, WEAK_MAX);

  // All 10 loci (0..9) have identical posterior rates.
  // Ties must be resolved by lower numeric index: [0, 1, 2, 3, 4]
  // (Ensures numeric sorting, not string sorting where "10" < "2")
  assert.deepEqual(weak, [0, 1, 2, 3, 4]);
});

test('redteam: ghostOpacity and ghostWarning handle clock skew, future dates, and invalid timestamps', () => {
  const now = new Date('2026-10-21T12:00:00.000Z');

  // Clock skew: drill timestamp 3 hours into the future
  const futureDrillAt = '2026-10-21T15:00:00.000Z';
  const futureOpacity = ghostOpacity(futureDrillAt, now);
  // h < 0 clamped to h = 0 -> opacity = GHOST_START = 0.35
  assert.equal(futureOpacity, GHOST_START);

  // Drill exactly at warning boundary: h = 2 * log2(7/3) ≈ 2.44519 h
  // Warning triggers when opacity >= 0.15
  const warnTime = new Date(now.getTime() - 2.44 * 3600 * 1000).toISOString();
  assert.equal(ghostWarning([{ at: warnTime, seed: 's', daily: false, sequence: ['AS'], answers: ['AS'], memorizeMs: 1, recallMs: 1 }], now), true);

  const safeTime = new Date(now.getTime() - 2.46 * 3600 * 1000).toISOString();
  assert.equal(ghostWarning([{ at: safeTime, seed: 's', daily: false, sequence: ['AS'], answers: ['AS'], memorizeMs: 1, recallMs: 1 }], now), false);

  // Corrupt timestamp strings
  const badTimestamps = ['invalid', '', 'undefined', '2026-99-99', 'not a date', '   '];
  for (const bad of badTimestamps) {
    assert.equal(ghostOpacity(bad, now), 0, `Expected 0 for bad timestamp "${bad}"`);
    assert.deepEqual(ghosts([{ at: bad, seed: 's', daily: false, sequence: ['AS'], answers: ['AS'], memorizeMs: 1, recallMs: 1 }], now), []);
    assert.equal(ghostWarning([{ at: bad, seed: 's', daily: false, sequence: ['AS'], answers: ['AS'], memorizeMs: 1, recallMs: 1 }], now), false);
  }

  // Invalid `now` Date
  assert.equal(ghostOpacity('2026-10-21T10:00:00.000Z', new Date(Number.NaN)), 0);
});

test('redteam: leeches tie-breaks strictly by DECK order and ignores corrupt SRS states', () => {
  const srs: SaveData['srs'] = {
    // 4 cards each with exactly 5 lapses (all qualify as leeches)
    // Suit order is S, H, D, C; Rank order is A, 2, 3.. K
    KC: { lapses: 5, box: 1, due: '2026-10-21T12:00:00Z', history: [] },
    '2S': { lapses: 5, box: 1, due: '2026-10-21T12:00:00Z', history: [] },
    AS: { lapses: 5, box: 1, due: '2026-10-21T12:00:00Z', history: [] },
    AH: { lapses: 5, box: 1, due: '2026-10-21T12:00:00Z', history: [] },
    // Boundary check: 3 lapses does not qualify
    '3S': { lapses: 3, box: 1, due: '2026-10-21T12:00:00Z', history: [] },
    // Corrupt lapses / foreign keys
    '4S': { lapses: -5, box: 1, due: '2026-10-21T12:00:00Z', history: [] },
    '5S': { lapses: Number.NaN, box: 1, due: '2026-10-21T12:00:00Z', history: [] },
  };

  // Foreign keys
  (srs as Record<string, SrsState>)['JOKER'] = { lapses: 10, box: 1, due: '2026-10-21T12:00:00Z', history: [] };
  (srs as Record<string, SrsState>)['10S'] = { lapses: 10, box: 1, due: '2026-10-21T12:00:00Z', history: [] };
  (srs as Record<string, SrsState>)[''] = { lapses: 10, box: 1, due: '2026-10-21T12:00:00Z', history: [] };

  const result = leeches(srs);

  // Deck order: AS (index 0), 2S (index 1), AH (index 13), KC (index 51).
  assert.deepEqual(result, ['AS', '2S', 'AH', 'KC']);

  // Verify all 52 cards in DECK order when all have 4 lapses
  const allSrs: SaveData['srs'] = {};
  for (const card of DECK) {
    allSrs[card] = { lapses: 4, box: 1, due: '2026-10-21T12:00:00Z', history: [] };
  }
  const allLeeches = leeches(allSrs);
  assert.equal(allLeeches.length, 52);
  assert.deepEqual(allLeeches, DECK);
});

test('redteam: high global miss rate (m + 0.15 > 1.0) produces no weak loci', () => {
  // If player fails 95% across all loci:
  const stats: SaveData['locusStats'] = {};
  for (let i = 0; i < 10; i++) {
    stats[i] = { tries: 20, misses: 19 }; // 95% miss rate
  }
  // Even with 20/20 misses on locus 0, posterior cannot reach 0.95 + 0.15 = 1.10.
  stats[0] = { tries: 20, misses: 20 };

  const weak = weakLoci(stats);
  assert.deepEqual(weak, []);
});
