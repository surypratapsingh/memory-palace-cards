import test from 'node:test';
import assert from 'node:assert/strict';
import { viewpoint, LOCI } from '../data/palace.ts';
import { isFree, nearestFree } from '../scene/collide.ts';
import { createFreeWalk } from '../scene/freeWalk.ts';

test('redteam: negative, zero, NaN, and infinite dt never corrupt coordinates or produce NaN', () => {
  const [x, z] = viewpoint(0);
  const walk = createFreeWalk();
  walk.keyDown('KeyW');

  for (const badDt of [-1, -0.05, 0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const pos = walk.step({ x, z }, 0, badDt);
    assert.ok(Number.isFinite(pos.x), `pos.x must be finite for dt=${badDt}`);
    assert.ok(Number.isFinite(pos.z), `pos.z must be finite for dt=${badDt}`);
    assert.ok(isFree(pos.x, pos.z), `pos must remain in free space for dt=${badDt}`);
  }
});

test('redteam: all directional keys pressed simultaneously produce zero net movement', () => {
  const [x, z] = viewpoint(0);
  const walk = createFreeWalk();

  // Press all combinations of forward/back/left/right
  walk.keyDown('KeyW');
  walk.keyDown('KeyS');
  walk.keyDown('KeyA');
  walk.keyDown('KeyD');
  walk.keyDown('ArrowUp');
  walk.keyDown('ArrowDown');
  walk.keyDown('ArrowLeft');
  walk.keyDown('ArrowRight');
  walk.keyDown('ShiftLeft');
  walk.keyDown('ShiftRight');

  let cur = { x, z };
  for (let i = 0; i < 20; i++) {
    cur = walk.step(cur, Math.PI / 3, 0.05);
  }
  const displacement = Math.hypot(cur.x - x, cur.z - z);
  assert.ok(displacement < 1e-6, `Displacement must be 0 when opposing keys cancel (got ${displacement})`);
});

test('redteam: releasing unheld keys and redundant keyups never corrupt state or throw', () => {
  const [x, z] = viewpoint(0);
  const walk = createFreeWalk();

  // Release 15 keys that were never pressed
  const rogueKeys = ['KeyQ', 'KeyE', 'KeyR', 'Space', 'Backspace', 'Enter', 'Escape', 'Tab', 'AltLeft', 'ControlLeft'];
  for (const k of rogueKeys) {
    assert.doesNotThrow(() => walk.keyUp(k));
  }

  // Now press KeyW and ensure motion is normal
  walk.keyDown('KeyW');
  const stepped = walk.step({ x, z }, 0, 0.05);
  assert.ok(stepped.z < z, 'KeyW must move north even after unheld key releases');

  // Double release of KeyW
  walk.keyUp('KeyW');
  walk.keyUp('KeyW');
  const stopped = walk.step(stepped, 0, 0.05);
  assert.deepEqual(stopped, stepped);
});

test('redteam: calling clear() multiple times while moving immediately halts drift', () => {
  const [x, z] = viewpoint(0);
  const walk = createFreeWalk();
  walk.keyDown('KeyW');
  walk.keyDown('ShiftLeft'); // Running

  let cur = { x, z };
  for (let i = 0; i < 10; i++) {
    cur = walk.step(cur, 0, 0.05);
  }
  assert.ok(cur.z < z);

  // Clear repeated times
  walk.clear();
  walk.clear();
  walk.clear();

  // Stepping further must not drift or keep velocity
  const postClear = walk.step(cur, 0, 0.1);
  assert.deepEqual(postClear, cur, 'Position must remain static after clear() without lingering velocity');
});

test('redteam: continuous 10-second run into corner never penetrates solid box or bounds', () => {
  // Start near Library locus 0 (armchair / bookshelf corner)
  const [x, z] = viewpoint(0);
  const walk = createFreeWalk();
  walk.keyDown('KeyW');
  walk.keyDown('KeyA');
  walk.keyDown('ShiftLeft'); // Run into corner at 3.2 m/s

  let cur = { x, z };
  // 200 frames at 50ms = 10 full seconds of running into the corner
  for (let frame = 0; frame < 200; frame++) {
    cur = walk.step(cur, Math.PI / 4, 0.05);
    assert.ok(
      isFree(cur.x, cur.z),
      `Body penetrated geometry at frame ${frame} (${cur.x.toFixed(3)}, ${cur.z.toFixed(3)})`
    );
  }
});

test('redteam: external position jump / teleport immediately re-anchors without dragging old velocity', () => {
  const [startX, startZ] = viewpoint(0);
  const walk = createFreeWalk();
  walk.keyDown('KeyW');
  walk.keyDown('ShiftLeft');

  // Move a few steps
  let pos = walk.step({ x: startX, z: startZ }, 0, 0.05);
  pos = walk.step(pos, 0, 0.05);

  // External teleport to Kitchen locus 13
  const [teleportX, teleportZ] = viewpoint(13);
  walk.clear(); // Release keys before re-anchoring
  const afterTeleport = walk.step({ x: teleportX, z: teleportZ }, 0, 0.05);
  const dist = Math.hypot(afterTeleport.x - teleportX, afterTeleport.z - teleportZ);
  assert.ok(dist < 1e-6, `Teleport must immediately anchor at destination (distance: ${dist})`);
});
