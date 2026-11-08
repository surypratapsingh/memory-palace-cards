import { test } from 'node:test';
import assert from 'node:assert/strict';
import { achievements } from '../achievements.ts';
import { DECK } from '../deck.ts';
import { emptySave } from '../store.ts';
import type { CardId, DrillResult, SaveData } from '../types.ts';

const NOW = new Date('2026-11-08T12:00:00.000Z');

function drill(cards: number, at: string, extra: Partial<DrillResult> = {}): DrillResult {
  const sequence = DECK.slice(0, cards) as CardId[];
  return { at, seed: 'rt', daily: false, sequence, answers: [...sequence], memorizeMs: 60_000, recallMs: 60_000, ...extra };
}

const find = (list: ReturnType<typeof achievements>, id: string) => list.find((a) => a.id === id);

test('T22 red-team 1: a drill dated in the future is kept as-is and earns nothing extra', () => {
  const save: SaveData = { ...emptySave(), drills: [drill(3, '2099-01-01T00:00:00.000Z')] };
  const list = achievements(save, NOW);
  assert.equal(find(list, 'perfect-3')?.earnedAt, '2099-01-01T00:00:00.000Z');
  assert.equal(find(list, 'perfect-5')?.earned, false);
});

test('T22 red-team 2: a streak count of 1e9 never shows progress over its total', () => {
  const save: SaveData = { ...emptySave(), streak: { lastDay: '2026-11-08', count: 1e9, freezes: 0 } };
  const list = achievements(save, NOW);
  assert.deepEqual(find(list, 'streak-7')?.progress, [7, 7]);
  assert.deepEqual(find(list, 'streak-30')?.progress, [30, 30]);
  for (const a of list) assert.ok(!a.progress || a.progress[0] <= a.progress[1], a.id);
});

test('T22 red-team 3: a perfect 52 deck tagged daily still earns perfect-52', () => {
  const save: SaveData = { ...emptySave(), drills: [drill(52, '2026-11-02T08:00:00.000Z', { daily: true })] };
  assert.equal(find(achievements(save, NOW), 'perfect-52')?.earned, true);
});

test('T22 red-team 4: badge ids are unique', () => {
  const ids = achievements(emptySave(), NOW).map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('T22 red-team 5: earnedAt is always one of the drill timestamps', () => {
  const drills = [drill(3, '2026-11-01T10:00:00.000Z'), drill(5, '2026-11-02T10:00:00.000Z'), drill(8, '2026-11-03T10:00:00.000Z')];
  const stamps = new Set(drills.map((d) => d.at));
  for (const a of achievements({ ...emptySave(), drills }, NOW)) {
    if (a.earnedAt !== undefined) assert.ok(stamps.has(a.earnedAt), `${a.id} earnedAt ${a.earnedAt}`);
  }
});

test('T22 red-team 6: NaN or negative streak counts neither earn nor show NaN progress', () => {
  for (const count of [Number.NaN, -5]) {
    const save: SaveData = { ...emptySave(), streak: { lastDay: '', count, freezes: 0 } };
    const list = achievements(save, NOW);
    for (const id of ['streak-7', 'streak-30']) {
      const a = find(list, id);
      assert.equal(a?.earned, false, `${id} with count ${count}`);
      assert.deepEqual(a?.progress, [0, id === 'streak-7' ? 7 : 30]);
    }
  }
});

test('T22 red-team 7: a speed drill with a short deck earns no speed badge', () => {
  const bad: DrillResult = { ...drill(52, '2026-11-02T08:00:00.000Z', { mode: 'speed' }), sequence: DECK.slice(0, 51) as CardId[] };
  const list = achievements({ ...emptySave(), drills: [bad] }, NOW);
  assert.equal(find(list, 'speed-perfect')?.earned, false);
  assert.equal(find(list, 'speed-under-2')?.earned, false);
});

test('T22 red-team 8: a corrupt srs entry does not crash and counts as new', () => {
  const save = { ...emptySave(), srs: { 'AS': null } } as unknown as SaveData;
  const list = achievements(save, NOW);
  assert.deepEqual(find(list, 'cards-learning')?.progress, [0, 52]);
});
