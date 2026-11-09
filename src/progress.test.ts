import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelOf, isPerfect, unlockedLevel, recommendedLevel, personalBests, dayDiff, updateStreak, rankTitle, shareText, stepLevel, dailyDrillOn } from './progress.ts';
import { DECK, LADDER, rng } from './deck.ts';
import type { CardId, DrillResult } from './types.ts';

const perfect52 = {
  at: '2026-10-20T10:00:00Z',
  seed: '2026-10-20',
  daily: true,
  sequence: DECK,
  answers: DECK,
  memorizeMs: 30000,
  recallMs: 0,
};

const perfect3 = {
  at: '2026-10-20T10:00:00Z',
  seed: '2026-10-20',
  daily: true,
  sequence: ['AS', '2S', '3S'],
  answers: ['AS', '2S', '3S'],
  memorizeMs: 15000,
  recallMs: 0,
};

const imperfect3 = {
  at: '2026-10-20T10:00:00Z',
  seed: '2026-10-20',
  daily: true,
  sequence: ['AS', '2S', '3S'],
  answers: ['AS', null, '3S'],
  memorizeMs: 15000,
  recallMs: 0,
};

const streakZero = { lastDay: '', count: 0, freezes: 0 };
const streakHasDay = { lastDay: '2026-10-20', count: 5, freezes: 0 };

function drill(level: number, perfect = true, memorizeMs = 1000): DrillResult {
  const sequence = DECK.slice(0, LADDER[level]);
  const answers: (CardId | null)[] = sequence.slice();
  if (!perfect && answers.length) answers[0] = null;
  return { ...perfect3, sequence, answers, memorizeMs };
}

test('unlockedLevel: empty -> 0', () => {
  assert.strictEqual(unlockedLevel([]), 0);
});

test('unlockedLevel: perfect level 0 -> 1', () => {
  assert.strictEqual(unlockedLevel([perfect3]), 1);
});

test('unlockedLevel: imperfect drills do not unlock', () => {
  assert.strictEqual(unlockedLevel([imperfect3]), 0);
});

test('unlockedLevel: repeated level-0 perfects unlock only level 1', () => {
  assert.strictEqual(unlockedLevel(Array.from({ length: 100 }, () => perfect3)), 1);
  assert.strictEqual(unlockedLevel([drill(7)]), 7);
});

test('recommendedLevel: two perfects advance and one miss descends', () => {
  assert.strictEqual(recommendedLevel([drill(0), drill(0)]), 1);
  assert.strictEqual(recommendedLevel([drill(0), drill(0), drill(1, false)]), 0);
});

test('recommendedLevel: floor, cap, and unrelated levels', () => {
  assert.strictEqual(recommendedLevel([drill(0, false)]), 0);
  const ladderClimb = Array.from({ length: 7 }, (_, level) => [drill(level), drill(level)]).flat();
  assert.strictEqual(recommendedLevel(ladderClimb), 7);
  assert.strictEqual(recommendedLevel([drill(7)]), 0);
});

test('unlockedLevel: a perfect level-5 drill unlocks level 6 directly', () => {
  assert.strictEqual(unlockedLevel([drill(5)]), 6);
});

test('unlockedLevel: imperfect and non-ladder drills do not unlock', () => {
  const nonLadder = { ...perfect3, sequence: DECK.slice(0, 4), answers: DECK.slice(0, 4) };
  assert.strictEqual(unlockedLevel([drill(5, false), nonLadder]), 0);
});

test('stepLevel: wrong-level drills preserve state and misses descend one level', () => {
  const state = { level: 3, wins: 1 };
  assert.strictEqual(stepLevel(state, 2, false), state);
  assert.deepStrictEqual(stepLevel(state, 3, false), { level: 2, wins: 0 });
  assert.deepStrictEqual(stepLevel({ level: 0, wins: 0 }, 0, false), { level: 0, wins: 0 });
});

test('stepLevel: level 7 is capped and resets wins after two perfects', () => {
  assert.deepStrictEqual(stepLevel({ level: 7, wins: 1 }, 7, true), { level: 7, wins: 0 });
});

test('recommendedLevel never exceeds unlockedLevel over seeded random histories and prefixes', () => {
  const random = rng('T5-property-seed');
  for (let history = 0; history < 500; history++) {
    const records = Array.from({ length: 40 }, () => {
      const level = Math.floor(random() * 8);
      return drill(level, random() < 0.7);
    });
    const prefix: DrillResult[] = [];
    for (const record of records) {
      prefix.push(record);
      assert.ok(recommendedLevel(prefix) <= unlockedLevel(prefix));
    }
  }
});

