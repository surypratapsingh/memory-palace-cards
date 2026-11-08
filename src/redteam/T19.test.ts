import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confusions, weakCards, speedTrend } from '../insights.ts';
import { DECK } from '../deck.ts';
import type { CardId, DrillResult } from '../types.ts';

function makeDrill(partial: Partial<DrillResult>): DrillResult {
  return {
    at: '2026-11-01T12:00:00Z',
    seed: 'seed-1',
    daily: false,
    sequence: ['AS', '2S', '3S'],
    answers: ['AS', '2S', '3S'],
    memorizeMs: 3000,
    recallMs: 3000,
    ...partial,
  };
}

test('T19 red-team 1: all answers null produces zero confusions, total misses for weakCards, and stable speedTrend', () => {
  const drills: DrillResult[] = [
    makeDrill({ sequence: ['AS', '2S', '3S'], answers: [null, null, null], memorizeMs: 6000 }),
    makeDrill({ sequence: ['AS', '2S', '3S'], answers: [null, null, null], memorizeMs: 3000 }),
    makeDrill({ sequence: ['AS', '2S', '3S'], answers: [null, null, null], memorizeMs: 1500 }),
  ];

  // Blanks are not confusions
  assert.deepEqual(confusions(drills), []);

  // Mean miss rate is 1.0 (9 misses / 9 tries). Posterior rates are (3 + 5*1)/(3+5) = 1.0.
  // Rate - mean = 0 < 0.15, so no cards are flagged as weak.
  const weak = weakCards(drills, new Date('2026-11-02'));
  assert.deepEqual(weak, []);

  // Speed trend is calculated normally
  const trend = speedTrend(drills, 0);
  assert.equal(trend.points.length, 3);
  assert.equal(trend.improving, false); // < 5 points
  assert.ok(trend.slope < 0);
});

test('T19 red-team 2: 52-card fully reversed drill classifies only locus 25 and 26 as swaps and the remaining 50 as substitutions', () => {
  const fullSeq = [...DECK];
  const reversedAnswers = [...fullSeq].reverse();
  const drill = makeDrill({
    sequence: fullSeq,
    answers: reversedAnswers,
  });

  const result = confusions([drill], 100);
  // Total wrong answers = 52 (since no card is its own reverse in an even length of 52).
  // At index 25: card is DECK[25] = 'KH', answer is DECK[51-25] = DECK[26] = 'AD'. Nearby: |26 - 25| = 1 <= 2. Swap!
  // At index 26: card is DECK[26] = 'AD', answer is DECK[51-26] = DECK[25] = 'KH'. Nearby: |25 - 26| = 1 <= 2. Swap!
  // These two swaps group into one order-free pair with count 2 in DECK order (KH is index 25, AD is index 26).
  const swaps = result.filter((c) => c.kind === 'swap');
  assert.equal(swaps.length, 1);
  assert.equal(swaps[0].count, 2);
  assert.equal(swaps[0].expected, 'KH');
  assert.equal(swaps[0].given, 'AD');

  // All other 50 items are substitutions with count 1 each
  const subs = result.filter((c) => c.kind === 'substitution');
  assert.equal(subs.length, 50);
});

test('T19 red-team 3: same pair in both directions merges into a single swap count in deck order', () => {
  const d1 = makeDrill({
    at: '2026-11-01T10:00:00Z',
    sequence: ['AS', '2S', '3S'],
    answers: ['2S', '2S', '3S'], // AS answered with 2S (nearby)
  });
  const d2 = makeDrill({
    at: '2026-11-01T11:00:00Z',
    sequence: ['AS', '2S', '3S'],
    answers: ['AS', 'AS', '3S'], // 2S answered with AS (nearby)
  });

  const res = confusions([d1, d2]);
  assert.equal(res.length, 1);
  assert.equal(res[0].kind, 'swap');
  assert.equal(res[0].count, 2);
  assert.equal(res[0].expected, 'AS');
  assert.equal(res[0].given, '2S');
});

test('T19 red-team 4: performance stress test on 1,000 drills completes in under 200 ms', () => {
  const drills: DrillResult[] = [];
  const baseTime = Date.parse('2026-01-01T00:00:00Z');
  for (let i = 0; i < 1000; i++) {
    const s0 = DECK[i % 52];
    const s1 = DECK[(i + 1) % 52];
    const s2 = DECK[(i + 2) % 52];
    drills.push({
      at: new Date(baseTime + i * 60000).toISOString(),
      seed: `s-${i}`,
      daily: false,
      sequence: [s0, s1, s2],
      answers: i % 2 === 0 ? [s1, s0, s2] : [s0, 'KH', null],
      memorizeMs: 3000 + (i % 50) * 10,
      recallMs: 2000,
    });
  }

  const start = performance.now();
  const c = confusions(drills, 10);
  const w = weakCards(drills, new Date(), 10);
  const st = speedTrend(drills, 0);
  const elapsed = performance.now() - start;

  assert.ok(c.length > 0);
  assert.ok(elapsed < 200, `Execution took ${elapsed} ms, expected < 200 ms`);
  assert.equal(st.points.length, 20);
});

test('T19 red-team 5: answers longer than sequence, malformed types, and corrupted objects are safely handled', () => {
  const malformedDrill: any = {
    at: 'invalid-date',
    sequence: ['AS', '2S', '3S'],
    answers: ['2S', 'AS', '3S', '4S', '5S', '6S'], // answers longer than sequence
    memorizeMs: -5000,
  };

  const corruptDrills: any[] = [
    null,
    undefined,
    {},
    { sequence: 'not-an-array' },
    malformedDrill,
  ];

  assert.doesNotThrow(() => {
    const c = confusions(corruptDrills);
    assert.equal(c.length, 1); // 2S and AS swap
    assert.equal(c[0].kind, 'swap');

    const w = weakCards(corruptDrills, new Date());
    assert.ok(Array.isArray(w));

    const st = speedTrend(corruptDrills, 0);
    assert.deepEqual(st, { points: [], slope: 0, improving: false });
  });
});

test('T19 red-team 6: speed trend verifies improving flag requires >= 5 points and strictly negative slope', () => {
  const times = [5000, 4500, 4000, 3500]; // 4 drills, decreasing
  const drills4 = times.map((ms, i) => makeDrill({
    at: new Date(Date.now() + i * 1000).toISOString(),
    memorizeMs: ms,
  }));

  const trend4 = speedTrend(drills4, 0);
  assert.equal(trend4.points.length, 4);
  assert.ok(trend4.slope < 0);
  assert.equal(trend4.improving, false); // 4 points is not enough

  const drills5 = [...drills4, makeDrill({
    at: new Date(Date.now() + 5000).toISOString(),
    memorizeMs: 3000,
  })];
  const trend5 = speedTrend(drills5, 0);
  assert.equal(trend5.points.length, 5);
  assert.ok(trend5.slope < 0);
  assert.equal(trend5.improving, true); // 5 points and negative slope
});

test('T19 red-team 7: weakCards correctly applies inclusive WEAK_MARGIN (0.15) tolerance and deck tie-breaking', () => {
  const drills: DrillResult[] = [];
  for (let i = 0; i < 5; i++) {
    drills.push(makeDrill({
      sequence: ['AS', '2S', '3S'],
      answers: ['KH', '2S', '3S'],
    }));
  }
  const weak = weakCards(drills, new Date());
  assert.equal(weak.length, 1);
  assert.equal(weak[0].card, 'AS');
  assert.equal(weak[0].tries, 5);
  assert.equal(weak[0].misses, 5);
  assert.ok(Math.abs(weak[0].rate - 2/3) < 1e-9);
});
