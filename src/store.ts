import { CARD_IMAGES } from './data/cardImages.ts';
import type { CardId, SaveData, SrsState } from './types.ts';

const KEY = 'memory-palace/v1';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export const emptySave = (): SaveData => ({
  version: 1,
  images: {} as Record<CardId, string>,
  srs: {} as Record<CardId, SrsState>,
  drills: [],
  locusStats: {},
  streak: { lastDay: '', count: 0, freezes: 0 },
  settings: { glideMs: 600, sound: false, colorSafe: false, captions: true },
});

function parse(text: string): SaveData {
  let d: unknown;
  try {
    d = JSON.parse(text);
  } catch {
    throw new Error('Not a memory palace save file');
  }

  if (d === null || typeof d !== 'object') {
    throw new Error('Not a memory palace save file');
  }

  const obj = d as Record<string, unknown>;

  // version must be exactly the number 1 (not string "1")
  if (obj.version !== 1 || typeof obj.version !== 'number') {
    throw new Error('Not a memory palace save file');
  }

  // srs must be an object, not null (typeof null === 'object', so explicit null check)
  if (obj.srs === null || typeof obj.srs !== 'object' || Array.isArray(obj.srs)) {
    throw new Error('Not a memory palace save file');
  }

  // drills must be an array (reject {} which would pass typeof check)
  if (!Array.isArray(obj.drills)) {
    throw new Error('Not a memory palace save file');
  }

  // images must be an object (not null, not array) when present
  if (Object.hasOwn(obj, 'images') && (obj.images === null || typeof obj.images !== 'object' || Array.isArray(obj.images))) {
    throw new Error('Not a memory palace save file');
  }

  // locusStats must be an object (not null, not array) when present
  if (Object.hasOwn(obj, 'locusStats') && (obj.locusStats === null || typeof obj.locusStats !== 'object' || Array.isArray(obj.locusStats))) {
    throw new Error('Not a memory palace save file');
  }

  // streak must be an object with required fields when present
  if (Object.hasOwn(obj, 'streak') && (obj.streak === null || typeof obj.streak !== 'object' || Array.isArray(obj.streak))) {
    throw new Error('Not a memory palace save file');
  }
  if (obj.streak != null) {
    // TypeScript narrowing: streak is guaranteed to be an object here
    const streakObj: { lastDay: string; count: number; freezes: number } = obj.streak as { lastDay: string; count: number; freezes: number };
    if (typeof streakObj.lastDay !== 'string') {
      throw new Error('Not a memory palace save file');
    }
    if (typeof streakObj.count !== 'number') {
      throw new Error('Not a memory palace save file');
    }
    if (typeof streakObj.freezes !== 'number') {
      throw new Error('Not a memory palace save file');
    }
  }

  // settings must be an object when present
  if (Object.hasOwn(obj, 'settings') && (obj.settings === null || typeof obj.settings !== 'object' || Array.isArray(obj.settings))) {
    throw new Error('Not a memory palace save file');
  }

  // journey must be an object (not null, not array) when present (contract C1)
  if (Object.hasOwn(obj, 'journey') && (obj.journey === null || typeof obj.journey !== 'object' || Array.isArray(obj.journey))) {
    throw new Error('Not a memory palace save file');
  }

  // d is validated; build result object with literal version
  const src = d as Record<string, unknown>;
  const result: SaveData = {
    version: 1,
    images: src.images != null && typeof src.images === 'object' ? src.images : {} as Record<CardId, string>,
    // An srs entry without a due date makes isDue/strength/trainer sorting misbehave; drop it so the card is simply new.
    srs: Object.fromEntries(Object.entries(src.srs as object).filter(([, v]) =>
      v != null && typeof v === 'object' && typeof (v as { due?: unknown }).due === 'string')) as Record<CardId, SrsState>,
    // Hand-edited or damaged entries would crash levelOf/ghosts/insights; drop them.
    drills: (src.drills as unknown[]).filter((d): d is SaveData['drills'][number] =>
      d != null && typeof d === 'object' && Array.isArray((d as { sequence?: unknown }).sequence) && Array.isArray((d as { answers?: unknown }).answers)),
    locusStats: src.locusStats != null && typeof src.locusStats === 'object' ? (src.locusStats as Record<number, { tries: number; misses: number }>) : {} as Record<number, { tries: number; misses: number }>,
    streak: src.streak != null && typeof src.streak === 'object' ? {
      lastDay: typeof (src.streak as { lastDay: string }).lastDay === 'string' ? (src.streak as { lastDay: string }).lastDay : '',
      count: typeof (src.streak as { count: number }).count === 'number' ? (src.streak as { count: number }).count : 0,
      freezes: typeof (src.streak as { freezes: number }).freezes === 'number' ? (src.streak as { freezes: number }).freezes : 0,
    } : { lastDay: '', count: 0, freezes: 0 },
    settings: src.settings != null && typeof src.settings === 'object' ? {
      glideMs: 'glideMs' in src.settings ? Number(src.settings.glideMs) : 600,
      sound: 'sound' in src.settings ? Boolean(src.settings.sound) : false,
      colorSafe: 'colorSafe' in src.settings ? Boolean(src.settings.colorSafe) : false,
      captions: 'captions' in src.settings ? Boolean(src.settings.captions) : true,
    } : { glideMs: 600, sound: false, colorSafe: false, captions: true },
  };
  if (src.journey != null) result.journey = src.journey as Partial<Record<number, SrsState>>;
  return result;
}

/** Never throws. A corrupt save is kept under KEY + "/corrupt" so it is not lost, then play starts fresh. */
export function load(storage: Storage = localStorage): SaveData {
  try {
    const text = storage.getItem(KEY);
    if (!text) return emptySave();
    try {
      return parse(text);
    } catch {
      try {
        storage.setItem(KEY + '/corrupt', text);
      } catch {
        // A failed backup must not prevent play from starting with a fresh save.
      }
      return emptySave();
    }
  } catch {
    return emptySave();
  }
}

let onSaveError: (e: unknown) => void = () => {};
/** The app shows a banner from here. Storage can throw (quota, private mode); play must go on. */
export const setSaveErrorHandler = (cb: (e: unknown) => void) => void (onSaveError = cb);

/** Never throws. Returns false and calls the save-error handler when storage refuses the write. */
export function save(data: SaveData, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    onSaveError(e);
    return false;
  }
}

export const exportJson = (data: SaveData) => JSON.stringify(data, null, 1);

/** Throws Error with a readable message on bad input. */
export const importJson = (text: string): SaveData => parse(text);

const DEFAULTS = new Map(CARD_IMAGES.map((c) => [c.card, c.image]));

/** The user's image for a card, else the default, else the card id. */
export const imageFor = (data: SaveData, card: CardId) => data.images[card] ?? DEFAULTS.get(card) ?? card;