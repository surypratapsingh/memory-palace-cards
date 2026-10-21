import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, DOORS, LOCI, viewpoint } from '../data/palace.ts';
import { rng } from '../deck.ts';
import {
  BODY_RADIUS,
  solidBoxes,
  isFree,
  moveBody,
  nearestFree,
  type Box2,
} from './collide.ts';

const FOOTPRINTS: Readonly<Record<string, readonly [number, number]>> = {
  armchair: [0.95, 0.8],
  bookshelf: [1.1, 0.4],
  globe: [1.0, 1.0],
  globe_celestial: [1.0, 1.0],
  fireplace: [1.5, 0.6],
  clock: [0.5, 0.45],
  desk: [1.4, 0.8],
  stove: [0.9, 0.85],
  refrigerator: [0.85, 0.9],
  cabinet: [1.0, 0.55],
  table: [1.2, 0.9],
  sink: [1.0, 0.7],
  cauldron: [1.0, 1.0],
  plant: [0.9, 0.9],
  fountain: [1.2, 1.2],
  bench: [1.3, 0.5],
  planter: [1.1, 0.5],
  pedestal: [0.6, 0.6],
  telescope: [0.8, 0.6],
  armillary: [0.8, 0.8],
  orrery: [0.85, 0.85],
  astrolabe: [0.85, 0.4],
};

test('1. every viewpoint(i) and every door centre is free', () => {
  const boxes = solidBoxes();
  assert.equal(LOCI.length, 52);

  for (let i = 0; i < LOCI.length; i++) {
    const [vx, vz] = viewpoint(i);
    assert.equal(
      isFree(vx, vz, boxes),
      true,
      `Expected viewpoint(${i}) at (${vx}, ${vz}) for ${LOCI[i].kind} to be free`,
    );
  }

  for (let i = 0; i < DOORS.length; i++) {
    const d = DOORS[i];
    const cx = (d.x0 + d.x1) / 2;
    const cz = (d.z0 + d.z1) / 2;
    assert.equal(
      isFree(cx, cz, boxes),
      true,
      `Expected door ${i} centre (${cx}, ${cz}) to be free`,
    );
  }
});

test('2. solidBoxes has wall gaps at the doors: walking from (7, 7) along z = 7 in 0.1 m steps reaches x > 50', () => {
  let x = 7;
  let z = 7;
  for (let step = 0; step < 500; step++) {
    [x, z] = moveBody(x, z, 0.1, 0);
  }
  assert.ok(x > 50, `Expected walk along z = 7 to pass all doors and reach x > 50, got x = ${x}`);
  assert.ok(Math.abs(z - 7) < 0.5);
});

test('3. walking from (7, 2) along z = 2 in 0.1 m steps stops before x = 14 (no door there)', () => {
  let x = 7;
  let z = 2;
  for (let step = 0; step < 150; step++) {
    [x, z] = moveBody(x, z, 0.1, 0);
  }
  assert.ok(x < 14, `Expected wall at x = 14 to block walk along z = 2, got x = ${x}`);
  assert.ok(isFree(x, z));
});

test('4. sliding: walking at 45 degrees into a wall keeps at least 90% of tangential movement', () => {
  const wallBox: Box2 = { x0: 13.9, z0: 0, x1: 14.1, z1: 14 };
  const startX = 13.9 - BODY_RADIUS - 0.01;
  const startZ = 4.0;
  const move = 0.8;

  const [endX, endZ] = moveBody(startX, startZ, move, move, [wallBox]);
  const actualZ = endZ - startZ;

  assert.ok(endX <= 13.9 - BODY_RADIUS + 1e-5, `Should not penetrate wall at x=13.9, got ${endX}`);
  assert.ok(
    actualZ >= 0.9 * move,
    `Expected tangential slide >= ${0.9 * move}, got ${actualZ}`,
  );
  assert.equal(isFree(endX, endZ, [wallBox]), true);
});

test('5. inside corner: pushing into a corner for 100 steps ends at one point without jitter (< 1e-9)', () => {
  let x = 1.5;
  let z = 1.5;
  const history: [number, number][] = [];

  for (let i = 0; i < 100; i++) {
    [x, z] = moveBody(x, z, -0.05, -0.05);
    history.push([x, z]);
  }

  const [lastX, lastZ] = history[history.length - 1];
  assert.equal(isFree(lastX, lastZ), true);

  for (let i = history.length - 10; i < history.length; i++) {
    const [hx, hz] = history[i];
    const diff = Math.hypot(hx - lastX, hz - lastZ);
    assert.ok(
      diff <= 1e-9,
      `Expected no jitter in last 10 steps, step ${i} differed by ${diff}`,
    );
  }
});

test('6. tunnelling: a single moveBody with dx = 2 towards a 0.2 m wall 0.5 m away does not pass it', () => {
  const startX = 13.9 - 0.5;
  const startZ = 2.0;
  const [endX, endZ] = moveBody(startX, startZ, 2.0, 0);

  assert.ok(
    endX <= 13.9 - BODY_RADIUS + 1e-5,
    `Expected body to stop before wall at x = 13.9, got endX = ${endX}`,
  );
  assert.equal(isFree(endX, endZ), true);
});

