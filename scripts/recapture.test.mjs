import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapman } from './recapture.mjs';

test('MATHS.md section 11 worked example: n1=12, n2=8, m=4', () => {
  const r = chapman(12, 8, 4);
  assert.ok(Math.abs(r.total - 22.4) < 1e-9);
  assert.equal(r.found, 16);
  assert.ok(Math.abs(r.hidden - 6.4) < 1e-9);
  assert.equal(r.runAnotherRound, true); // 6.4 / 16 = 40%
});

test('Chapman works when the testers share no bug (m = 0)', () => {
  const r = chapman(3, 2, 0);
  assert.equal(r.total, 11); // 4 * 3 / 1 - 1
  assert.equal(r.found, 5);
});

test('the 25% rule is inclusive and a full overlap leaves nothing hidden', () => {
  assert.equal(chapman(5, 5, 5).hidden, 0);
  assert.equal(chapman(5, 5, 5).runAnotherRound, false);
  // n1=3, n2=3, m=1: N = 16/2 - 1 = 7, found 5, hidden 2 = 40%
  assert.equal(chapman(3, 3, 1).runAnotherRound, true);
  const edge = chapman(7, 7, 6); // N = 64/7 - 1 = 8.142857, found 8, hidden 0.142857
  assert.equal(edge.runAnotherRound, false);
});
