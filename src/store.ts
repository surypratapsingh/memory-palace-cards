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
  const d = JSON.parse(text);
  if (d?.version !== 1 || typeof d.srs !== 'object' || !Array.isArray(d.drills)) throw new Error('Not a memory palace save file');
  const base = emptySave();
  return { ...base, ...d, settings: { ...base.settings, ...d.settings } };
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
