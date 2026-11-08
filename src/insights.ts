import { isCardId, LADDER } from './deck.ts';
import { PRIOR_K, WEAK_MARGIN, WEAK_MIN_TRIES } from './living.ts';
import type { CardId, DrillResult } from './types.ts';

export type ConfusionKind = 'swap' | 'substitution';

export interface Confusion {
  expected: CardId;
  given: CardId;
  count: number;
  kind: ConfusionKind;
}

export interface WeakCard {
  card: CardId;
  tries: number;
  misses: number;
  rate: number;
}

export interface SpeedTrend {
  /** Seconds per card, oldest first. */
  points: number[];
  /** Least-squares slope in seconds per card per drill. */
  slope: number;
  improving: boolean;
}

type DrillLike = Partial<DrillResult> | null | undefined;
type ConfusionEntry = Confusion & { recentAt: number; recentOrder: number };
type CardStats = { tries: number; misses: number };

const DECK_ORDER = new Map<string, number>();
for (let suit = 0; suit < 4; suit++) {
  for (let rank = 0; rank < 13; rank++) {
    const card = `${'A23456789TJQK'[rank]}${'SHDC'[suit]}`;
    DECK_ORDER.set(card, suit * 13 + rank);
  }
}

function safeLimit(limit: number): number {
  return Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
}

function drillParts(value: DrillLike): { sequence: unknown[]; answers: unknown[]; at: number; mode: unknown; memorizeMs: unknown } | null {
  if (!value || typeof value !== 'object') return null;
  const drill = value as Record<string, unknown>;
  if (!Array.isArray(drill.sequence)) return null;
  const answers = Array.isArray(drill.answers) ? drill.answers : [];
  const at = typeof drill.at === 'string' ? Date.parse(drill.at) : Number.NaN;
  return { sequence: drill.sequence, answers, at, mode: drill.mode, memorizeMs: drill.memorizeMs };
}

function validCard(value: unknown): value is CardId {
  return typeof value === 'string' && isCardId(value);
}

function hasNearbyCard(sequence: readonly unknown[], card: CardId, index: number): boolean {
  for (let nearby = Math.max(0, index - 2); nearby <= Math.min(sequence.length - 1, index + 2); nearby++) {
    if (nearby !== index && sequence[nearby] === card) return true;
  }
  return false;
}

function orderedPair(a: CardId, b: CardId): [CardId, CardId] {
  return (DECK_ORDER.get(a) ?? Infinity) <= (DECK_ORDER.get(b) ?? Infinity) ? [a, b] : [b, a];
}

/** Frequent wrong-answer pairs; blanks are not confusions. */
export function confusions(drills: readonly DrillResult[], limit = 5): Confusion[] {
  if (!Array.isArray(drills)) return [];
  const grouped = new Map<string, ConfusionEntry>();
  let order = 0;
  for (const value of drills as readonly DrillLike[]) {
    const drill = drillParts(value);
    if (!drill) { order++; continue; }
    for (let i = 0; i < drill.sequence.length; i++) {
      const expected = drill.sequence[i];
      const given = drill.answers[i];
      const eventOrder = order++;
      if (!validCard(expected) || !validCard(given) || expected === given) continue;
      const kind: ConfusionKind = hasNearbyCard(drill.sequence, given, i) ? 'swap' : 'substitution';
      const [first, second] = kind === 'swap' ? orderedPair(expected, given) : [expected, given];
      const key = `${kind}:${first}:${second}`;
      const entry = grouped.get(key);
      const recentAt = Number.isFinite(drill.at) ? drill.at : Number.NEGATIVE_INFINITY;
      if (entry) {
        entry.count++;
        if (recentAt > entry.recentAt || (recentAt === entry.recentAt && eventOrder >= entry.recentOrder)) {
          entry.recentAt = recentAt;
          entry.recentOrder = eventOrder;
        }
      } else {
        grouped.set(key, { expected: first, given: second, count: 1, kind, recentAt, recentOrder: eventOrder });
      }
    }
    order++;
  }
  return [...grouped.values()]
    .sort((a, b) => b.count - a.count || b.recentAt - a.recentAt || b.recentOrder - a.recentOrder ||
      (DECK_ORDER.get(a.expected)! - DECK_ORDER.get(b.expected)!) ||
      (DECK_ORDER.get(a.given)! - DECK_ORDER.get(b.given)!) || a.kind.localeCompare(b.kind))
    .slice(0, safeLimit(limit))
    .map(({ expected, given, count, kind }) => ({ expected, given, count, kind }));
}

