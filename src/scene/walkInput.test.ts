import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WALK_SPEED,
  RUN_SPEED,
  ACCEL,
  STOP_TIME,
  keysFromCodes,
  stepWalk,
  type WalkKeys,
  type WalkState,
} from './walkInput.ts';
import { BODY_RADIUS, type Box2 } from './collide.ts';

const NO_KEYS: WalkKeys = {
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false,
};

test('1. keysFromCodes maps physical KeyboardEvent.code values and ignores key characters like w or W', () => {
  assert.deepEqual(keysFromCodes(new Set(['KeyW'])), {
    ...NO_KEYS,
    forward: true,
  });
  assert.deepEqual(keysFromCodes(new Set(['ArrowUp'])), {
    ...NO_KEYS,
    forward: true,
  });
  assert.deepEqual(keysFromCodes(new Set(['KeyS', 'ArrowLeft', 'ShiftRight'])), {
    forward: false,
    back: true,
    left: true,
    right: false,
    run: true,
  });
  assert.deepEqual(keysFromCodes(new Set(['ArrowDown', 'KeyD', 'ShiftLeft'])), {
    forward: false,
    back: true,
    left: false,
    right: true,
    run: true,
  });
  assert.deepEqual(keysFromCodes(new Set(['KeyA'])), {
    ...NO_KEYS,
    left: true,
  });
  assert.deepEqual(keysFromCodes(new Set(['w', 'W', 'a', 's', 'd', 'Space'])), NO_KEYS);
});

test('2. diagonal speed equals straight speed within 1%', () => {
  let straight: WalkState = { x: 7, z: 7, vx: 0, vz: 0 };
  let diag: WalkState = { x: 7, z: 7, vx: 0, vz: 0 };

  const straightKeys: WalkKeys = { ...NO_KEYS, forward: true };
  const diagKeys: WalkKeys = { ...NO_KEYS, forward: true, right: true };

  for (let i = 0; i < 30; i++) {
    straight = stepWalk(straight, straightKeys, 0, 1 / 60, []);
    diag = stepWalk(diag, diagKeys, 0, 1 / 60, []);
  }

  const straightSpeed = Math.hypot(straight.vx, straight.vz);
  const diagSpeed = Math.hypot(diag.vx, diag.vz);
  const straightDist = Math.hypot(straight.x - 7, straight.z - 7);
  const diagDist = Math.hypot(diag.x - 7, diag.z - 7);

  assert.ok(Math.abs(diagSpeed - straightSpeed) / straightSpeed <= 0.01);
  assert.ok(Math.abs(diagDist - straightDist) / straightDist <= 0.01);
});

test('3. run reaches twice walk speed after enough steps', () => {
  let walkState: WalkState = { x: 7, z: 7, vx: 0, vz: 0 };
  let runState: WalkState = { x: 7, z: 7, vx: 0, vz: 0 };

  for (let i = 0; i < 40; i++) {
    walkState = stepWalk(walkState, { ...NO_KEYS, forward: true }, 0, 1 / 60, []);
    runState = stepWalk(runState, { ...NO_KEYS, forward: true, run: true }, 0, 1 / 60, []);
  }

  const walkSpeed = Math.hypot(walkState.vx, walkState.vz);
  const runSpeed = Math.hypot(runState.vx, runState.vz);

  assert.ok(Math.abs(walkSpeed - WALK_SPEED) < 1e-6);
  assert.ok(Math.abs(runSpeed - RUN_SPEED) < 1e-6);
  assert.ok(Math.abs(runSpeed - 2 * walkSpeed) < 1e-6);
});

test('4. after all keys are released at walk speed, speed reaches 0 within STOP_TIME (dt = 1/60)', () => {
  let state: WalkState = { x: 7, z: 7, vx: 0, vz: -WALK_SPEED };
  const dt = 1 / 60;
  const maxSteps = Math.round(STOP_TIME / dt);

  for (let i = 0; i < maxSteps; i++) {
    state = stepWalk(state, NO_KEYS, 0, dt, []);
  }

  const speed = Math.hypot(state.vx, state.vz);
  assert.equal(speed, 0, `Expected speed 0 within STOP_TIME (${STOP_TIME}s), got ${speed}`);
});

test('5. dt clamp: one stepWalk with dt = 5 moves no more than RUN_SPEED * 0.05', () => {
  const start: WalkState = { x: 7, z: 7, vx: 0, vz: -RUN_SPEED };
  const next = stepWalk(start, { ...NO_KEYS, forward: true, run: true }, 0, 5, []);
  const moved = Math.hypot(next.x - start.x, next.z - start.z);

  assert.ok(
    moved <= RUN_SPEED * 0.05 + 1e-9,
    `Expected move <= ${RUN_SPEED * 0.05}, got ${moved}`,
  );
});

test('6. yaw convention: yaw 0 with forward moves towards -z; yaw pi/2 with forward moves towards -x', () => {
  const start: WalkState = { x: 7, z: 7, vx: 0, vz: 0 };
  const forwardKeys: WalkKeys = { ...NO_KEYS, forward: true };

  const s0 = stepWalk(start, forwardKeys, 0, 0.05, []);
  assert.ok(s0.z < start.z, `Expected yaw 0 forward to decrease z, got ${s0.z}`);
  assert.ok(Math.abs(s0.x - start.x) < 1e-9);

  const sLeft = stepWalk(start, forwardKeys, Math.PI / 2, 0.05, []);
  assert.ok(sLeft.x < start.x, `Expected yaw pi/2 forward to decrease x, got ${sLeft.x}`);
  assert.ok(Math.abs(sLeft.z - start.z) < 1e-9);
});

test('7. velocity into a wall is removed so the player does not stick to walls', () => {
  const wall: Box2 = { x0: 8.0, z0: 0, x1: 8.2, z1: 14 };
  let state: WalkState = {
    x: 8.0 - BODY_RADIUS - 0.02,
    z: 7,
    vx: WALK_SPEED,
    vz: -WALK_SPEED, // Lead: was +WALK_SPEED, against the keys; one braking step cannot flip its sign
  };

  state = stepWalk(state, { ...NO_KEYS, forward: true, right: true }, 0, 0.05, [wall]);

  assert.equal(state.vx, 0, `Expected vx into wall at x=8.0 to be zeroed, got ${state.vx}`);
  assert.ok(state.vz < 0, `Expected tangential velocity vz along wall to remain non-zero`);
});

test('8. accelerating from rest uses ACCEL rate per step', () => {
  const start: WalkState = { x: 7, z: 7, vx: 0, vz: 0 };
  const dt = 0.02;
  const next = stepWalk(start, { ...NO_KEYS, forward: true }, 0, dt, []);
  const speed = Math.hypot(next.vx, next.vz);

  assert.ok(Math.abs(speed - ACCEL * dt) < 1e-9);
});