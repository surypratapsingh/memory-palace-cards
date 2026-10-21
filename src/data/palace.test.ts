import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOMS,
  DOORS,
  LOCI,
  WALL,
  VIEW_DIST,
  viewpoint,
  isWalkable,
  glidePath,
} from './palace.ts';

test('G1: 52 loci, 13 per room, rooms in route order Library -> Kitchen -> Greenhouse -> Observatory', () => {
  assert.equal(LOCI.length, 52);
  assert.equal(ROOMS.length, 4);
  assert.deepEqual(
    ROOMS.map((r) => r.name),
    ['Library', 'Kitchen', 'Greenhouse', 'Observatory'],
  );

  for (let i = 0; i < 52; i++) {
    assert.equal(LOCI[i].index, i, `LOCI[${i}].index should equal ${i}`);
    const expectedRoom = ROOMS[Math.floor(i / 13)].name;
    assert.equal(LOCI[i].room, expectedRoom, `LOCI[${i}] room mismatch`);
  }
});

test('G2: names unique, (kind, color) unique, adjacent kinds differ, >= 15 kinds', () => {
  const names = new Set(LOCI.map((l) => l.name));
  assert.equal(names.size, 52, 'All 52 locus names must be unique');

  const pairs = new Set(LOCI.map((l) => `${l.kind}:${l.color}`));
  assert.equal(pairs.size, 52, 'All 52 (kind, color) pairs must be unique');

  const kinds = new Set(LOCI.map((l) => l.kind));
  assert.ok(kinds.size >= 15, `Expected >= 15 kinds, found ${kinds.size}`);

  for (let i = 0; i < LOCI.length - 1; i++) {
    assert.notEqual(
      LOCI[i].kind,
      LOCI[i + 1].kind,
      `Adjacent loci ${i} and ${i + 1} share kind ${LOCI[i].kind}`,
    );
  }
});

test('G3: every pair of loci at least 2.0 m apart (1326 pairs)', () => {
  let pairCount = 0;
  let minDistance = Infinity;

  for (let i = 0; i < LOCI.length; i++) {
    for (let j = i + 1; j < LOCI.length; j++) {
      pairCount++;
      const dist = Math.hypot(LOCI[i].pos[0] - LOCI[j].pos[0], LOCI[i].pos[1] - LOCI[j].pos[1]);
      if (dist < minDistance) {
        minDistance = dist;
      }
      assert.ok(
        dist >= 2.0 - 1e-6,
        `Pair (${i}, ${j}) distance ${dist.toFixed(3)}m is under 2.0m`,
      );
    }
  }

  assert.equal(pairCount, 1326, 'Should test exactly 52 * 51 / 2 = 1326 pairs');
  assert.ok(minDistance >= 2.0, `Minimum pairwise distance must be >= 2.0m, got ${minDistance}`);
});

test('G4: |face| = 1 and viewpoint lies inside room shrunk by 0.3 m', () => {
  assert.equal(VIEW_DIST, 1.8);

  for (let i = 0; i < LOCI.length; i++) {
    const l = LOCI[i];
    const room = ROOMS[Math.floor(i / 13)];
    const mag = Math.hypot(l.face[0], l.face[1]);
    assert.ok(
      Math.abs(mag - 1) < 1e-6,
      `Locus ${i} face magnitude ${mag} should be 1`,
    );

    const vp = viewpoint(i);
    assert.ok(
      vp[0] >= room.rect.x0 + 0.3 - 1e-6 &&
        vp[0] <= room.rect.x1 - 0.3 + 1e-6 &&
        vp[1] >= room.rect.z0 + 0.3 - 1e-6 &&
        vp[1] <= room.rect.z1 - 0.3 + 1e-6,
      `Viewpoint ${vp} of locus ${i} outside shrunk room ${room.name}`,
    );
  }
});

