import { CARD_IMAGES } from './data/cardImages.ts';
import type { CardId, SaveData } from './types.ts';

const KEY = 'memory-palace/v1';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export const emptySave = (): SaveData => ({
  version: 1,
  images: {},
  srs: {},
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
  if (obj.srs === null || typeof obj.srs !== 'object') {
    throw new Error('Not a memory palace save file');
  }

  // drills must be an array (reject {} which would pass typeof check)
  if (!Array.isArray(obj.drills)) {
    throw new Error('Not a memory palace save file');
  }

  // images must be an object (not null, not array) when present
  if (obj.images != null && (typeof obj.images !== 'object' || Array.isArray(obj.images))) {
    throw new Error('Not a memory palace save file');
  }

  // locusStats must be an object (not null, not array) when present
  if (obj.locusStats != null && (typeof obj.locusStats !== 'object' || Array.isArray(obj.locusStats))) {
    throw new Error('Not a memory palace save file');
  }

  // streak must be an object with required fields when present
  if (obj.streak != null && typeof obj.streak !== 'object') {
    throw new Error('Not a memory palace save file');
  }
  if (obj.streak != null) {
    // TypeScript narrowing: streak is guaranteed to be an object here
    const s: { lastDay: string; count: number; freezes: number } = (
      obj.streak as { lastDay: string; count: number; freezes: number }
    );
    if (typeof s.lastDay !== 'string') {
      throw new Error('Not a memory palace save file');
    }
    if (typeof s.count !== 'number') {
      throw new Error('Not a memory palace save file');
    }
    if (typeof s.freezes !== 'number') {
      throw new Error('Not a memory palace save file');
    }
  }

  // settings must be an object when present
  if (obj.settings != null && typeof obj.settings !== 'object') {
    throw new Error('Not a memory palace save file');
  }

  // d is validated; build result object with literal version
  const src = d as Record<string, unknown>;
  const result: SaveData = {
    version: 1,
    images: src.images != null && typeof src.images === 'object' ? src.images : {},
    srs: src.srs != null && typeof src.srs === 'object' ? src.srs : {},
    drills: Array.isArray(src.drills) ? src.drills : [],
    locusStats: src.locusStats != null && typeof src.locusStats === 'object' ? src.locusStats : {},
    streak: src.streak != null && typeof src.streak === 'object' ? {
      lastDay: typeof src.streak.lastDay === 'string' ? src.streak.lastDay : '',
      count: typeof src.streak.count === 'number' ? src.streak.count : 0,
      freezes: typeof src.streak.freezes === 'number' ? src.streak.freezes : 0,
    } : { lastDay: '', count: 0, freezes: 0 },
    settings: src.settings != null && typeof src.settings === 'object' ? {
      glideMs: 'glideMs' in src.settings ? Number(src.settings.glideMs) : 600,
      sound: 'sound' in src.settings ? Boolean(src.settings.sound) : false,
      colorSafe: 'colorSafe' in src.settings ? Boolean(src.settings.colorSafe) : false,
      captions: 'captions' in src.settings ? Boolean(src.settings.captions) : true,
    } : { glideMs: 600, sound: false, colorSafe: false, captions: true },
  };
  return result;
}

/** Never throws. A corrupt save is kept under KEY + "/corrupt" so it is not lost, then play starts fresh. */
export function load(storage: Storage = localStorage): SaveData {
  const text = storage.getItem(KEY);
  if (!text) return emptySave();
  try {
    return parse(text);
  } catch {
    storage.setItem(KEY + '/corrupt', text);
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