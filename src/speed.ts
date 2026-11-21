import { DECK, isCardId } from './deck.ts';
import type { CardId, DrillResult } from './types.ts';

export const SPEED_MEMORIZE_LIMIT_MS = 5 * 60 * 1000;
export const SPEED_RECALL_LIMIT_MS = 5 * 60 * 1000;

export interface SpeedScore {
  perfect: boolean;
  /** Correct uninterrupted prefix before the first error, or all 52 for a perfect deck. */
  cards: number;
  /** Recorded memorization time in seconds; partial results rank by cards instead. */
  seconds: number;
}

function isValidDeck(sequence: readonly unknown[]): sequence is readonly CardId[] {
  return sequence.length === 52 && sequence.every((card) => typeof card === 'string' && isCardId(card)) &&
    new Set(sequence).size === 52;
}

function neutralScore(): SpeedScore {
  return { perfect: false, cards: 0, seconds: 0 };
}

function validSpeedResult(result: DrillResult): boolean {
  return Boolean(result && typeof result === 'object' && result.mode === 'speed' &&
    Array.isArray(result.sequence) && Array.isArray(result.answers) && isValidDeck(result.sequence) &&
    result.answers.length === DECK.length &&
    Number.isFinite(result.memorizeMs) && result.memorizeMs >= 0 && result.memorizeMs <= SPEED_MEMORIZE_LIMIT_MS &&
    Number.isFinite(result.recallMs) && result.recallMs >= 0 && result.recallMs <= SPEED_RECALL_LIMIT_MS);
}

function matchingPrefix(expected: readonly CardId[], answers: readonly unknown[], fromEnd: boolean): number {
  let count = 0;
  for (let offset = 0; offset < expected.length; offset++) {
    const index = fromEnd ? expected.length - offset - 1 : offset;
    if (answers[index] !== expected[index]) break;
    count++;
  }
  return count;
}

/** IAM Speed Cards raw result: exact deck time or longest correct prefix from either end. */
export function speedScore(result: DrillResult): SpeedScore {
  if (!validSpeedResult(result)) return neutralScore();
  const sequence = result.sequence as CardId[];
  const answers = result.answers as readonly unknown[];
  const cards = Math.max(matchingPrefix(sequence, answers, false), matchingPrefix(sequence, answers, true));
  const perfect = cards === DECK.length;
  return { perfect, cards, seconds: result.memorizeMs / 1000 };
}

/** Negative means a ranks ahead of b: perfect first, then lower full-deck time or more partial cards. */
export function compareSpeed(a: SpeedScore, b: SpeedScore): number {
  if (a.perfect !== b.perfect) return a.perfect ? -1 : 1;
  if (a.perfect) return a.seconds - b.seconds;
  return b.cards - a.cards;
}

/** Best valid Speed Cards record in history, or null when none are valid speed drills. */
export function speedBest(drills: readonly DrillResult[]): DrillResult | null {
  if (!Array.isArray(drills)) return null;
  let best: DrillResult | null = null;
  let bestScore: SpeedScore | null = null;
  for (const drill of drills) {
    if (!validSpeedResult(drill)) continue;
    const score = speedScore(drill);
    if (!bestScore || compareSpeed(score, bestScore) < 0) {
      best = drill;
      bestScore = score;
    }
  }
  return best;
}
