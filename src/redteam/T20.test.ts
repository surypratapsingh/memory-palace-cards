import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECK } from '../deck.ts';
import {
  SPEED_MEMORIZE_LIMIT_MS,
  SPEED_RECALL_LIMIT_MS,
  speedScore,
  compareSpeed,
  speedBest,
} from '../speed.ts';
import {
  unlockedLevel,
  recommendedLevel,
  personalBests,
  shareText,
} from '../progress.ts';
import type { DrillResult } from '../types.ts';

function makeSpeedDrill(partial: Partial<DrillResult>): DrillResult {
  return {
    at: '2026-11-01T12:00:00Z',
    seed: 'speed-seed',
    daily: false,
    mode: 'speed',
    sequence: [...DECK],
    answers: [...DECK],
    memorizeMs: 60000,
    recallMs: 45000,
    ...partial,
  };
}

test('T20 red-team 1: perfect deck with time 0 ms is valid and ranks ahead of all slower perfect decks', () => {
  const zeroTimeDrill = makeSpeedDrill({ memorizeMs: 0 });
  const scoreZero = speedScore(zeroTimeDrill);
  assert.deepEqual(scoreZero, { perfect: true, cards: 52, seconds: 0 });

  const regularDrill = makeSpeedDrill({ memorizeMs: 15000 });
  const scoreRegular = speedScore(regularDrill);

  assert.ok(compareSpeed(scoreZero, scoreRegular) < 0, 'Zero-second perfect deck must rank ahead of 15-second deck');
  assert.equal(speedBest([regularDrill, zeroTimeDrill]), zeroTimeDrill);
});

test('T20 red-team 2: deck with every answer null returns 0 cards and not perfect', () => {
  const nullAnswers = new Array(52).fill(null);
  const nullDrill = makeSpeedDrill({ answers: nullAnswers, memorizeMs: 12000 });
  const score = speedScore(nullDrill);

  assert.deepEqual(score, { perfect: false, cards: 0, seconds: 12 });
});

test('T20 red-team 3: imperfect deck faster than a perfect deck is strictly ranked behind the perfect deck', () => {
  // Lightning-fast partial deck: 51 cards correct in 5 seconds
  const fastPartialAnswers = [...DECK];
  fastPartialAnswers[25] = 'KH' === fastPartialAnswers[25] ? 'KS' : 'KH'; // 1 card wrong in middle
  const fastPartialDrill = makeSpeedDrill({ answers: fastPartialAnswers, memorizeMs: 5000 });
  const fastScore = speedScore(fastPartialDrill);
  assert.equal(fastScore.perfect, false);
  assert.equal(fastScore.cards, 26); // from bottom up

  // Slow perfect deck: all 52 cards in 299 seconds (under 300s limit)
  const slowPerfectDrill = makeSpeedDrill({ memorizeMs: 299000 });
  const slowScore = speedScore(slowPerfectDrill);
  assert.equal(slowScore.perfect, true);
  assert.equal(slowScore.cards, 52);

  // Compare must place perfect ahead of partial
  assert.ok(compareSpeed(slowScore, fastScore) < 0, 'Perfect deck must beat any partial deck regardless of time');
  assert.ok(compareSpeed(fastScore, slowScore) > 0, 'Partial deck must rank after perfect deck');
  assert.equal(speedBest([fastPartialDrill, slowPerfectDrill]), slowPerfectDrill);
});

