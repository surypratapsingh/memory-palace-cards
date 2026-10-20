import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue } from './trainer.ts';
import { DECK } from '../deck.ts';
import { emptySave } from '../store.ts';
import type { SaveData } from '../types.ts';

test('buildQueue: empty save yields the first eight cards in deck order', () => {
  const queue = buildQueue(emptySave(), new Date('2026-01-01T00:00:00Z'));
  assert.deepEqual(queue, DECK.slice(0, 8));
});

test('buildQueue: due reviews precede up to eight unseen cards, oldest due first', () => {
  const data = emptySave();
  data.srs.AS = { ...data.srs.AS, due: '2025-12-01T00:00:00.000Z' } as NonNullable<typeof data.srs.AS>;
  data.srs['2S'] = { ...data.srs.AS!, due: '2025-11-01T00:00:00.000Z' };
  data.srs['3S'] = { ...data.srs.AS, due: '2026-02-01T00:00:00.000Z' };
  assert.deepEqual(buildQueue(data, new Date('2026-01-01T00:00:00Z')), [
    '2S', 'AS', ...DECK.filter((card) => !['AS', '2S', '3S'].includes(card)).slice(0, 8),
  ]);
});

test('buildQueue: JSON date strings are accepted for due reviews', () => {
  const data = emptySave();
  data.srs.QH = { ...data.srs.QH, due: '2025-12-31T00:00:00.000Z' } as NonNullable<typeof data.srs.QH>;
  assert.equal(buildQueue(data, new Date('2026-01-01T00:00:00Z'))[0], 'QH');
});

test('buildQueue: non-due learned cards are excluded, but new cards still fill eight slots', () => {
  const data: SaveData = emptySave();
  data.srs.AS = { ...emptySave().srs.AS, due: '2099-01-01T00:00:00.000Z' } as NonNullable<typeof data.srs.AS>;
  const queue = buildQueue(data, new Date('2026-01-01T00:00:00Z'));
  assert.equal(queue.length, 8);
  assert.ok(!queue.includes('AS'));
  assert.deepEqual(queue, DECK.filter((card) => card !== 'AS').slice(0, 8));
});

test('buildQueue: malformed foreign SRS keys are ignored', () => {
  const data = emptySave();
  (data.srs as Record<string, unknown>).JOKER = { due: '2020-01-01T00:00:00.000Z' };
  assert.deepEqual(buildQueue(data, new Date('2026-01-01T00:00:00Z')), DECK.slice(0, 8));
});

test('buildQueue: queue never duplicates cards and all output IDs are in the deck', () => {
  const data = emptySave();
  for (const card of DECK) {
    data.srs[card] = { ...emptySave().srs.AS!, due: '2025-01-01T00:00:00.000Z' };
  }
  const queue = buildQueue(data, new Date('2026-01-01T00:00:00Z'));
  assert.equal(queue.length, 52);
  assert.equal(new Set(queue).size, 52);
  assert.ok(queue.every((card) => DECK.includes(card)));
});
