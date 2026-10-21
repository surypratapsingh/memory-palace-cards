import test from 'node:test';
import assert from 'node:assert/strict';
import {
  levelOf,
  isPerfect,
  unlockedLevel,
  stepLevel,
  recommendedLevel,
  personalBests,
  dayDiff,
  updateStreak,
  rankTitle,
  shareText,
} from '../progress.ts';
import { deal } from '../deck.ts';
import type { DrillResult, Streak } from '../types.ts';

test('redteam: drill with 0 cards (empty sequence)', () => {
  const emptyDrill: DrillResult = {
    sequence: [],
    answers: [],
    memorizeMs: 1500,
    daily: false,
    seed: 'empty-test',
  };

  assert.equal(levelOf(emptyDrill), -1);
  assert.equal(isPerfect(emptyDrill), true); // 0 === 0
  assert.equal(unlockedLevel([emptyDrill]), 0);
  assert.equal(recommendedLevel([emptyDrill]), 0);

  const bests = personalBests([emptyDrill]);
  assert.deepEqual(bests, {});

  const share = shareText(emptyDrill);
  assert.equal(
    share,
    'Memory Palace · Practice\n0 cards · 0/0 · run 0 · 0:01'
  );
});

test('redteam: answers shorter than sequence and empty answers', () => {
  const seq13 = deal(13, 'seed-short');
  const partialDrill: DrillResult = {
    sequence: seq13,
    answers: seq13.slice(0, 5), // only answered first 5
    memorizeMs: 25000,
    daily: true,
    seed: '2026-10-21',
  };

  assert.equal(levelOf(partialDrill), 3); // 13 is index 3 in LADDER [3, 5, 8, 13, 20, 26, 39, 52]
  assert.equal(isPerfect(partialDrill), false);
  assert.equal(unlockedLevel([partialDrill]), 0);

  const share = shareText(partialDrill);
  const lines = share.split('\n');
  assert.equal(lines[0], 'Memory Palace · Daily Deck 2026-10-21');
  assert.equal(lines[1], '13 cards · 5/13 · run 5 · 0:25');
  // First 5 right (🟩), remaining 8 wrong/missing (🟥)
  assert.equal(lines[2], '🟩🟩🟩🟩🟩🟥🟥🟥🟥🟥🟥🟥🟥');
});

test('redteam: memorizeMs formatting boundaries (0ms, 999ms, 59999ms, 60000ms, >1hr)', () => {
  const makeDrill = (ms: number, daily: boolean, seed: string): DrillResult => ({
    sequence: deal(3, 't'),
    answers: deal(3, 't'),
    memorizeMs: ms,
    daily,
    seed,
  });

  // 0 ms -> 0:00
  assert.ok(shareText(makeDrill(0, false, '')).includes('0:00'));
  // 999 ms -> 0:00 (floored seconds = 0)
  assert.ok(shareText(makeDrill(999, false, '')).includes('0:00'));
  // 59999 ms -> 0:59 (floored seconds = 59)
  assert.ok(shareText(makeDrill(59999, false, '')).includes('0:59'));
  // 60000 ms -> 1:00
  assert.ok(shareText(makeDrill(60000, false, '')).includes('1:00'));
  // 60999 ms -> 1:00
  assert.ok(shareText(makeDrill(60999, false, '')).includes('1:00'));
  // 3661000 ms -> 61:01 (floored seconds = 3661 = 61m 1s)
  assert.ok(shareText(makeDrill(3661000, false, '')).includes('61:01'));
});

test('redteam: non-date seed and practice mode headers without spoilers', () => {
  const customSeedDrill: DrillResult = {
    sequence: deal(3, 'custom'),
    answers: deal(3, 'custom'),
    memorizeMs: 5000,
    daily: true,
    seed: 'custom-not-a-date-12345',
  };
  const dailyText = shareText(customSeedDrill);
  assert.ok(dailyText.startsWith('Memory Palace · Daily Deck custom-not-a-date-12345'));

  const practiceDrill: DrillResult = {
    sequence: deal(3, 'custom'),
    answers: deal(3, 'custom'),
    memorizeMs: 5000,
    daily: false,
    seed: '2026-10-20', // looks like date, but practice
  };
  const practiceText = shareText(practiceDrill);
  assert.ok(practiceText.startsWith('Memory Palace · Practice'));
  assert.ok(!practiceText.includes('2026-10-20'));

  // No card spoilers in either
  const cardRegex = /[AJQKT2-9][SHDC]|[♠♥♦♣]/;
  assert.ok(!cardRegex.test(dailyText));
  assert.ok(!cardRegex.test(practiceText));
});

