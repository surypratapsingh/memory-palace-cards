// Shared contracts between all modules and all agents.
// Owned by T0. Do not change in a task branch: ask the integrator (see TASKS.md).
import type { CardInput } from 'ts-fsrs';

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
/** Rank + suit, e.g. "TS" = ten of spades, "QH" = queen of hearts. */
export type CardId = `${Rank}${Suit}`;

/** Default mnemonic image for one card. The user can override `image` (stored in SaveData.images). */
export interface CardImage {
  card: CardId;
  /** Concrete, vivid scene, under 60 chars. "A snowman made of gold coins". */
  image: string;
  /** Why it fits the system. "8 = snowman shape, Diamonds = money". */
  hook: string;
}

/** FSRS state of one card image, as stored in JSON (dates become strings). */
export type SrsState = CardInput;

/** One memorize-then-recall run. */
export interface DrillResult {
  /** ISO timestamp when memorizing started. */
  at: string;
  /** Seed used to deal the sequence. Daily deck uses the local date "YYYY-MM-DD". */
  seed: string;
  daily: boolean;
  /** Cards in memorized order. sequence[i] was shown at locus i. */
  sequence: CardId[];
  /** What the user recalled at locus i. null = skipped. */
  answers: (CardId | null)[];
  memorizeMs: number;
  recallMs: number;
  /** Absent = normal drill (practice or daily). 'speed' = Speed Cards rules (T20, T25). Contract C1, 2026-10-23. */
  mode?: 'speed';
}

export interface Streak {
  /** Local date "YYYY-MM-DD" of the last day the daily goal was met. */
  lastDay: string;
  count: number;
  /** Streak freezes available. Earned weekly, see T5. */
  freezes: number;
}

export interface Settings {
  /** Camera glide duration in ms. 0 = instant (reduced motion). */
  glideMs: number;
  sound: boolean;
  /** Colour-blind-safe palette plus shape markers for strength colours. */
  colorSafe: boolean;
  /** Show image captions under cards while memorizing. */
  captions: boolean;
}

/** Everything persisted. Stored as one JSON document. */
export interface SaveData {
  version: 1;
  /** User overrides of default card images. */
  images: Partial<Record<CardId, string>>;
  /** FSRS state per card image. Missing key = card not introduced yet. */
  srs: Partial<Record<CardId, SrsState>>;
  drills: DrillResult[];
  /** Per-locus drill stats, key = locus index. Drives "weak locus" visuals. */
  locusStats: Record<number, { tries: number; misses: number }>;
  streak: Streak;
  settings: Settings;
  /** FSRS state per locus for the journey trainer (T21, T26), key = locus index. Missing = not trained yet. Contract C1, 2026-10-23. */
  journey?: Partial<Record<number, SrsState>>;
}

// ---- 3D palace view (implemented by T1, used by T4/T7/T8) ----

export interface LocusInfo {
  /** Position on the walking route, 0-based. */
  index: number;
  /** Object the user sees, e.g. "Red armchair". */
  name: string;
  /** Room name, e.g. "Library". */
  room: string;
}

export type LocusMood = 'normal' | 'weak' | 'highlight';

export interface PalaceView {
  /** All loci in walking order. At least 52. */
  readonly loci: readonly LocusInfo[];
  /** Move the camera smoothly to stand in front of locus `index`, facing it. Resolves on arrival. */
  glideTo(index: number): Promise<void>;
  /** Show a card (face + caption) floating at the locus. `card = null` clears it. `opacity` 0..1, default 1 (ghosts use less). */
  showCard(index: number, card: CardId | null, opts?: { caption?: string; opacity?: number }): void;
  clearCards(): void;
  setLocusMood(index: number, mood: LocusMood): void;
  /** true = WASD + mouse look (pointer lock). false = guided mode, camera only moves via glideTo. */
  setFreeWalk(on: boolean): void;
  /** Duration of later glideTo calls. 0 = jump instantly. */
  setGlideMs(ms: number): void;
  /** Called when the user clicks a locus object. Returns a function that removes this callback. */
  onLocusClick(cb: (index: number) => void): () => void;
  dispose(): void;
}

export type CreatePalaceView = (container: HTMLElement) => PalaceView;
