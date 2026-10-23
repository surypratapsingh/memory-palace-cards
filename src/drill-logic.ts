import { localDay, RANKS, SUITS } from './deck.ts';
import type { CardId, DrillResult, Rank, SaveData, Suit } from './types.ts';

/** Keyboard card entry: rank key then suit key. Keys: A 2-9 T 0(=T) J Q K, then S H D C. Case-insensitive. Returns null for anything else. */
export function cardFromKeys(rankKey: string, suitKey: string): CardId | null {
  if (typeof rankKey !== 'string' || typeof suitKey !== 'string') return null;
  const r = rankKey.trim().toUpperCase();
  const s = suitKey.trim().toUpperCase();
  const rank = r === '0' ? 'T' : (r as Rank);
  if ((RANKS as readonly string[]).includes(rank) && (SUITS as readonly string[]).includes(s)) {
    return `${rank}${s}` as CardId;
  }
  return null;
}

/** New SaveData with the result appended to drills and locusStats updated: tries + 1 at every locus 0..n-1, misses + 1 where answers[i] !== sequence[i]. Never mutates data. */
export function applyResult(data: SaveData, result: DrillResult): SaveData {
  const nextLocusStats: Record<number, { tries: number; misses: number }> = {};

  // Preserve existing locusStats, converting string keys to numbers
  if (data.locusStats && typeof data.locusStats === 'object') {
    for (const [k, v] of Object.entries(data.locusStats)) {
      const idx = Number(k);
      if (!Number.isNaN(idx) && v && typeof v === 'object') {
        nextLocusStats[idx] = { tries: Number(v.tries) || 0, misses: Number(v.misses) || 0 };
      }
    }
  }

  // Update tries and misses for all loci in sequence (0 .. sequence.length - 1)
  const n = Array.isArray(result.sequence) ? result.sequence.length : 0;
  for (let i = 0; i < n; i++) {
    const prev = nextLocusStats[i] ?? { tries: 0, misses: 0 };
    const answer = result.answers ? result.answers[i] : undefined;
    const isMiss = answer !== result.sequence[i];
    nextLocusStats[i] = {
      tries: prev.tries + 1,
      misses: prev.misses + (isMiss ? 1 : 0),
    };
  }

  return {
    version: 1,
    images: { ...data.images },
    srs: { ...data.srs },
    drills: [...(data.drills || []), result],
    locusStats: nextLocusStats,
    streak: { ...data.streak },
    settings: { ...data.settings },
  };
}

/** Seed for a drill: localDay(now) when daily, else a random id. */
export function drillSeed(daily: boolean, now: Date = new Date()): string {
  if (daily) {
    return localDay(now);
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `p-${now.getTime()}-${rand}`;
}