test('G5: walkable area and glidePath check every 0.05m', () => {
  assert.equal(WALL, 0.2);

  // Check walkability helper
  assert.ok(isWalkable(7.0, 7.0), 'Room 0 center is walkable');
  assert.ok(!isWalkable(-1.0, 7.0), 'Outside palace is not walkable');
  assert.ok(!isWalkable(0.1, 7.0), 'Inside wall shrink margin is not walkable');

  // Verify door boundary walkability
  const d0 = DOORS[0];
  const d0MidX = (d0.x0 + d0.x1) / 2;
  const d0MidZ = (d0.z0 + d0.z1) / 2;
  assert.ok(isWalkable(d0MidX, d0MidZ), 'Door 0 center must be walkable');

  // Helper to assert every 0.05m along a segment is walkable
  const assertSegmentWalkable = (p1: [number, number], p2: [number, number], tag: string) => {
    const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(1, Math.ceil(dist / 0.05));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const x = p1[0] + (p2[0] - p1[0]) * t;
      const z = p1[1] + (p2[1] - p1[1]) * t;
      assert.ok(isWalkable(x, z), `${tag}: point (${x.toFixed(3)}, ${z.toFixed(3)}) at t=${t.toFixed(2)} must be walkable`);
    }
  };

  // Consecutive loci
  for (let i = 0; i < 51; i++) {
    const path = glidePath(i, i + 1);
    for (let s = 0; s < path.length - 1; s++) {
      assertSegmentWalkable(path[s], path[s + 1], `glidePath(${i}, ${i + 1}) segment ${s}`);
    }
  }

  // glidePath(51, 0)
  const path51to0 = glidePath(51, 0);
  assert.ok(path51to0.length > 2, 'glidePath(51, 0) must pass through doors');
  for (let s = 0; s < path51to0.length - 1; s++) {
    assertSegmentWalkable(path51to0[s], path51to0[s + 1], `glidePath(51, 0) segment ${s}`);
  }

  // glidePath(0, 51)
  const path0to51 = glidePath(0, 51);
  for (let s = 0; s < path0to51.length - 1; s++) {
    assertSegmentWalkable(path0to51[s], path0to51[s + 1], `glidePath(0, 51) segment ${s}`);
  }

  // glidePath(i, i)
  for (let i = 0; i < 52; i += 7) {
    const selfPath = glidePath(i, i);
    assert.deepEqual(selfPath[0], viewpoint(i));
    assert.deepEqual(selfPath[selfPath.length - 1], viewpoint(i));
  }
});

test('G6: inside each room route goes around once in same turn direction <= 360 deg', () => {
  for (let r = 0; r < 4; r++) {
    const room = ROOMS[r];
    const cx = (room.rect.x0 + room.rect.x1) / 2;
    const cz = (room.rect.z0 + room.rect.z1) / 2;
    let totalTurn = 0;
    let expectedSign = 0;

    for (let i = 0; i < 12; i++) {
      const idx1 = r * 13 + i;
      const idx2 = r * 13 + i + 1;
      const p1 = LOCI[idx1].pos;
      const p2 = LOCI[idx2].pos;

      const a1 = Math.atan2(p1[1] - cz, p1[0] - cx);
      const a2 = Math.atan2(p2[1] - cz, p2[0] - cx);
      const diff = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));

      assert.notEqual(diff, 0, `Angular change between ${idx1} and ${idx2} cannot be zero`);
      const sign = Math.sign(diff);
      if (expectedSign === 0) {
        expectedSign = sign;
      } else {
        assert.equal(
          sign,
          expectedSign,
          `Room ${room.name}: turn direction changed between locus ${idx1} and ${idx2}`,
        );
      }

      totalTurn += Math.abs(diff);
    }

    assert.ok(
      totalTurn <= 2 * Math.PI + 1e-6,
      `Room ${room.name}: total turn ${(totalTurn * 180 / Math.PI).toFixed(1)}° exceeds 360°`,
    );
  }
});
