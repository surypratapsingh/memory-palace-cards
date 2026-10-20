import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARD_IMAGES } from './data/cardImages.ts';
import { DECK, cardLabel, deal, isCardId, localDay, score } from './deck.ts';
import { Rating, isDue, newSrs, recall, review, strength } from './srs.ts';
import { emptySave, importJson, load, save, setSaveErrorHandler } from './store.ts';

const fakeStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

test('deck has 52 unique cards', () => {
  assert.equal(new Set(DECK).size, 52);
  assert.equal(cardLabel('TS'), '10♠');
});

test('deal is deterministic per seed and has no repeats', () => {
  assert.deepEqual(deal(52, '2026-10-20'), deal(52, '2026-10-20'));
  assert.notDeepEqual(deal(52, 'a'), deal(52, 'b'));
  assert.equal(new Set(deal(52, 'x')).size, 52);
  assert.equal(deal(5, 'x').length, 5);
  assert.equal(localDay(new Date(2026, 0, 5)), '2026-01-05');
});

test('score counts total correct and run until first error', () => {
  assert.deepEqual(score(['AS', '2S', '3S'], ['AS', '2S', '3S']), { correct: 3, run: 3, total: 3 });
  assert.deepEqual(score(['AS', '2S', '3S'], ['AS', null, '3S']), { correct: 2, run: 1, total: 3 });
  assert.deepEqual(score(['AS', '2S'], []), { correct: 0, run: 0, total: 2 });
});

test('srs: review schedules into the future and survives JSON round trip', () => {
  const t0 = new Date('2026-01-01T10:00:00Z');
  const s0 = newSrs(t0);
  assert.equal(strength(s0, t0), 'new');
  assert.equal(recall(s0, t0), 0);
  let s = JSON.parse(JSON.stringify(review(s0, Rating.Good, t0)));
  assert.ok(new Date(s.due) > t0);
  const t1 = new Date(s.due);
  assert.ok(isDue(s, t1));
  s = JSON.parse(JSON.stringify(review(s, Rating.Good, t1)));
  const r = recall(s, t1);
  assert.ok(r > 0.9 && r <= 1, `recall right after review should be high, got ${r}`);
  assert.ok(recall(s, new Date('2027-01-01')) < r, 'recall decays over time');
});

test('store: round trip, corrupt save kept, bad import rejected', () => {
  const st = fakeStorage();
  assert.deepEqual(load(st), emptySave());
  const d = emptySave();
  d.images.AS = 'Ace pilot digging';
  save(d, st);
  assert.equal(load(st).images.AS, 'Ace pilot digging');

  st.setItem('memory-palace/v1', '{broken');
  assert.deepEqual(load(st), emptySave());
  assert.equal(st.m.get('memory-palace/v1/corrupt'), '{broken');

  assert.throws(() => importJson('{"version":2}'), /save file/);
  const old = importJson('{"version":1,"srs":{},"drills":[],"settings":{"sound":true}}');
  assert.equal(old.settings.sound, true);
  assert.equal(old.settings.glideMs, 600, 'missing settings get defaults');

  let err: unknown = null;
  setSaveErrorHandler((e) => (err = e));
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(save(d, full), false, 'save never throws');
  assert.ok(err instanceof Error);
});

test('card images are well formed', () => {
  assert.equal(CARD_IMAGES.length, 52, '52 card images required');
  const ids = CARD_IMAGES.map((c) => c.card);
  assert.equal(new Set(ids).size, ids.length, 'duplicate card');
  for (const c of CARD_IMAGES) {
    assert.ok(isCardId(c.card), `bad card id ${c.card}`);
    assert.ok(c.image.length > 0 && c.image.length <= 60, `image length for ${c.card}`);
    assert.ok(c.hook.length > 0, `hook for ${c.card}`);
  }
});
