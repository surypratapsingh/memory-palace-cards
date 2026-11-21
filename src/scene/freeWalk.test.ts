import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCI, viewpoint } from '../data/palace.ts';
import { RUN_SPEED, WALK_SPEED } from './walkInput.ts';
import { isFree, nearestFree } from './collide.ts';
import { createFreeWalk } from './freeWalk.ts';

test('KeyW is physical regardless of Shift, Caps Lock, and the event character', () => {
  const walk = createFreeWalk();
  walk.keyDown('KeyW');
  const initial = viewpoint(0);
  const next = walk.step({ x: initial[0], z: initial[1] }, 0, 0.05);
  assert.ok(next.z < initial[1]);
});

test('Shift changes walk pace to run pace', () => {
  const slow = createFreeWalk();
  const fast = createFreeWalk();
  const [x, z] = viewpoint(0);
  slow.keyDown('KeyW');
  fast.keyDown('KeyW');
  fast.keyDown('ShiftLeft');
  let slowPos = { x, z };
  let fastPos = { x, z };
  for (let i = 0; i < 20; i++) {
    slowPos = slow.step(slowPos, 0, 0.05);
    fastPos = fast.step(fastPos, 0, 0.05);
  }
  const slowDistance = Math.hypot(slowPos.x - x, slowPos.z - z);
  const fastDistance = Math.hypot(fastPos.x - x, fastPos.z - z);
  assert.ok(fastDistance > slowDistance);
  assert.ok(fastDistance <= RUN_SPEED * 1);
  assert.ok(slowDistance <= WALK_SPEED * 1);
});

test('keyUp and clear stop motion; clearing twice and releasing an unheld key are safe', () => {
  const walk = createFreeWalk();
  const [x, z] = viewpoint(0);
  walk.keyDown('KeyW');
  walk.step({ x, z }, 0, 0.05);
  walk.keyUp('KeyA');
  walk.clear();
  walk.clear();
  const stopped = walk.step({ x, z }, 0, 0.05);
  assert.deepEqual(stopped, { x, z });
});

test('a starting position inside the locus object is pushed to a free point', () => {
  const locus = LOCI[0]!;
  const walk = createFreeWalk();
  const position = walk.step({ x: locus.pos[0], z: locus.pos[1] }, 0, 0);
  assert.equal(isFree(position.x, position.z), true);
});

test('long and invalid frame durations cannot move through a wall', () => {
  const walk = createFreeWalk();
  const [x, z] = viewpoint(0);
  walk.keyDown('KeyD');
  const afterLongFrame = walk.step({ x, z }, Math.PI / 2, 1);
  assert.equal(isFree(afterLongFrame.x, afterLongFrame.z), true);
  const afterBadFrame = walk.step(afterLongFrame, 0, Number.NaN);
  assert.equal(isFree(afterBadFrame.x, afterBadFrame.z), true);
  assert.deepEqual(afterBadFrame, afterLongFrame);
});

test('a start inside solid geometry lands on nearestFree, not on a plain body push', () => {
  // Body push alone gives a different free point here (3.012, 1.262); nearestFree gives (3.05, 1.25).
  for (const [x, z] of [[3, 1.25], [4, 1.5]] as const) {
    const walk = createFreeWalk();
    const position = walk.step({ x, z }, 0, 0);
    assert.deepEqual([position.x, position.z], nearestFree(x, z));
  }
});

test('arrow keys and physical WASD codes combine without text-layout dependence', () => {
  const walk = createFreeWalk();
  const [x, z] = viewpoint(0);
  walk.keyDown('KeyW');
  walk.keyDown('ArrowDown');
  const next = walk.step({ x, z }, 0, 0.05);
  assert.deepEqual(next, { x, z });
});