test('isPerfect: matches run through the first mismatch, including empty and short answers', () => {
  assert.equal(isPerfect({ ...perfect3, sequence: [], answers: [] }), true);
  assert.equal(isPerfect({ ...perfect3, answers: ['AS', '2S'] }), false);
  assert.equal(isPerfect(imperfect3), false);
});

test('personalBests: fastest perfect drill per ladder level only', () => {
  const fast = drill(0, true, 500);
  const slow = drill(0, true, 1000);
  const bests = personalBests([slow, drill(0, false, 1), fast, drill(1, true, 700)]);
  assert.strictEqual(bests[0], fast);
  assert.equal(bests[1].memorizeMs, 700);
});

test('stepLevel simulation follows MATHS.md target success probability and level', () => {
  let randomState = 1;
  const random = () => (randomState = randomState * 16807 % 2147483647) / 2147483647;
  let state = { level: 0, wins: 0 };
  let successes = 0;
  let trials = 0;
  let levelTotal = 0;
  for (let i = 0; i < 20000; i++) {
    const probability = 1 / (1 + Math.exp(state.level - 3.5));
    const perfect = random() < probability;
    state = stepLevel(state, state.level, perfect);
    if (i >= 10000) {
      trials++;
      successes += Number(perfect);
      levelTotal += state.level;
    }
  }
  assert.ok(successes / trials >= 0.67 && successes / trials <= 0.74);
  assert.ok(levelTotal / trials >= 2 && levelTotal / trials <= 3);
});

test('stepLevel: perfect at level 0 gives wins=1', () => {
  let stair = { level: 0, wins: 0 };
  stair = stepLevel(stair, 0, true);
  assert.strictEqual(stair.wins, 1);
  assert.strictEqual(stair.level, 0);
});

test('stepLevel: second perfect at level 0 gives level=1', () => {
  let stair = { level: 0, wins: 0 };
  stair = stepLevel(stair, 0, true);
  assert.strictEqual(stair.wins, 1);
  stair = stepLevel(stair, 0, true);
  assert.strictEqual(stair.wins, 0);
  assert.strictEqual(stair.level, 1);
});

test('stepLevel: drill at wrong level does not change stair', () => {
  let stair = { level: 1, wins: 0 };
  stair = stepLevel(stair, 0, true);
  assert.strictEqual(stair.level, 1);
  assert.strictEqual(stair.wins, 0);
});

test('dayDiff month end', () => {
  assert.strictEqual(dayDiff('2026-01-31', '2026-02-28'), 28);
});

test('dayDiff year end', () => {
  assert.strictEqual(dayDiff('2025-12-31', '2026-01-01'), 1);
});

test('dayDiff leap day', () => {
  assert.strictEqual(dayDiff('2028-02-28', '2028-03-01'), 2);
});

test('dayDiff DST dates', () => {
  assert.strictEqual(dayDiff('2026-03-29', '2026-03-30'), 1);
  assert.strictEqual(dayDiff('2026-10-25', '2026-10-26'), 1);
});

test('updateStreak: empty lastDay gives count = 1', () => {
  const result = updateStreak(streakZero, '2026-10-20');
  assert.strictEqual(result.count, 1);
  assert.strictEqual(result.lastDay, '2026-10-20');
});

test('updateStreak: g < 0 returns unchanged', () => {
  const before = { lastDay: '2026-10-28', count: 5, freezes: 1 };
  const result = updateStreak(before, '2026-10-20');
  assert.strictEqual(result, before);
});

test('updateStreak: g = 0 returns unchanged', () => {
  const result = updateStreak({ ...streakHasDay, lastDay: '2026-10-20' }, '2026-10-20');
  assert.strictEqual(result.count, 5);
  assert.strictEqual(result.lastDay, '2026-10-20');
});

test('updateStreak: g = 1 gives count + 1', () => {
  const result = updateStreak({ lastDay: '2026-10-19', count: 5, freezes: 0 }, '2026-10-20');
  assert.strictEqual(result.count, 6);
  assert.strictEqual(result.lastDay, '2026-10-20');
});

test('updateStreak: advancing to count 7 earns a freeze, capped at 2', () => {
  const result = updateStreak({ lastDay: '2026-10-19', count: 6, freezes: 2 }, '2026-10-20');
  assert.strictEqual(result.count, 7);
  assert.strictEqual(result.freezes, 2);
});

test('updateStreak: a freeze covers a missed day and a 7th streak day earns one', () => {
  const result = updateStreak({ lastDay: '2026-10-17', count: 6, freezes: 1 }, '2026-10-19');
  assert.deepStrictEqual(result, { lastDay: '2026-10-19', count: 7, freezes: 1 });
});