test('7. fuzz: 20 000 random moves from random free starts are always free and only change room within door z range', () => {
  const rand = rng('collide-fuzz-20000');
  const boxes = solidBoxes();

  const freeStarts: [number, number][] = [];
  while (freeStarts.length < 250) {
    const r = ROOMS[Math.floor(rand() * ROOMS.length)].rect;
    const x = r.x0 + 0.5 + rand() * (r.x1 - r.x0 - 1.0);
    const z = r.z0 + 0.5 + rand() * (r.z1 - r.z0 - 1.0);
    if (isFree(x, z, boxes)) {
      freeStarts.push([x, z]);
    }
  }

  const roomIndexAt = (x: number): number => {
    if (x < 14.25) return 0;
    if (x < 28.75) return 1;
    if (x < 43.25) return 2;
    return 3;
  };

  const inAnyDoorZ = (z: number): boolean =>
    DOORS.some((d) => z >= d.z0 && z <= d.z1);

  let [curX, curZ] = freeStarts[0];

  for (let i = 0; i < 20_000; i++) {
    // Mix continuous walks and fresh random starts.
    if (i % 40 === 0) {
      [curX, curZ] = freeStarts[Math.floor(rand() * freeStarts.length)];
    }
    const dx = (rand() * 2 - 1) * 1.0;
    const dz = (rand() * 2 - 1) * 1.0;

    const prevRoom = roomIndexAt(curX);
    const [nextX, nextZ] = moveBody(curX, curZ, dx, dz, boxes);
    const nextRoom = roomIndexAt(nextX);

    assert.equal(
      isFree(nextX, nextZ, boxes),
      true,
      `Fuzz move ${i} ended at non-free point (${nextX}, ${nextZ})`,
    );

    if (nextRoom !== prevRoom) {
      assert.ok(
        inAnyDoorZ(curZ) && inAnyDoorZ(nextZ),
        `Room changed from ${prevRoom} to ${nextRoom} outside door z: z0=${curZ}, z1=${nextZ}`,
      );
    }

    curX = nextX;
    curZ = nextZ;
  }
});

test('8. push-out: starting inside any locus footprint ends free and within 1.6 m of the start', () => {
  const boxes = solidBoxes();

  for (let i = 0; i < LOCI.length; i++) {
    const [lx, lz] = LOCI[i].pos;
    assert.equal(isFree(lx, lz, boxes), false, `Locus ${i} centre should not be free`);

    const [px, pz] = moveBody(lx, lz, 0, 0, boxes);
    const dist = Math.hypot(px - lx, pz - lz);

    assert.equal(
      isFree(px, pz, boxes),
      true,
      `Push-out for locus ${i} (${LOCI[i].kind}) did not end at a free point`,
    );
    assert.ok(
      dist <= 1.6,
      `Push-out for locus ${i} (${LOCI[i].kind}) moved ${dist} m (> 1.6 m)`,
    );
  }
});

test('9. nearestFree returns the input when already free, and a nearby free point otherwise', () => {
  const boxes = solidBoxes();
  const [vx, vz] = viewpoint(0);
  const [fx, fz] = nearestFree(vx, vz, boxes);
  assert.equal(fx, vx);
  assert.equal(fz, vz);

  for (let i = 0; i < LOCI.length; i += 4) {
    const [lx, lz] = LOCI[i].pos;
    const [nx, nz] = nearestFree(lx, lz, boxes);
    assert.equal(isFree(nx, nz, boxes), true);
    assert.ok(Math.hypot(nx - lx, nz - lz) <= 1.6);
  }
});

test('10. each locus footprint blocks: walking straight from its viewpoint towards pos stops at least BODY_RADIUS from raw footprint', () => {
  const boxes = solidBoxes();

  for (let i = 0; i < LOCI.length; i++) {
    const locus = LOCI[i];
    const [vx, vz] = viewpoint(i);
    const [px, pz] = locus.pos;

    let x = vx;
    let z = vz;
    const toPosX = px - vx;
    const toPosZ = pz - vz;
    const len = Math.hypot(toPosX, toPosZ);
    const stepX = (toPosX / len) * 0.05;
    const stepZ = (toPosZ / len) * 0.05;

    for (let s = 0; s < 50; s++) {
      [x, z] = moveBody(x, z, stepX, stepZ, boxes);
    }

    const [width, depth] = FOOTPRINTS[locus.kind];
    const fx = Math.abs(locus.face[0]);
    const fz = Math.abs(locus.face[1]);
    const halfX = (fx * depth + fz * width) / 2;
    const halfZ = (fz * depth + fx * width) / 2;

    const cx = Math.max(px - halfX, Math.min(x, px + halfX));
    const cz = Math.max(pz - halfZ, Math.min(z, pz + halfZ));
    const distToRawFootprint = Math.hypot(x - cx, z - cz);

    assert.ok(
      distToRawFootprint >= BODY_RADIUS - 1e-6,
      `Locus ${i} (${locus.kind}): stopped at ${distToRawFootprint} m < BODY_RADIUS (${BODY_RADIUS})`,
    );
    assert.equal(isFree(x, z, boxes), true);
  }
});

test('11. solidBoxes caches and returns the same array reference on repeated calls', () => {
  const first = solidBoxes();
  const second = solidBoxes();
  assert.equal(first, second);
  assert.ok(first.length > 52);
});