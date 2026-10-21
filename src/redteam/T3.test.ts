import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue } from '../ui/trainer.ts';
import { DECK } from '../deck.ts';
import { emptySave } from '../store.ts';
import { newSrs } from '../srs.ts';
import type { CardId, SaveData } from '../types.ts';

test('redteam: buildQueue on empty save returns first 8 cards in DECK order', () => {
  const save = emptySave();
  const now = new Date('2026-10-21T12:00:00Z');
  const queue = buildQueue(save, now);

  assert.equal(queue.length, 8);
  assert.deepEqual(queue, DECK.slice(0, 8) as CardId[]);
});

test('redteam: buildQueue with all 52 cards due sorts oldest due first', () => {
  const save = emptySave();
  const now = new Date('2026-10-21T12:00:00Z');

  // Assign due dates in reverse DECK order so oldest due is the last DECK card
  DECK.forEach((card, i) => {
    const s = newSrs(now);
    // Card at index i was due (52 - i) days ago
    s.due = new Date(now.getTime() - (52 - i) * 86400000);
    save.srs[card] = s;
  });

  const queue = buildQueue(save, now);
  assert.equal(queue.length, 52);

  // First card in queue should be DECK[0] (due 52 days ago, the oldest)
  assert.equal(queue[0], DECK[0]);
  // Last card in queue should be DECK[51] (due 1 day ago)
  assert.equal(queue[51], DECK[51]);

  // Verify monotonic due ordering
  for (let i = 0; i < queue.length - 1; i++) {
    const dueA = new Date(save.srs[queue[i]]!.due).getTime();
    const dueB = new Date(save.srs[queue[i + 1]]!.due).getTime();
    assert.ok(dueA <= dueB, `Due dates must be non-decreasing at index ${i}`);
  }
});

test('redteam: buildQueue handles due dates as ISO strings (from JSON)', () => {
  const save = emptySave();
  const now = new Date('2026-10-21T12:00:00Z');

  const s1 = newSrs(now);
  // @ts-expect-error JSON serialized due date is string
  s1.due = '2026-10-10T00:00:00.000Z'; // older
  save.srs.AS = s1;

  const s2 = newSrs(now);
  // @ts-expect-error JSON serialized due date is string
  s2.due = '2026-10-15T00:00:00.000Z'; // newer
  save.srs.KH = s2;

  const queue = buildQueue(save, now);
  // Due cards come first: AS then KH
  assert.equal(queue[0], 'AS');
  assert.equal(queue[1], 'KH');
  // Followed by up to 8 fresh cards (fresh cards exclude AS and KH)
  const fresh = queue.slice(2);
  assert.equal(fresh.length, 8);
  assert.ok(!fresh.includes('AS'));
  assert.ok(!fresh.includes('KH'));
});

test('redteam: buildQueue excludes cards due in the future from due list', () => {
  const save = emptySave();
  const now = new Date('2026-10-21T12:00:00Z');

  // Due in the past (due)
  const past = newSrs(now);
  past.due = new Date('2026-10-18T00:00:00Z');
  save.srs.AS = past;

  // Due in the future (not due)
  const future = newSrs(now);
  future.due = new Date('2026-10-25T00:00:00Z');
  save.srs['2S'] = future;

  const queue = buildQueue(save, now);

  // AS is due, so it is in queue
  assert.ok(queue.includes('AS'));
  // 2S has an SRS entry but is NOT due, so it must NOT be in queue
  assert.ok(!queue.includes('2S'), 'future due card must not be in queue');

  // The rest should be fresh cards from DECK (skipping AS and 2S)
  const expectedFresh = (DECK.filter((c) => c !== 'AS' && c !== '2S') as CardId[]).slice(0, 8);
  assert.deepEqual(queue, ['AS', ...expectedFresh]);
});

test('redteam: buildQueue ignores SRS keys that are not card IDs in hand-edited save', () => {
  const save = emptySave();
  const now = new Date('2026-10-21T12:00:00Z');

  const rogue = newSrs(now);
  rogue.due = new Date('2026-10-01T00:00:00Z');

  // Hand-edited corrupt / foreign keys in srs map
  // @ts-expect-error invalid card keys
  save.srs['FOO'] = rogue;
  // @ts-expect-error invalid card keys
  save.srs['10S'] = rogue; // '10' instead of 'T'
  // @ts-expect-error invalid card keys
  save.srs['ZZ'] = rogue;
  // @ts-expect-error invalid card keys
  save.srs[''] = rogue;

  const queue = buildQueue(save, now);

  // All cards in queue must be valid DECK cards
  for (const card of queue) {
    assert.ok(DECK.includes(card), `Queue contains invalid card ID: ${card}`);
  }
  assert.ok(!queue.includes('FOO' as CardId));
  assert.ok(!queue.includes('10S' as CardId));
  assert.ok(!queue.includes('ZZ' as CardId));
  assert.equal(queue.length, 8);
});
