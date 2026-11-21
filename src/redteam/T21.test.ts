import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCI } from '../data/palace.ts';
import { newSrs, Rating, review, type SrsState } from '../srs.ts';
import { emptySave } from '../store.ts';
import {
  choices,
  grade,
  journeyQuestion,
  journeyQueue,
  journeyStrength,
} from '../journey.ts';
import type { SaveData } from '../types.ts';

const NOW = new Date('2026-11-01T12:00:00.000Z');

function makeDueState(dueTime: string, reps = 1): SrsState {
  const base = newSrs(new Date('2026-10-01T00:00:00Z'));
  const reviewed = review(base, Rating.Good, new Date('2026-10-01T00:00:00Z'));
  return {
    ...reviewed,
    due: dueTime,
    reps,
  };
}

test('T21 red-team 1: save with all 52 loci due returns all 52 unique loci in due order', () => {
  const save = emptySave();
  const journey: Record<number, SrsState> = {};
  for (let i = 0; i < 52; i++) {
    // Due dates spaced by minutes
    journey[i] = makeDueState(new Date(Date.parse('2026-10-20T00:00:00Z') + i * 60000).toISOString(), 3);
  }
  save.journey = journey;

  const queue = journeyQueue(save, NOW, 'seed-52', 52);
  assert.equal(queue.length, 52);
  assert.equal(new Set(queue).size, 52);
  // Must be in due order 0, 1, ..., 51
  for (let i = 0; i < 52; i++) {
    assert.equal(queue[i], i);
  }
});

test('T21 red-team 2: out-of-range and non-integer journey keys ("-1", "999", "52", "abc") are ignored', () => {
  const save = emptySave();
  const validState = makeDueState('2026-10-20T00:00:00Z');
  (save as any).journey = {
    '-1': validState,
    '999': validState,
    '52': validState,
    'abc': validState,
    'NaN': validState,
    '1.5': validState,
  };

  // Queue ignores all invalid keys and treats save as fresh
  const queue = journeyQueue(save, NOW, 'seed-corrupt', 10);
  assert.deepEqual(queue, [0, 1, 2, 3, 4], 'Empty/corrupt save should yield first 5 loci of room 0');

  // Strength counts all 52 as new
  const counts = journeyStrength(save, NOW);
  assert.equal(counts.new, 52);
  assert.equal(counts.learning, 0);
  assert.equal(counts.solid, 0);

  // Grade on invalid locus returns original save
  const gradedBad = grade(save, 999, true, 2000, NOW);
  assert.equal(gradedBad, save);
});

test('T21 red-team 3: question kind is never "next" for the final locus 51 across any reps or seeds', () => {
  const save = emptySave();
  // Test both new locus (reps = 0) and trained locus (reps = 10)
  const trainedSave = emptySave();
  trainedSave.journey = { 51: makeDueState('2026-10-20T00:00:00Z', 10) };

  for (let s = 0; s < 100; s++) {
    const seed = `seed-final-locus-${s}`;
    const qNew = journeyQuestion(save, 51, seed);
    assert.ok(qNew);
    assert.notEqual(qNew.kind, 'next', `Locus 51 (new) must never have kind 'next' (seed ${seed})`);
    assert.ok(qNew.kind === 'number' || qNew.kind === 'where');
    assert.equal(qNew.answer, 51);

    const qTrained = journeyQuestion(trainedSave, 51, seed);
    assert.ok(qTrained);
    assert.notEqual(qTrained.kind, 'next', `Locus 51 (trained) must never have kind 'next' (seed ${seed})`);
    assert.ok(qTrained.kind === 'number' || qTrained.kind === 'where');
    assert.equal(qTrained.answer, 51);
  }
});

