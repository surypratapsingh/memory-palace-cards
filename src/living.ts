import type { CardId, DrillResult, SaveData, SrsState } from './types.ts';

export const PRIOR_K = 5;
export const WEAK_MARGIN = 0.15;
export const WEAK_MIN_TRIES = 3;
export const WEAK_MAX = 5;
export const GHOST_START = 0.35;
export const GHOST_HALF_LIFE_H = 2;
export const GHOST_MIN = 0.05;
export const GHOST_WARN = 0.15;

const WEAK_TOLERANCE = 1e-9;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MS_PER_HOUR = MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
const MIN_LEECH_LAPSES = 4;
const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
const SUIT_ORDER = ['S', 'H', 'D', 'C'];
const RANKS_PER_SUIT = RANK_ORDER.length;

type LocusStat = { index: number; tries: number; misses: number };
type Ghost = { index: number; card: CardId; opacity: number };

function validStats(stats: SaveData['locusStats']): LocusStat[] {
  if (!stats || typeof stats !== 'object') return [];
  const result: LocusStat[] = [];
  for (const [key, entry] of Object.entries(stats)) {
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || String(index) !== key) continue;
    if (!entry || typeof entry !== 'object') continue;
    if (!Number.isFinite(entry.tries) || !Number.isFinite(entry.misses)) continue;
    if (entry.tries < 0 || entry.misses < 0 || entry.misses > entry.tries) continue;
    result.push({ index, tries: entry.tries, misses: entry.misses });
  }
  return result;
}

function globalMissRate(stats: readonly LocusStat[]): number | null {
  const tries = stats.reduce((sum, entry) => sum + entry.tries, 0);
  if (tries === 0 || !Number.isFinite(tries)) return null;
  const misses = stats.reduce((sum, entry) => sum + entry.misses, 0);
  return Number.isFinite(misses) ? misses / tries : null;
}

/** Posterior miss rate per locus. Empty when there are no valid tries. */
export function shrunkMissRates(stats: SaveData['locusStats']): Map<number, number> {
  const entries = validStats(stats);
  const m = globalMissRate(entries);
  if (m === null) return new Map();
  return new Map(entries.map(({ index, tries, misses }) => [
    index,
    (misses + PRIOR_K * m) / (tries + PRIOR_K),
  ]));
}

/** Weak locus indexes, highest posterior rate first, then lower index. */
export function weakLoci(stats: SaveData['locusStats']): number[] {
  const entries = validStats(stats);
  const m = globalMissRate(entries);
  if (m === null) return [];
  const rates = shrunkMissRates(stats);
  return entries
    .filter(({ index, tries }) => tries >= WEAK_MIN_TRIES && rates.get(index)! - m + WEAK_TOLERANCE >= WEAK_MARGIN)
    .sort((a, b) => rates.get(b.index)! - rates.get(a.index)! || a.index - b.index)
    .slice(0, WEAK_MAX)
    .map(({ index }) => index);
}

/** MATHS.md section 6; expired and invalid drill timestamps have no ghost. */
export function ghostOpacity(drillAt: string, now: Date): number {
  const then = new Date(drillAt).getTime();
  const current = now.getTime();
  if (!Number.isFinite(then) || !Number.isFinite(current)) return 0;
  const hours = Math.max(0, (current - then) / MS_PER_HOUR);
  const opacity = GHOST_START * 2 ** (-hours / GHOST_HALF_LIFE_H);
  return opacity < GHOST_MIN ? 0 : opacity;
}

function latestDrill(drills: readonly DrillResult[]): DrillResult | undefined {
  let latest: DrillResult | undefined;
  let latestTime = -Infinity;
  for (const drill of drills) {
    const timestamp = new Date(drill.at).getTime();
    if (Number.isFinite(timestamp) && timestamp > latestTime) {
      latest = drill;
      latestTime = timestamp;
    }
  }
  return latest;
}

/** Ghosts from the latest valid drill timestamp, one per memorized card. */
export function ghosts(drills: readonly DrillResult[], now: Date): Ghost[] {
  const drill = latestDrill(drills);
  if (!drill) return [];
  const opacity = ghostOpacity(drill.at, now);
  if (opacity === 0) return [];
  return drill.sequence.map((card, index) => ({ index, card, opacity }));
}

/** Whether the latest drill still warrants a fresh-ghost warning. */
export function ghostWarning(drills: readonly DrillResult[], now: Date): boolean {
  const drill = latestDrill(drills);
  return drill !== undefined && ghostOpacity(drill.at, now) >= GHOST_WARN;
}

function deckIndex(card: string): number {
  const rank = RANK_ORDER.indexOf(card[0]);
  const suit = SUIT_ORDER.indexOf(card[1]);
  return rank < 0 || suit < 0 || card.length !== 2 ? -1 : suit * RANKS_PER_SUIT + rank;
}

/** Card images with at least four lapses, sorted by lapses descending then DECK order. */
export function leeches(srs: SaveData['srs']): CardId[] {
  if (!srs || typeof srs !== 'object') return [];
  const failing: { card: CardId; lapses: number; order: number }[] = [];
  for (const key of Object.keys(srs)) {
    const order = deckIndex(key);
    if (order < 0) continue;
    const card = key as CardId;
    const state: SrsState | undefined = srs[card];
    const lapses = state?.lapses;
    if (typeof lapses === 'number' && Number.isFinite(lapses) && lapses >= MIN_LEECH_LAPSES) {
      failing.push({ card, lapses, order });
    }
  }
  return failing
    .sort((a, b) => b.lapses - a.lapses || a.order - b.order)
    .map(({ card }) => card);
}
