import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCI, ROOMS } from './data/palace.ts';
import { DECK } from './deck.ts';
import { grade, journeyQueue, journeyQuestion, journeyStrength, choices } from './journey.ts';
import { emptySave, exportJson, importJson } from './store.ts';
import { newSrs, Rating, review } from './srs.ts';
import type { CardId, SaveData, SrsState } from './types.ts';

const NOW = new Date('2026-10-23T12:00:00.000Z');

function dueState(due: string, reps = 3): SrsState {
  return { ...newSrs(NOW), due, reps };
}

function saveWithJourney(journey: Partial<Record<number, SrsState>>): SaveData {
  return { ...emptySave(), journey };
}

function trained(index: number, count: number, now = NOW): SrsState {
  let state = newSrs(now);
  for (let i = 0; i < count; i++) state = review(state, Rating.Good, new Date(now.getTime() + i * 1000));
  return state;
}

test('journeyQueue starts at route order and introduces at most five new loci per session', () => {
  const queue = journeyQueue(emptySave(), NOW, 'intro');
  assert.deepEqual(queue, [0, 1, 2, 3, 4]);
  assert.equal(queue.length, 5);
  assert.equal(new Set(queue).size, queue.length);
});

test('journeyQueue introduces from only the first room that still has new loci', () => {
  const journey: Partial<Record<number, SrsState>> = {};
  for (let i = 0; i < 13; i++) journey[i] = dueState('2026-10-24T00:00:00.000Z');
  const queue = journeyQueue(saveWithJourney(journey), NOW, 'room-step');
  assert.ok(queue.every((index) => index >= 13 && index < 26));
  assert.deepEqual(queue, [13, 14, 15, 16, 17]);
});

test('journeyQueue orders due loci oldest first, then appends new route-order items', () => {
  const journey = {
    7: dueState('2026-10-22T10:00:00.000Z'),
    3: dueState('2026-10-22T09:00:00.000Z'),
    1: dueState('2026-10-22T10:00:00.000Z'),
  };
  assert.deepEqual(journeyQueue(saveWithJourney(journey), NOW, 'due'), [3, 1, 7, 0, 2, 4, 5, 6]);
});

test('journeyQueue caps due items to requested size and validates size / now', () => {
  const journey: Partial<Record<number, SrsState>> = {};
  for (let i = 0; i < 20; i++) journey[i] = dueState('2026-10-22T00:00:00Z');
  assert.equal(journeyQueue(saveWithJourney(journey), NOW, 'small', 4).length, 4);
  assert.deepEqual(journeyQueue(emptySave(), NOW, 'zero', -1), []);
  assert.deepEqual(journeyQueue(emptySave(), new Date(Number.NaN), 'bad-now'), []);
});

test('journeyQueue ignores corrupt journey keys and entries from imported data', () => {
  const journey = { '999': dueState('2026-10-22T00:00:00Z'), '-1': dueState('2026-10-22T00:00:00Z'), '01': dueState('2026-10-22T00:00:00Z'), bad: dueState('2026-10-22T00:00:00Z'), '0': { due: 'bad', reps: 4 } } as unknown as Partial<Record<number, SrsState>>;
  const queue = journeyQueue(saveWithJourney(journey), NOW, 'corrupt');
  assert.deepEqual(queue, [0, 1, 2, 3, 4]);
});

test('journeyQuestion prefers next during first three reviews and never asks after the final locus', () => {
  const empty = journeyQuestion(emptySave(), 0, 'new');
  assert.equal(empty?.kind, 'next');
  assert.equal(empty?.answer, 1);
  const firstTwo = journeyQuestion(saveWithJourney({ 0: trained(0, 2) }), 0, 'trained');
  assert.equal(firstTwo?.kind, 'next');
  const last = journeyQuestion(emptySave(), LOCI.length - 1, 'last');
  assert.equal(last?.kind === 'next', false);
});

test('journeyQuestion uses seeded kind selection after three reviews', () => {
  const save = saveWithJourney({ 0: trained(0, 3) });
  assert.deepEqual(journeyQuestion(save, 0, 'same-seed'), journeyQuestion(save, 0, 'same-seed'));
  const kinds = new Set(Array.from({ length: 30 }, (_, i) => journeyQuestion(save, 0, `kind-${i}`)?.kind));
  assert.ok(kinds.has('next') && kinds.has('number') && kinds.has('where'));
});