test('redteam: 3-year streak simulation across leap year with freeze earn/use and immutability', () => {
  let s: Streak = Object.freeze({ lastDay: '', count: 0, freezes: 0 });

  // Start on 2026-01-01
  s = Object.freeze(updateStreak(s, '2026-01-01'));
  assert.deepEqual(s, { lastDay: '2026-01-01', count: 1, freezes: 0 });

  // Play consecutive days through day 7 (2026-01-07)
  for (let d = 2; d <= 7; d++) {
    const day = `2026-01-0${d}`;
    s = Object.freeze(updateStreak(s, day));
  }
  // On day 7, earns 1 freeze, count = 7
  assert.deepEqual(s, { lastDay: '2026-01-07', count: 7, freezes: 1 });

  // Continue through day 14 (2026-01-14)
  for (let d = 8; d <= 14; d++) {
    const day = d < 10 ? `2026-01-0${d}` : `2026-01-${d}`;
    s = Object.freeze(updateStreak(s, day));
  }
  // On day 14, earns 1 freeze, capped at 2, count = 14
  assert.deepEqual(s, { lastDay: '2026-01-14', count: 14, freezes: 2 });

  // Skip 2026-01-15, play on 2026-01-16 (gap = 2 days, g-1 = 1 freeze consumed)
  s = Object.freeze(updateStreak(s, '2026-01-16'));
  assert.deepEqual(s, { lastDay: '2026-01-16', count: 15, freezes: 1 });

  // Skip 2026-01-17, play on 2026-01-18 (gap = 2 days, g-1 = 1 freeze consumed)
  s = Object.freeze(updateStreak(s, '2026-01-18'));
  assert.deepEqual(s, { lastDay: '2026-01-18', count: 16, freezes: 0 });

  // Skip 2026-01-19, play on 2026-01-20 (no freezes left: reset to count 1)
  s = Object.freeze(updateStreak(s, '2026-01-20'));
  assert.deepEqual(s, { lastDay: '2026-01-20', count: 1, freezes: 0 });

  // Jump to leap year: 2028-02-28 to 2028-02-29
  s = Object.freeze(updateStreak({ lastDay: '2028-02-28', count: 5, freezes: 0 }, '2028-02-29'));
  assert.deepEqual(s, { lastDay: '2028-02-29', count: 6, freezes: 0 });

  // 2028-02-29 to 2028-03-01
  s = Object.freeze(updateStreak(s, '2028-03-01'));
  assert.deepEqual(s, { lastDay: '2028-03-01', count: 7, freezes: 1 });
});

test('redteam: rankTitle boundary and extreme values', () => {
  assert.equal(rankTitle(-999), 'Newcomer');
  assert.equal(rankTitle(-1), 'Newcomer');
  assert.equal(rankTitle(0), 'Novice');
  assert.equal(rankTitle(1), 'Apprentice');
  assert.equal(rankTitle(2), 'Journeyman');
  assert.equal(rankTitle(3), 'Adept');
  assert.equal(rankTitle(4), 'Expert');
  assert.equal(rankTitle(5), 'Master');
  assert.equal(rankTitle(6), 'Grandmaster');
  assert.equal(rankTitle(7), 'Palace Keeper');
  assert.equal(rankTitle(8), 'Palace Keeper');
  assert.equal(rankTitle(100), 'Palace Keeper');
  assert.equal(rankTitle(NaN), 'Newcomer');
});

test('redteam: leap day and year boundary dayDiff precision', () => {
  // 2028 is leap year
  assert.equal(dayDiff('2028-02-28', '2028-03-01'), 2);
  // 2027 is non-leap year
  assert.equal(dayDiff('2027-02-28', '2027-03-01'), 1);
  // Year transitions
  assert.equal(dayDiff('2025-12-31', '2026-01-01'), 1);
  assert.equal(dayDiff('2026-01-01', '2025-12-31'), -1);
  assert.equal(dayDiff('2026-10-20', '2026-10-20'), 0);
});
