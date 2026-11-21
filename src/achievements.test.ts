import { test } from 'node:test';
import assert from 'node:assert/strict';
import { State } from 'ts-fsrs';
import { achievements } from './achievements.ts';
import { DECK, LADDER } from './deck.ts';
import { LOCI } from './data/palace.ts';
import { review, newSrs, Rating } from './srs.ts';
import { emptySave } from './store.ts';
import type { CardId, DrillResult, SaveData } from './types.ts';

const NOW = new Date('2026-11-08T12:00:00.000Z');
const AT = '2026-11-01T10:00:00.000Z';

function drill(cards: number, extra: Partial<DrillResult> = {}): DrillResult {
  const sequence = DECK.slice(0, cards) as CardId[];
  return { at: AT, seed: 'test', daily: false, sequence, answers: [...sequence], memorizeMs: 60_000, recallMs: 60_000, ...extra };
}

/** A perfect 52-card Speed Cards deck; seconds is the recorded memorization time. */
function speedDeck(seconds: number): DrillResult {
  return drill(52, { mode: 'speed', memorizeMs: seconds * 1000 });
}

const withDrills = (...drills: DrillResult[]): SaveData => ({ ...emptySave(), drills });

const learningCard = () => review(newSrs(NOW), Rating.Good, NOW);
const gildedCard = () => ({ ...newSrs(NOW), state: State.Review, stability: 200, due: NOW, last_review: NOW });

/** One save per badge id that earns it. */
const earnedBy: Record<string, () => SaveData> = {
  'first-drill': () => withDrills(drill(3)),
  'perfect-3': () => withDrills(drill(3)),
  'perfect-5': () => withDrills(drill(5)),
  'perfect-8': () => withDrills(drill(8)),
  'perfect-13': () => withDrills(drill(13)),
  'perfect-20': () => withDrills(drill(20)),
  'perfect-26': () => withDrills(drill(26)),
  'perfect-39': () => withDrills(drill(39)),
  'perfect-52': () => withDrills(drill(52)),
  'streak-7': () => ({ ...emptySave(), streak: { lastDay: '2026-11-08', count: 7, freezes: 0 } }),
  'streak-30': () => ({ ...emptySave(), streak: { lastDay: '2026-11-08', count: 30, freezes: 0 } }),
  'cards-learning': () => ({ ...emptySave(), srs: Object.fromEntries(DECK.map((c) => [c, learningCard()])) }),
  'cards-gilded': () => ({
    ...emptySave(),
    srs: Object.fromEntries(DECK.slice(0, 13).map((c) => [c, gildedCard()])),
  }),
  'journey-learning': () => ({
    ...emptySave(),
    journey: Object.fromEntries(LOCI.map((_, i) => [i, learningCard()])),
  }),
  'speed-perfect': () => withDrills(speedDeck(250)),
  'speed-under-5': () => withDrills(speedDeck(200)),
  'speed-under-2': () => withDrills(speedDeck(100)),
};

const ids = Object.keys(earnedBy);

test('acceptance: an empty save has every badge, none earned, no progress over its total', () => {
  const list = achievements(emptySave(), NOW);
  assert.deepEqual(list.map((a) => a.id), ids);
  for (const a of list) {
    assert.equal(a.earned, false, a.id);
    assert.ok(a.progress, `${a.id} has progress`);
    assert.ok(a.progress[0] <= a.progress[1], a.id);
  }
});

test('LADDER levels each have a perfect-N badge', () => {
  for (const cards of LADDER) assert.ok(ids.includes(`perfect-${cards}`), `perfect-${cards}`);
});

for (const id of ids) {
  test(`${id}: earned when its condition holds`, () => {
    const badge = achievements(earnedBy[id](), NOW).find((a) => a.id === id);
    assert.ok(badge, `${id} listed`);
    assert.equal(badge.earned, true);
    assert.ok(badge.title.length > 0 && !badge.title.includes('!'), 'plain title');
  });

  test(`${id}: not earned on an empty save`, () => {
    const badge = achievements(emptySave(), NOW).find((a) => a.id === id);
    assert.equal(badge?.earned, false);
    assert.equal(badge?.earnedAt, undefined);
  });
}
