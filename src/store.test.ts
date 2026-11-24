import assert from 'node:assert/strict';
import test from 'node:test';
import { emptySave, exportJson, importJson } from './store.ts';

const good = { at: '2026-01-01T00:00:00.000Z', seed: 's', daily: false, sequence: ['AS'], answers: ['AS'], memorizeMs: 1, recallMs: 1 };

test('importJson drops malformed drills and keeps good ones (Q1-F2)', () => {
  const raw = { ...emptySave(), drills: [null, {}, 5, { ...good, at: 1 }, { ...good, seed: undefined }, { ...good, sequence: 'AS' }, { ...good, answers: {} }, good] };
  const out = importJson(JSON.stringify(raw));
  assert.deepEqual(out.drills, [good]);
});

test('importJson keeps valid drills on a round trip', () => {
  const s = { ...emptySave(), drills: [good] };
  assert.deepEqual(importJson(exportJson(s)).drills, [good]);
});
