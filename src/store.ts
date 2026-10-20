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
});

function parse(text: string): SaveData {
  const d = JSON.parse(text);
  if (d?.version !== 1 || typeof d.srs !== 'object' || !Array.isArray(d.drills)) throw new Error('Not a memory palace save file');
  return { ...emptySave(), ...d };
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

export const save = (data: SaveData, storage: Storage = localStorage) => storage.setItem(KEY, JSON.stringify(data));

export const exportJson = (data: SaveData) => JSON.stringify(data, null, 1);

/** Throws Error with a readable message on bad input. */
export const importJson = (text: string): SaveData => parse(text);

const DEFAULTS = new Map(CARD_IMAGES.map((c) => [c.card, c.image]));

/** The user's image for a card, else the default, else the card id. */
export const imageFor = (data: SaveData, card: CardId) => data.images[card] ?? DEFAULTS.get(card) ?? card;