test('T21 red-team 4: choices across all 52 loci always contain exactly 1 correct answer and 3 unique distractors', () => {
  const save = emptySave();
  for (let i = 0; i < 52; i++) {
    const q = journeyQuestion(save, i, `seed-choices-${i}`)!;
    assert.ok(q);
    const ch = choices(q, `choice-seed-${i}`);

    assert.equal(ch.length, 4, `Locus ${i} must have 4 choices`);
    assert.equal(new Set(ch.map((c) => c.locus)).size, 4, `All 4 choices must have unique locus indices`);

    const correctList = ch.filter((c) => c.correct);
    const distractorList = ch.filter((c) => !c.correct);

    assert.equal(correctList.length, 1, `Must have exactly 1 correct choice`);
    assert.equal(distractorList.length, 3, `Must have exactly 3 distractors`);
    assert.equal(correctList[0].locus, q.answer, `Correct choice locus must match question answer`);

    for (const d of distractorList) {
      assert.notEqual(d.locus, q.answer, `Distractor must not equal correct answer`);
      assert.notEqual(d.name, LOCI[q.answer].name, `Distractor name must not equal answer name`);
    }
  }
});

test('T21 red-team 5: same seed produces identical queue and reproducible question choices', () => {
  const save = emptySave();
  save.journey = {
    0: makeDueState('2026-10-15T00:00:00Z', 5),
    1: makeDueState('2026-10-16T00:00:00Z', 5),
  };

  const seed = 'deterministic-session-seed-xyz';
  const q1 = journeyQueue(save, NOW, seed, 10);
  const q2 = journeyQueue(save, NOW, seed, 10);
  assert.deepEqual(q1, q2);

  const item1 = journeyQuestion(save, 0, seed)!;
  const item2 = journeyQuestion(save, 0, seed)!;
  assert.deepEqual(item1, item2);

  const ch1 = choices(item1, seed);
  const ch2 = choices(item2, seed);
  assert.deepEqual(ch1, ch2);
});

test('T21 red-team 6: grade preserves immutability and enforces the exact 4,000 ms threshold', () => {
  const save = emptySave();
  const initial = grade(save, 0, true, 3999, NOW);
  assert.notEqual(initial, save, 'grade must not return the same reference');
  assert.equal(Object.keys(save.journey ?? {}).length, 0, 'original save must not be mutated');

  // ms < 4000 gets Rating.Good
  const goodReview = initial.journey![0]!;
  assert.equal(goodReview.reps, 1);

  // ms = 4000 gets Rating.Hard (higher difficulty than Good)
  const hardSave = grade(save, 0, true, 4000, NOW);
  const hardReview = hardSave.journey![0]!;
  assert.ok(hardReview.difficulty > goodReview.difficulty, 'Hard rating must result in higher difficulty than Good');

  // incorrect gets Rating.Again
  const againSave = grade(initial, 0, false, 1000, new Date(NOW.getTime() + 86400000));
  const againReview = againSave.journey![0]!;
  assert.ok(againReview.difficulty > goodReview.difficulty, 'Again rating must raise difficulty');

  // Rating.Again on a graduated card in State.Review increments lapses
  const reviewCard: SrsState = {
    ...makeDueState(NOW.toISOString(), 5),
    state: 2, // State.Review
    lapses: 0,
  };
  const saveWithReview: SaveData = { ...save, journey: { 0: reviewCard } };
  const failedReviewSave = grade(saveWithReview, 0, false, 1000, NOW);
  assert.equal(failedReviewSave.journey![0]!.lapses, 1, 'Failing a review card increments lapses');
});

test('T21 red-team 7: room introduction gating strictly respects room boundaries (Library 0..12 before Kitchen 13..25)', () => {
  const save = emptySave();
  const journey: Record<number, SrsState> = {};
  // Introduce 12 of 13 loci in Library (0..11)
  for (let i = 0; i < 12; i++) {
    journey[i] = makeDueState('2026-12-01T00:00:00Z'); // not due
  }
  save.journey = journey;

  // Since locus 12 in Library is not yet introduced, queue MUST pick locus 12, and NOT touch Kitchen (13+)
  const queue = journeyQueue(save, NOW, 'seed-room-gate', 10);
  assert.deepEqual(queue, [12], 'Must introduce locus 12 before moving to next room');

  // Now introduce locus 12
  journey[12] = makeDueState('2026-12-01T00:00:00Z');
  const queueKitchen = journeyQueue(save, NOW, 'seed-room-gate', 10);
  // Now Kitchen (13..17) can be introduced, capped at 5
  assert.deepEqual(queueKitchen, [13, 14, 15, 16, 17]);
});
