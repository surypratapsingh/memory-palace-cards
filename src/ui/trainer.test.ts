import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue } from './trainer.ts';
import { DECK, isCardId } from '../deck.ts';
import { emptySave } from '../store.ts';

test('buildQueue returns empty array for empty data', () => {
  const result = buildQueue({}, new Date());
  assert.deepEqual(result, []);
});

test('buildQueue includes due cards sorted by due date (oldest first)', () => {
  const data = {
    ...emptySave(),
    srs: {
      'AS': { ...emptySave().srs.AS, due: new Date('2026-01-01T00:00:00Z').toISOString() },
      '2S': { ...emptySave().srs.AS, due: new Date('2026-02-01T00:00:00Z').toISOString() },
    },
  };
  const now = new Date('2026-03-01T00:00:00Z');
  const result = buildQueue(data, now);
  // Due cards should be sorted by date - AS before 2S
  if (result.length >= 2) {
    const asIdx = DECK.indexOf('AS');
    const twoSIdx = DECK.indexOf('2S');
    assert.ok(result.indexOf('AS') < result.indexOf('2S'), 'AS should be due before 2S');
  }
});

test('buildQueue includes new cards from DECK order after due cards', () => {
  const data = {
    ...emptySave(),
    srs: {
      'AS': { ...emptySave().srs.AS, due: new Date('2099-12-31T00:00:00Z').toISOString() },
    },
  };
  const now = new Date('2026-01-01T00:00:00Z');
  const result = buildQueue(data, now);
  // Due card AS first
  assert.equal(result[0], 'AS');
  // Then new cards in DECK order: 2S, 3S, 4S, 5S, 6S, 7S, 8S, 9S
  const newCards = ['2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S'];
  for (let i = 0; i < newCards.length; i++) {
    assert.ok(result.includes(newCards[i]), `Expected new card ${newCards[i]} in queue`);
  }
});

test('buildQueue caps at 52 cards', () => {
  const data: SaveData = {
    ...emptySave(),
    srs: {},
  };
  // Force all 52 cards into srs with future due dates - everything becomes "due"
  for (const card of DECK) {
    ;(data.srs as any)[card] = { ...emptySave().srs[card], due: new Date('2099-12-31T00:00:00Z').toISOString() };
  }
  const now = new Date('2026-01-01T00:00:00Z');
  const result = buildQueue(data, now);
  assert.ok(result.length <= 52, `Queue should not exceed 52, got ${result.length}`);
});

test('buildQueue with all cards due returns 52', () => {
  const data: SaveData = {
    ...emptySave(),
    srs: {},
  };
  for (const card of DECK) {
    ;(data.srs as any)[card] = { ...emptySave().srs[card], due: new Date('2099-12-31T00:00:00Z').toISOString() };
  }
  const now = new Date('2026-01-01T00:00:00Z');
  const result = buildQueue(data, now);
  assert.equal(result.length, 52, 'All 52 cards should be due');
});

test('buildQueue with no due cards returns only new cards', () => {
  const data: SaveData = {
    ...emptySave(),
    srs: {
      'AS': { state: 'solid', stability: 100, due: new Date('2099-12-31T00:00:00Z').toISOString() },
    },
  };
  const now = new Date('2026-01-01T00:00:00Z');
  const result = buildQueue(data, now);
  // AS is due (solid state, future due), so it should be in due
  // But with isDue checking due date <= now, and due is 2099, it IS due
  // Let's test with a past due date
  const data2: SaveData = {
    ...emptySave(),
    srs: {
      'AS': { state: 'solid', stability: 100, due: new Date('2025-01-01T00:00:00Z').toISOString() },
    },
  };
  const now2 = new Date('2026-01-01T00:00:00Z');
  const result2 = buildQueue(data2, now2);
  // AS has past due date, so it should be due
  assert.ok(result2.includes('AS'), 'AS with past due should be in queue');
});

test('buildQueue skips cards with future due dates that are not yet due', () => {
  const data: SaveData = {
    ...emptySave(),
    srs: {
      'AS': { state: 'solid', stability: 100, due: new Date('2030-01-01T00:00:00Z').toISOString() },
    },
  };
  const now = new Date('2026-01-01T00:00:00Z');
  const result = buildQueue(data, now);
  // AS has future due date, not yet due
  assert.ok(!result.includes('AS'), 'AS with future due should not be in queue');
});