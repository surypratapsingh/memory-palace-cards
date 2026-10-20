import { createEmptyCard, fsrs, State, type Grade } from 'ts-fsrs';
import type { SrsState } from './types.ts';

export { Rating } from 'ts-fsrs';
export type { Grade };

const f = fsrs();

export const newSrs = (now = new Date()): SrsState => createEmptyCard(now);

export const review = (s: SrsState, grade: Grade, now = new Date()): SrsState => f.next(s, now, grade).card;

/** Probability (0..1) the user can recall this card image right now. 0 for never-reviewed cards. */
export const recall = (s: SrsState, now = new Date()): number =>
  s.state === State.New ? 0 : f.get_retrievability(s, now, false);

export const isDue = (s: SrsState, now = new Date()) => new Date(s.due).getTime() <= now.getTime();

export type Strength = 'new' | 'fading' | 'learning' | 'solid' | 'gilded';

/** Visual state of a card image. Thresholds in days of FSRS stability. */
export function strength(s: SrsState, now = new Date()): Strength {
  if (s.state === State.New) return 'new';
  if (recall(s, now) < 0.8) return 'fading';
  if (s.stability >= 180) return 'gilded';
  if (s.stability >= 30) return 'solid';
  return 'learning';
}
