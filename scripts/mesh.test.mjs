import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBoard, pickJob, stateFrom } from './mesh.mjs';

const tasks = parseBoard(readFileSync(new URL('../TASKS.md', import.meta.url), 'utf8'));
const byId = (id) => tasks.find((t) => t.id === id);

test('board parses', () => {
  assert.deepEqual(byId('T7').needs, ['T2', 'T3', 'T4', 'T5', 'T6', 'T12']);
  assert.equal(byId('T7').verify, 'AG');
  assert.equal(byId('Q1-AG').verify, '-');
  assert.equal(byId('T0').build, 'Lead');
});

test('state follows commit subjects', () => {
  const t1 = { ...byId('T1'), status: '-' }; // board status 'done' would win over the branch
  const s = (subjects, main = [], exists = true) => stateFrom(t1, exists, subjects, main).state;
  assert.equal(s([], [], false), 'todo');
  assert.equal(s(['WIP']), 'in-progress');
  assert.equal(s(['T10: other task']), 'in-progress', 'T10 is not T1');
  assert.equal(s(['T1: scene']), 'review');
  assert.equal(s(['V-T1 round 1: CHANGES', 'T1: scene']), 'fix');
  assert.equal(s(['T1: fix round 1', 'V-T1 round 1: CHANGES', 'T1: scene']), 'review');
  assert.equal(s(['V-T1 round 2: PASS', 'T1: fix round 1', 'V-T1 round 1: CHANGES']), 'verified');
  assert.equal(s(['V-T1 round 3: CHANGES', 'V-T1 round 2: CHANGES', 'V-T1 round 1: CHANGES']), 'lead');
  assert.equal(s(['BLOCKED T1: need X']), 'blocked');
  assert.equal(s(['LEAD T1: do Y', 'BLOCKED T1: need X']), 'fix');
  assert.equal(s([], ['V-T1 round 1: PASS'], false), 'done');
  assert.equal(stateFrom(byId('Q1-AG'), true, ['Q1-AG: 12 bugs'], []).state, 'verified');
});

test('jobs: fix, continue, verify, build, wait, done', () => {
  const st = new Map(tasks.map((t) => [t.id, { state: t.id === 'T0' ? 'done' : 'todo', round: 0 }]));
  const set = (id, state, round = 0) => st.set(id, { state, round });
  assert.equal(pickJob('AG', tasks, st).t.id, 'T1');
  assert.equal(pickJob('FB', tasks, st).t.id, 'M1');
  set('T1', 'review');
  set('M1', 'review');
  assert.deepEqual([pickJob('AG', tasks, st).kind, pickJob('AG', tasks, st).t.id], ['VERIFY', 'M1']);
  set('M1', 'fix', 1);
  assert.deepEqual([pickJob('FB', tasks, st).kind, pickJob('FB', tasks, st).t.id], ['FIX', 'M1']);
  set('M1', 'verified');
  set('T1', 'verified');
  assert.equal(pickJob('AG', tasks, st).t.id, 'T4', 'T4 unblocked by verified T1');
  set('T12', 'in-progress');
  assert.notEqual(pickJob('FB', tasks, st).t?.id, 'T12', 'no CONTINUE while T3 is not verified');
  set('T3', 'verified');
  assert.deepEqual([pickJob('FB', tasks, st).kind, pickJob('FB', tasks, st).t.id], ['CONTINUE', 'T12']);
  for (const t of tasks) if (t.build === 'AG' || t.verify === 'AG') set(t.id, 'done');
  set('T4', 'review');
  assert.equal(pickJob('AG', tasks, st).kind, 'WAIT');
  set('T4', 'done');
  assert.equal(pickJob('AG', tasks, st).kind, 'ALL DONE');
});

test('paired UI entries: build your own before rating the rival', () => {
  const st = new Map(tasks.map((t) => [t.id, { state: 'done', round: 0 }]));
  const set = (id, state) => st.set(id, { state, round: 0 });
  for (const id of ['U1-AG', 'U1-FB', 'U1-PICK']) set(id, 'todo');
  set('U1-FB', 'review');
  assert.deepEqual([pickJob('AG', tasks, st).kind, pickJob('AG', tasks, st).t.id], ['BUILD', 'U1-AG'], 'no peeking at U1-FB first');
  set('U1-AG', 'in-progress');
  assert.equal(pickJob('AG', tasks, st).kind, 'CONTINUE');
  set('U1-AG', 'review');
  assert.deepEqual([pickJob('AG', tasks, st).kind, pickJob('AG', tasks, st).t.id], ['VERIFY', 'U1-FB']);
  set('U1-FB', 'todo');
  set('T1', 'review');
  assert.deepEqual([pickJob('FB', tasks, st).kind, pickJob('FB', tasks, st).t.id], ['VERIFY', 'T1'], 'unpaired tasks unaffected');
});
