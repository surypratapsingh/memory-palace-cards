import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelOf, isPerfect, unlockedLevel, recommendedLevel, personalBests, dayDiff, updateStreak, rankTitle, shareText, stepLevel } from './progress.ts';
import { DECK } from './deck.ts';

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

test('unlockedLevel: empty -> 0', () => {
  assert.strictEqual(unlockedLevel([]), 0);
});

test('unlockedLevel: perfect level 0 -> 1', () => {
  assert.strictEqual(unlockedLevel([perfect3]), 1);
});

test('unlockedLevel: imperfect drills do not unlock', () => {
  assert.strictEqual(unlockedLevel([imperfect3]), 0);
});

test('unlockedLevel: never above 7', () => {
  const manyPerfects = [];
  for (let i = 0; i < 100; i++) {
    manyPerfects.push(perfect3);
  }
  assert.strictEqual(unlockedLevel(manyPerfects), 7);
});

test('recommendedLevel: 2 perfects up, 1 miss down gives level 0', () => {
  const drills = [perfect3, perfect3, imperfect3];
  assert.strictEqual(recommendedLevel(drills), 0);
});

test('recommendedLevel: cap at 7', () => {
  const manyPerfects = [];
  for (let i = 0; i < 100; i++) {
    manyPerfects.push(perfect3);
  }
  assert.strictEqual(recommendedLevel(manyPerfects), 7);
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
  assert.strictEqual(dayDiff('2026-01-31', '2026-02-28'), 27);
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
  const result = updateStreak(streakHasDay, '2026-10-20');
  assert.strictEqual(result.count, 5);
  assert.strictEqual(result.lastDay, '2026-10-28');
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

test('updateStreak: freeze cap at 2 after 7th day', () => {
  const result = updateStreak({ lastDay: '2026-10-13', count: 7, freezes: 0 }, '2026-10-20');
  assert.strictEqual(result.count, 8);
  assert.strictEqual(result.freezes, 1);
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

test('rankTitle: 5 is Expert', () => {
  assert.strictEqual(rankTitle(5), 'Expert');
});

test('rankTitle: 7 is Grandmaster', () => {
  assert.strictEqual(rankTitle(7), 'Grandmaster');
});

test('rankTitle: 8 is Palace Keeper', () => {
  assert.strictEqual(rankTitle(8), 'Palace Keeper');
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