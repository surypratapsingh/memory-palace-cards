import type { CardId, DrillResult, SaveData, SrsState } from './types.ts';
import { DECK } from './deck.ts';

// MATHS.md section 5: Weak loci empirical Bayes
// Shrink each locus toward the player's global miss rate with a Beta prior
export const PRIOR_K = 5;

// Posterior miss rate per locus, MATHS.md section 5
// Keys are numbers even when locusStats keys are strings. Empty map when there are no tries.
export function shrunkMissRates(stats: SaveData['locusStats']): Map<number, number> {
  const result = new Map<number, number>();

  // Calculate global miss rate m = Σ misses / Σ tries over all loci
  let totalTries = 0;
  let totalMisses = 0;

  for (const [key, statsEntry] of Object.entries(stats)) {
    const tries = statsEntry.tries;
    const misses = statsEntry.misses;
    totalTries += tries;
    totalMisses += misses;
  }

  if (totalTries === 0) return result;

  const m = totalMisses / totalTries;
  const k = PRIOR_K;
  const k_m = k * m; // prior strength for misses

  // For each locus, compute posterior mean: (misses_i + k·m) / (tries_i + k)
  for (const [key, statsEntry] of Object.entries(stats)) {
    const tries = statsEntry.tries;
    const misses = statsEntry.misses;
    const r = (misses + k_m) / (tries + k);
    result.set(Number(key), r);
  }

  return result;
}

// Weak locus indexes, MATHS.md section 5: at most WEAK_MAX, highest rate first, ties by lower index
export const WEAK_MAX = 5;
export const WEAK_MARGIN = 0.15;
export const WEAK_MIN_TRIES = 3;

export function weakLoci(stats: SaveData['locusStats']): number[] {
  const shrunk = shrunkMissRates(stats);
  const result: number[] = [];

  if (shrunk.size === 0) return result;

  // Calculate global miss rate m
  let totalTries = 0;
  let totalMisses = 0;

  for (const [key, statsEntry] of Object.entries(stats)) {
    totalTries += statsEntry.tries;
    totalMisses += statsEntry.misses;
  }

  const m = totalTries > 0 ? totalMisses / totalTries : 0;

  // Collect loci that are weak: tries_i >= 3 and r_i - m >= 0.15
  const weakCandidates: { index: number; r: number }[] = [];

  for (const [key, r] of shrunk) {
    const tries = stats[Number(key)].tries;
    if (tries >= WEAK_MIN_TRIES && r - m >= WEAK_MARGIN) {
      weakCandidates.push({ index: Number(key), r });
    }
  }

  // Sort by r descending, then by index ascending for ties
  weakCandidates.sort((a, b) => {
    if (b.r !== a.r) return b.r - a.r;
    return a.index - b.index;
  });

  // Return at most WEAK_MAX
  for (let i = 0; i < Math.min(WEAK_MAX, weakCandidates.length); i++) {
    result.push(weakCandidates[i].index);
  }

  return result;
}

// MATHS.md section 6: Ghosts: exponential fade

export const GHOST_START = 0.35;
export const GHOST_HALF_LIFE_H = 2;
export const GHOST_MIN = 0.05;
export const GHOST_WARN = 0.15;

// MATHS.md section 6: opacity(h) = 0.35 · 2^(−h / 2)
// Returns 0 below GHOST_MIN and for an invalid date
export function ghostOpacity(drillAt: string, now: Date): number {
  // If h < 0 (clock moved back), use h = 0
  if (!drillAt) return 0;

  // Check for invalid date
  const drillDate = new Date(drillAt);
  if (isNaN(drillDate.getTime())) return 0;

  const h = Math.max(0, now.getTime() - drillDate.getTime()) / (1000 * 60 * 60);
  // opacity = 0.35 * 2^(-h / 2)
  const opacity = GHOST_START * Math.pow(2, -h / GHOST_HALF_LIFE_H);

  // Return 0 below GHOST_MIN
  return opacity < GHOST_MIN ? 0 : opacity;
}

// Ghosts of the latest drill (largest `at`, not the last array item):
// One per locus with the memorized card. Empty when opacity is 0.
export function ghosts(drills: readonly DrillResult[], now: Date): { index: number; card: CardId; opacity: number }[] {
  if (drills.length === 0) return [];

  // Find the drill with the largest `at` date (not necessarily the last array item)
  let latestIndex = 0;
  for (let i = 1; i < drills.length; i++) {
    if (new Date(drills[i].at).getTime() > new Date(drills[latestIndex].at).getTime()) {
      latestIndex = i;
    }
  }

  const latestDrill = drills[latestIndex];
  const h = Math.max(0, now.getTime() - new Date(latestDrill.at).getTime()) / (1000 * 60 * 60);

  const opacity = ghostOpacity(latestDrill.at, now);

  // One per locus with the memorized card
  // The latest drill has cards in sequence order
  const result: { index: number; card: CardId; opacity: number }[] = [];

  for (let i = 0; i < latestDrill.sequence.length; i++) {
    const card = latestDrill.sequence[i];
    result.push({ index: i, card, opacity });
  }

  return result;
}

// True when the latest drill's ghost opacity is at least GHOST_WARN
export function ghostWarning(drills: readonly DrillResult[], now: Date): boolean {
  const ghostsList = ghosts(drills, now);
  if (ghostsList.length === 0) return false;

  // Check if any ghost has opacity >= GHOST_WARN
  return ghostsList.some(g => g.opacity >= GHOST_WARN);
}

// Card images that keep failing: lapses >= 4
// Sorted by lapses descending, then DECK order
export function leeches(srs: SaveData['srs']): CardId[] {
  // Collect cards with lapses >= 4
  const failingCards: { card: CardId; lapses: number }[] = [];

  for (const [card, srsEntry] of Object.entries(srs)) {
    if (srsEntry && typeof (srsEntry as any).lapses === 'number' && (srsEntry as any).lapses >= 4) {
      failingCards.push({ card, lapses: (srsEntry as any).lapses });
    }
  }

  // Sort by lapses descending, then by DECK order (index ascending)
  failingCards.sort((a, b) => {
    if (b.lapses !== a.lapses) return b.lapses - a.lapses;
    // Find DECK order
    const indexA = DECK.indexOf(a.card);
    const indexB = DECK.indexOf(b.card);
    return indexA - indexB;
  });

  return failingCards.map((f) => f.card);
}