/** Cards whose empirical-Bayes miss rate is at least WEAK_MARGIN above the player's mean. */
export function weakCards(drills: readonly DrillResult[], now: Date, limit = 8): WeakCard[] {
  if (!Array.isArray(drills) || !(now instanceof Date) || !Number.isFinite(now.getTime())) return [];
  const stats = new Map<CardId, CardStats>();
  for (const value of drills as readonly DrillLike[]) {
    const drill = drillParts(value);
    if (!drill) continue;
    for (let i = 0; i < drill.sequence.length; i++) {
      const card = drill.sequence[i];
      if (!validCard(card)) continue;
      const answer = drill.answers[i];
      // Unknown answer ids are corrupt data, not evidence of a miss.
      if (answer !== null && answer !== undefined && !validCard(answer)) continue;
      const entry = stats.get(card) ?? { tries: 0, misses: 0 };
      entry.tries++;
      if (answer !== card) entry.misses++;
      stats.set(card, entry);
    }
  }
  let tries = 0;
  let misses = 0;
  for (const entry of stats.values()) {
    tries += entry.tries;
    misses += entry.misses;
  }
  if (tries === 0) return [];
  const mean = misses / tries;
  return [...stats.entries()]
    .filter(([, entry]) => entry.tries >= WEAK_MIN_TRIES)
    .map(([card, entry]) => ({
      card,
      tries: entry.tries,
      misses: entry.misses,
      rate: (entry.misses + PRIOR_K * mean) / (entry.tries + PRIOR_K),
    }))
    .filter((entry) => entry.rate - mean + 1e-9 >= WEAK_MARGIN)
    .sort((a, b) => b.rate - a.rate || DECK_ORDER.get(a.card)! - DECK_ORDER.get(b.card)!)
    .slice(0, safeLimit(limit));
}

const EMPTY_TREND: SpeedTrend = { points: [], slope: 0, improving: false };

/** Memorizing seconds per card for the latest normal drills at one ladder level. */
export function speedTrend(drills: readonly DrillResult[], level: number): SpeedTrend {
  if (!Array.isArray(drills) || !Number.isInteger(level) || level < 0 || level >= LADDER.length) return { ...EMPTY_TREND };
  const cardCount = LADDER[level];
  const samples: { at: number; order: number; seconds: number }[] = [];
  let order = 0;
  for (const value of drills as readonly DrillLike[]) {
    const drill = drillParts(value);
    if (!drill) { order++; continue; }
    if (drill.mode !== 'speed' && drill.sequence.length === cardCount &&
      drill.sequence.every(validCard) && typeof drill.memorizeMs === 'number' &&
      Number.isFinite(drill.memorizeMs) && drill.memorizeMs >= 0 && Number.isFinite(drill.at)) {
      samples.push({ at: drill.at, order, seconds: drill.memorizeMs / 1000 / cardCount });
    }
    order++;
  }
  samples.sort((a, b) => a.at - b.at || a.order - b.order);
  const points = samples.slice(-20).map(({ seconds }) => seconds);
  if (points.length === 0) return { ...EMPTY_TREND };
  const meanX = (points.length - 1) / 2;
  const meanY = points.reduce((sum, value) => sum + value, 0) / points.length;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < points.length; i++) {
    numerator += (i - meanX) * (points[i] - meanY);
    denominator += (i - meanX) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  return { points, slope, improving: points.length >= 5 && slope < 0 };
}