test('T20 red-team 4: non-speed drills and malformed drills return neutralScore and are rejected by speedBest', () => {
  // Non-speed drill (mode omitted)
  const normalDrill: DrillResult = {
    at: '2026-11-01T12:00:00Z',
    seed: 'normal',
    daily: false,
    sequence: [...DECK],
    answers: [...DECK],
    memorizeMs: 30000,
    recallMs: 30000,
  };
  assert.deepEqual(speedScore(normalDrill), { perfect: false, cards: 0, seconds: 0 });

  // Exceeds memorize time limit (5 min = 300,000 ms)
  const overTimeDrill = makeSpeedDrill({ memorizeMs: SPEED_MEMORIZE_LIMIT_MS + 1 });
  assert.deepEqual(speedScore(overTimeDrill), { perfect: false, cards: 0, seconds: 0 });

  // Exceeds recall time limit (5 min = 300,000 ms)
  const overRecallDrill = makeSpeedDrill({ recallMs: SPEED_RECALL_LIMIT_MS + 1 });
  assert.deepEqual(speedScore(overRecallDrill), { perfect: false, cards: 0, seconds: 0 });

  // Deck with duplicate cards (not a permutation of 52)
  const dupSequence = [...DECK];
  dupSequence[1] = dupSequence[0];
  const dupDrill = makeSpeedDrill({ sequence: dupSequence });
  assert.deepEqual(speedScore(dupDrill), { perfect: false, cards: 0, seconds: 0 });

  // Only invalid speed drills -> speedBest returns null
  assert.equal(speedBest([normalDrill, overTimeDrill, overRecallDrill, dupDrill]), null);
});

test('T20 red-team 5: speed drills mixed into staircase history never alter unlockedLevel, recommendedLevel, or ladder personalBests', () => {
  const ladderDrills: DrillResult[] = [
    {
      at: '2026-11-01T10:00:00Z',
      seed: 'ladder-0',
      daily: false,
      sequence: ['AS', '2S', '3S'], // Level 0 (3 cards)
      answers: ['AS', '2S', '3S'],
      memorizeMs: 5000,
      recallMs: 5000,
    },
  ];

  const baseUnlocked = unlockedLevel(ladderDrills);
  const baseRec = recommendedLevel(ladderDrills);
  const baseBests = personalBests(ladderDrills);

  // Mix in 10 blindingly fast perfect Speed Cards drills
  const mixedDrills = [...ladderDrills];
  for (let i = 0; i < 10; i++) {
    mixedDrills.push(makeSpeedDrill({ memorizeMs: 10000 + i * 100 }));
  }

  // Ladder progression must be strictly unchanged
  assert.equal(unlockedLevel(mixedDrills), baseUnlocked, 'Speed drills must not alter unlockedLevel');
  assert.equal(recommendedLevel(mixedDrills), baseRec, 'Speed drills must not alter recommendedLevel');
  assert.deepEqual(personalBests(mixedDrills), baseBests, 'Speed drills must not alter ladder personalBests');

  // Share text distinguishes Speed Cards mode
  const speedShare = shareText(mixedDrills[1]);
  assert.match(speedShare, /Speed Cards/, 'shareText must label Speed Cards');
});

test('T20 red-team 6: bidirectional prefix scoring awards the maximum matching cards between top-down and bottom-up', () => {
  // Expected deck is DECK (0..51)
  // Let top-down match 5 cards: indices 0..4 correct, index 5 wrong.
  // Let bottom-up match 15 cards: indices 37..51 correct, index 36 wrong.
  const answers = [...DECK];
  answers[5] = answers[5] === 'KH' ? 'KS' : 'KH';
  answers[36] = answers[36] === 'AH' ? 'AS' : 'AH';

  const drill = makeSpeedDrill({ answers });
  const score = speedScore(drill);

  // Top-down prefix = 5, bottom-up prefix = 15. Max = 15.
  assert.equal(score.perfect, false);
  assert.equal(score.cards, 15);
});

test('T20 red-team 7: exact tie-breaks stably retain the earlier chronologically input drill', () => {
  const drillA = makeSpeedDrill({ at: '2026-11-01T10:00:00Z', memorizeMs: 25000 });
  const drillB = makeSpeedDrill({ at: '2026-11-01T11:00:00Z', memorizeMs: 25000 });

  assert.equal(compareSpeed(speedScore(drillA), speedScore(drillB)), 0);
  assert.equal(speedBest([drillA, drillB]), drillA, 'Earlier drill must be preserved on tie');
  assert.equal(speedBest([drillB, drillA]), drillB, 'Input order must determine tie-breaker stability');
});
