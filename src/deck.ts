import type { CardId, Rank, Suit } from './types.ts';

export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
export const DECK: readonly CardId[] = SUITS.flatMap((s) => RANKS.map((r) => `${r}${s}` as CardId));

/** Cards per drill at each ladder level. Level 0 = 3 cards. */
export const LADDER: readonly number[] = [3, 5, 8, 13, 20, 26, 39, 52];

const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

export const isCardId = (s: string): s is CardId => (DECK as readonly string[]).includes(s);
export const isRed = (id: CardId) => id[1] === 'H' || id[1] === 'D';
/** "TS" -> "10♠" */
export const cardLabel = (id: CardId) => (id[0] === 'T' ? '10' : id[0]) + SUIT_SYMBOL[id[1] as Suit];

/** Seeded PRNG (string hash -> mulberry32). Same seed, same sequence, on every machine. */
export function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const deal = (n: number, seed: string): CardId[] => shuffle(DECK, rng(seed)).slice(0, n);

/** Local calendar date "YYYY-MM-DD". Daily deck seed and streak day key. */
export function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** `correct` = total right. `run` = right before the first error (memory-sports scoring). */
export function score(sequence: readonly CardId[], answers: readonly (CardId | null)[]) {
  let correct = 0;
  let run = -1;
  sequence.forEach((c, i) => {
    if (answers[i] === c) correct++;
    else if (run < 0) run = i;
  });
  return { correct, run: run < 0 ? sequence.length : run, total: sequence.length };
}