test('updateStreak: unavailable freezes reset the count without earning one', () => {
  assert.deepStrictEqual(updateStreak({ lastDay: '2026-10-17', count: 12, freezes: 0 }, '2026-10-19'), {
    lastDay: '2026-10-19', count: 1, freezes: 0,
  });
});

test('updateStreak: input not mutated', () => {
  const s = { lastDay: '2026-10-20', count: 5, freezes: 0 };
  const _ = updateStreak(s, '2026-10-21');
  assert.strictEqual(s.lastDay, '2026-10-20');
  assert.strictEqual(s.count, 5);
  assert.strictEqual(s.freezes, 0);
});

test('rankTitle: -1 is Newcomer', () => {
  assert.strictEqual(rankTitle(-1), 'Newcomer');
});

test('rankTitle: 0 is Novice', () => {
  assert.strictEqual(rankTitle(0), 'Novice');
});

test('rankTitle follows all ladder titles', () => {
  assert.deepStrictEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7].map(rankTitle), [
    'Newcomer', 'Novice', 'Apprentice', 'Journeyman', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Palace Keeper',
  ]);
  assert.equal(rankTitle(8), 'Palace Keeper');
});

test('shareText: daily header', () => {
  const dailyDrill = {
    at: '2026-10-20T10:00:00Z',
    seed: '2026-10-20',
    daily: true,
    sequence: ['AS', '2S'],
    answers: ['AS', '2S'],
    memorizeMs: 30000,
    recallMs: 0,
  };
  const result = shareText(dailyDrill);
  assert.ok(result.includes('Daily Deck 2026-10-20'), 'should have daily deck header');
});

test('shareText: practice header', () => {
  const practiceDrill = {
    at: '2026-10-20T10:00:00Z',
    seed: '2026-10-20',
    daily: false,
    sequence: ['AS', '2S'],
    answers: ['AS', '2S'],
    memorizeMs: 30000,
    recallMs: 0,
  };
  const result = shareText(practiceDrill);
  assert.ok(result.includes('Memory Palace · Practice'), 'should have practice header');
});

test('shareText: formats daily result, run, and elapsed time without spoilers', () => {
  const result = shareText({ ...drill(0, false, 125000), daily: true, seed: '2026-10-20' });
  assert.equal(result.split('\n')[0], 'Memory Palace · Daily Deck 2026-10-20');
  assert.equal(result.split('\n')[1], '3 cards · 2/3 · run 0 · 2:05');
});

test('shareText: formats 52 cards into four lines and floors time to seconds', () => {
  const text = shareText({ ...perfect52, memorizeMs: 5999 });
  assert.equal(text.split('\n')[1], '52 cards · 52/52 · run 52 · 0:05');
  assert.deepStrictEqual(text.split('\n').slice(2).map((line) => Array.from(line).length), [13, 13, 13, 13]);
  assert.equal(shareText({ ...perfect52, memorizeMs: 723999 }).split('\n')[1], '52 cards · 52/52 · run 52 · 12:03');
});

test('shareText: no card ids or suit symbols', () => {
  const drill = {
    at: '2026-10-20T10:00:00Z',
    seed: '2026-10-20',
    daily: true,
    sequence: ['AS', '2S'],
    answers: ['AS', '2S'],
    memorizeMs: 30000,
    recallMs: 0,
  };
  const result = shareText(drill);
  const hasCardIdRegex = /[AJQKT2-9][SHDC]/;
  const hasSuitSymbolRegex = /[♠♥♦♣]/;
  assert.ok(!hasCardIdRegex.test(result), 'should not contain card IDs');
  assert.ok(!hasSuitSymbolRegex.test(result), 'should not contain suit symbols');
});
test('dailyDrillOn: matches the local-day seed, not the UTC date of `at`', () => {
  const mk = (seed: string, at: string, daily = true) =>
    ({ at, seed, daily, sequence: ['AS'], answers: ['AS'], memorizeMs: 1, recallMs: 1 }) as DrillResult;
  // Daily played late on local Nov 8 in UTC-8 is stamped Nov 9 in UTC; it must not count as Nov 9's daily.
  const yesterday = mk('2026-11-08', '2026-11-09T04:00:00.000Z');
  assert.equal(dailyDrillOn([yesterday], '2026-11-09'), undefined);
  assert.equal(dailyDrillOn([yesterday], '2026-11-08'), yesterday);
  assert.equal(dailyDrillOn([mk('2026-11-09', '2026-11-09T10:00:00.000Z', false)], '2026-11-09'), undefined);
});
