import { LOCI, ROOMS } from './data/palace.ts';
import { rng, shuffle } from './deck.ts';
import { isDue, newSrs, Rating, review, strength, type Strength } from './srs.ts';
import type { SaveData, SrsState } from './types.ts';

export type JourneyQuestionKind = 'next' | 'number' | 'where';

export interface JourneyQuestion {
  locus: number;
  kind: JourneyQuestionKind;
  prompt: string;
  answer: number;
  room: string;
}

export interface JourneyChoice {
  locus: number;
  name: string;
  correct: boolean;
}

export type JourneyStrengthCounts = Record<Strength, number>;

function validIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < LOCI.length;
}

function parsedJourney(save: SaveData): Map<number, SrsState> {
  const journey = save?.journey;
  if (!journey || typeof journey !== 'object' || Array.isArray(journey)) return new Map();
  const valid = new Map<number, SrsState>();
  for (const [key, state] of Object.entries(journey)) {
    const index = Number(key);
    if (!Number.isSafeInteger(index) || String(index) !== key || !validIndex(index)) continue;
    if (!state || typeof state !== 'object' || !Number.isFinite(new Date(state.due).getTime()) ||
      !Number.isFinite(state.stability) || !Number.isFinite(state.difficulty) ||
      !Number.isFinite(state.elapsed_days) || !Number.isFinite(state.scheduled_days) ||
      !Number.isFinite(state.learning_steps) || !Number.isFinite(state.reps) || state.reps < 0 ||
      !Number.isFinite(state.lapses) || !Number.isFinite(state.state) ||
      (state.last_review != null && !Number.isFinite(new Date(state.last_review).getTime()))) continue;
    valid.set(index, state);
  }
  return valid;
}

function safeSize(size: number): number {
  return Number.isFinite(size) ? Math.max(0, Math.floor(size)) : 0;
}

function cardQuestion(locus: number, kind: JourneyQuestionKind): JourneyQuestion {
  const info = LOCI[locus];
  if (kind === 'next') {
    return { locus, kind, prompt: `What comes after ${info.name}?`, answer: locus + 1, room: info.room };
  }
  if (kind === 'number') {
    return { locus, kind, prompt: `Which stop is ${info.name}?`, answer: locus, room: info.room };
  }
  return { locus, kind, prompt: `What is at stop ${locus}?`, answer: locus, room: info.room };
}

function kindFor(locus: number, state: SrsState | undefined, random: () => number): JourneyQuestionKind {
  if (locus === LOCI.length - 1) return random() < 0.5 ? 'number' : 'where';
  if (!state || state.reps < 3) return 'next';
  const kinds: readonly JourneyQuestionKind[] = ['next', 'number', 'where'];
  return kinds[Math.floor(random() * kinds.length)];
}

/** Due loci first (oldest due first), followed by at most five new loci in route/room order. */
export function journeyQueue(save: SaveData, now: Date, seed: string, size = 10): number[] {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return [];
  const limit = safeSize(size);
  if (!limit) return [];
  const journey = parsedJourney(save);
  const due = [...journey.entries()]
    .filter(([, state]) => isDue(state, now))
    .sort((a, b) => new Date(a[1].due).getTime() - new Date(b[1].due).getTime() || a[0] - b[0])
    .map(([index]) => index);
  const dueItems = due.slice(0, limit);
  const remaining = Math.max(0, limit - dueItems.length);
  if (!remaining) return dueItems;

  const firstRoomWithNew = ROOMS.findIndex((room) => LOCI.some((locus) => locus.room === room.name && !journey.has(locus.index)));
  if (firstRoomWithNew < 0) return due;
  const room = ROOMS[firstRoomWithNew];
  const newLoci = LOCI
    .filter((locus) => locus.room === room.name && !journey.has(locus.index) && !dueItems.includes(locus.index))
    .slice(0, Math.min(5, remaining))
    .map((locus) => locus.index);
  // Queue order is fixed; question-kind and choice randomness use the same session seed separately.
  void seed;
  return [...dueItems, ...newLoci];
}

/** Build a reproducible prompt and answer kind for one locus. */
export function journeyQuestion(save: SaveData, locus: number, seed: string): JourneyQuestion | null {
  if (!validIndex(locus)) return null;
  const state = parsedJourney(save).get(locus);
  const random = rng(seed);
  const kind = kindFor(locus, state, random);
  return cardQuestion(locus, kind === 'next' && locus === LOCI.length - 1 ? 'number' : kind);
}

/** Alias suitable for callers that model one scheduled queue item as a question. */
export const question = journeyQuestion;

/** Correct answer plus three same-room nearby alternatives when possible; seeded order. */
export function choices(item: JourneyQuestion, seed: string): JourneyChoice[] {
  if (!item || !validIndex(item.locus) || !validIndex(item.answer)) return [];
  const answerLocus = LOCI[item.answer];
  if (!answerLocus) return [];
  const preferred = LOCI.filter((locus) => locus.room === answerLocus.room && locus.index !== item.answer &&
    Math.abs(locus.index - item.answer) <= 3);
  const candidates = preferred.length >= 3 ? preferred : LOCI.filter((locus) => locus.index !== item.answer);
  const random = rng(seed);
  const distractors = shuffle(candidates, random).slice(0, 3);
  return shuffle([
    { locus: answerLocus.index, name: answerLocus.name, correct: true },
    ...distractors.map((locus) => ({ locus: locus.index, name: locus.name, correct: false })),
  ], random);
}

/** Answer one question and schedule the locus through FSRS without mutating the save. */
export function grade(save: SaveData, locus: number, correct: boolean, ms: number, now: Date): SaveData {
  if (!validIndex(locus) || !(now instanceof Date) || !Number.isFinite(now.getTime())) return save;
  const oldJourney = parsedJourney(save);
  const state = oldJourney.get(locus) ?? newSrs(now);
  const rating = !correct ? Rating.Again : Number.isFinite(ms) && ms >= 0 && ms < 4000 ? Rating.Good : Rating.Hard;
  const journey: Partial<Record<number, SrsState>> = Object.fromEntries(oldJourney) as Partial<Record<number, SrsState>>;
  journey[locus] = review(state, rating, now);
  return { ...save, journey };
}

/** Count each valid trained locus by its current FSRS strength; absent/new entries count as new. */
export function journeyStrength(save: SaveData, now: Date): JourneyStrengthCounts {
  const counts: JourneyStrengthCounts = { new: 0, fading: 0, learning: 0, solid: 0, gilded: 0 };
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    counts.new = LOCI.length;
    return counts;
  }
  const journey = parsedJourney(save);
  for (let index = 0; index < LOCI.length; index++) {
    const state = journey.get(index);
    counts[state ? strength(state, now) : 'new']++;
  }
  return counts;
}