test('question prompts and answers follow the three specified forms', () => {
  const save = saveWithJourney({ 0: trained(0, 3) });
  const next = journeyQuestion(save, 0, 'kind-next');
  const number = Array.from({ length: 100 }, (_, i) => journeyQuestion(save, 0, `num-${i}`)!).find((q) => q.kind === 'number')!;
  const where = Array.from({ length: 100 }, (_, i) => journeyQuestion(save, 0, `where-${i}`)!).find((q) => q.kind === 'where')!;
  assert.equal(next?.prompt, `What comes after ${LOCI[0].name}?`);
  assert.equal(next?.answer, 1);
  assert.equal(number.prompt, `Which stop is ${LOCI[0].name}?`);
  assert.equal(number.answer, 0);
  assert.equal(where.prompt, 'What is at stop 0?');
  assert.equal(where.answer, 0);
});

test('choices provide four unique, seeded options with exactly one correct answer', () => {
  const item = journeyQuestion(emptySave(), 12, 'q')!;
  const first = choices(item, 'choices-seed');
  assert.deepEqual(first, choices(item, 'choices-seed'));
  assert.equal(first.length, 4);
  assert.equal(new Set(first.map(({ locus }) => locus)).size, 4);
  assert.equal(first.filter(({ correct }) => correct).length, 1);
  assert.equal(first.find(({ correct }) => correct)?.locus, item.answer);
});

test('choices use same-room distractors within three stops whenever at least three exist', () => {
  const item = journeyQuestion(emptySave(), 12, 'q')!;
  const options = choices(item, 'nearby');
  const room = LOCI[item.answer].room;
  assert.ok(options.every(({ locus }) => LOCI[locus].room === room));
  assert.ok(options.every(({ locus }) => Math.abs(locus - item.answer) <= 3));
});

test('grade maps wrong, fast-correct, and slow-correct answers to Again, Good, Hard without mutation', () => {
  const original = emptySave();
  const wrong = grade(original, 0, false, 500, NOW);
  const fast = grade(original, 1, true, 3999, NOW);
  const slow = grade(original, 2, true, 4000, NOW);
  assert.equal(original.journey, undefined);
  assert.equal(wrong.journey?.[0]?.reps, 1);
  assert.equal(wrong.journey?.[0]?.lapses, 0);
  assert.equal(fast.journey?.[1]?.reps, 1);
  assert.equal(slow.journey?.[2]?.reps, 1);
  assert.ok(new Date(wrong.journey![0]!.due).getTime() > NOW.getTime());
});

test('grade returns the same save for invalid loci or invalid dates', () => {
  const save = emptySave();
  assert.equal(grade(save, -1, true, 1, NOW), save);
  assert.equal(grade(save, 52, true, 1, NOW), save);
  assert.equal(grade(save, 0, true, 1, new Date(Number.NaN)), save);
});

test('journeyStrength counts all 52 loci, with unintroduced loci as new', () => {
  const counts = journeyStrength(emptySave(), NOW);
  assert.deepEqual(counts, { new: 52, fading: 0, learning: 0, solid: 0, gilded: 0 });
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 52);
});

test('journeyStrength reflects trained FSRS strength and ignores invalid journey keys', () => {
  const journey = {
    0: trained(0, 1),
    1: trained(1, 8),
    2: trained(2, 8),
    '999': trained(999, 8),
  } as unknown as Partial<Record<number, SrsState>>;
  const counts = journeyStrength(saveWithJourney(journey), NOW);
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), LOCI.length);
  assert.equal(counts.new, 49);
  assert.ok(counts.learning + counts.solid + counts.gilded + counts.fading >= 3);
});

test('journey state survives exportJson/importJson', () => {
  const save = grade(emptySave(), 8, true, 1000, NOW);
  const restored = importJson(exportJson(save));
  assert.deepEqual(JSON.parse(JSON.stringify(restored.journey)), JSON.parse(JSON.stringify(save.journey)));
});

test('journeyQueue with many due loci remains unique and deterministic', () => {
  const journey: Partial<Record<number, SrsState>> = {};
  for (let i = 0; i < LOCI.length; i++) journey[i] = dueState('2026-10-22T00:00:00Z');
  const save = saveWithJourney(journey);
  const a = journeyQueue(save, NOW, 'many-due', 40);
  const b = journeyQueue(save, NOW, 'many-due', 40);
  assert.deepEqual(a, b);
  assert.equal(a.length, 40);
  assert.equal(new Set(a).size, 40);
});

test('room data is a contiguous route partition used by queue progression', () => {
  for (let room = 0; room < ROOMS.length; room++) {
    assert.equal(LOCI.filter((locus) => locus.room === ROOMS[room].name).length, 13);
  }
  assert.equal(DECK.length, 52);
  assert.equal(LOCI.length, 52);
});
