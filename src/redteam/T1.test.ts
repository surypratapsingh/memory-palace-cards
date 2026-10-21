import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DOORS,
  LOCI,
  ROOMS,
  VIEW_DIST,
  WALL,
  glidePath,
  isWalkable,
  viewpoint,
} from '../data/palace.ts';
import { lerpAngle } from '../scene/ease.ts';

function sampledPathIsWalkable(path: readonly [number, number][]): void {
  for (let segment = 0; segment < path.length - 1; segment++) {
    const from = path[segment];
    const to = path[segment + 1];
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const samples = Math.max(1, Math.ceil(distance / 0.05));
    for (let sample = 0; sample <= samples; sample++) {
      const t = sample / samples;
      const x = from[0] + (to[0] - from[0]) * t;
      const z = from[1] + (to[1] - from[1]) * t;
      assert.ok(isWalkable(x, z), `blocked at (${x.toFixed(4)}, ${z.toFixed(4)})`);
    }
  }
}

function angularDifference(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

test('red-team G3: every independent locus pair is at least 2 metres apart', () => {
  let count = 0;
  for (let left = 0; left < LOCI.length; left++) {
    for (let right = left + 1; right < LOCI.length; right++) {
      count++;
      const dx = LOCI[left].pos[0] - LOCI[right].pos[0];
      const dz = LOCI[left].pos[1] - LOCI[right].pos[1];
      assert.ok(Math.hypot(dx, dz) >= 2, `loci ${left} and ${right} are too close`);
    }
  }
  assert.equal(count, 1326);
});

test('red-team G4: every facing vector and camera viewpoint obey the room bounds', () => {
  for (const locus of LOCI) {
    assert.ok(Math.abs(Math.hypot(...locus.face) - 1) <= 1e-6, `locus ${locus.index} face is not unit length`);
    const [x, z] = viewpoint(locus.index);
    assert.ok(Math.abs(x - (locus.pos[0] + VIEW_DIST * locus.face[0])) <= 1e-6);
    assert.ok(Math.abs(z - (locus.pos[1] + VIEW_DIST * locus.face[1])) <= 1e-6);
    const room = ROOMS.find((candidate) => candidate.name === locus.room);
    assert.ok(room, `locus ${locus.index} references an unknown room`);
    assert.ok(x >= room.rect.x0 + 0.3 - 1e-6 && x <= room.rect.x1 - 0.3 + 1e-6, `locus ${locus.index} viewpoint outside room x bounds`);
    assert.ok(z >= room.rect.z0 + 0.3 - 1e-6 && z <= room.rect.z1 - 0.3 + 1e-6, `locus ${locus.index} viewpoint outside room z bounds`);
  }
});

test('red-team G5: every ordered pair glide path stays walkable at 5 cm intervals', () => {
  for (let from = 0; from < LOCI.length; from++) {
    for (let to = 0; to < LOCI.length; to++) {
      sampledPathIsWalkable(glidePath(from, to));
    }
  }
});

test('red-team path edges: self paths and both full-route directions retain their endpoints', () => {
  for (let index = 0; index < LOCI.length; index++) {
    const path = glidePath(index, index);
    assert.equal(path.length, 2);
    assert.deepEqual(path[0], viewpoint(index));
    assert.deepEqual(path[1], viewpoint(index));
  }

  const forward = glidePath(0, 51);
  const reverse = glidePath(51, 0);
  assert.equal(forward.length, DOORS.length + 2);
  assert.equal(reverse.length, DOORS.length + 2);
  assert.deepEqual(forward[0], viewpoint(0));
  assert.deepEqual(forward.at(-1), viewpoint(51));
  assert.deepEqual(reverse[0], viewpoint(51));
  assert.deepEqual(reverse.at(-1), viewpoint(0));
  sampledPathIsWalkable(forward);
  sampledPathIsWalkable(reverse);
});

test('red-team walkability boundaries: wall margins and door edges are intentional', () => {
  const firstRoom = ROOMS[0].rect;
  const wallLineX = firstRoom.x0 + WALL;
  assert.equal(isWalkable(wallLineX, 7), true);
  assert.equal(isWalkable(wallLineX - 1e-6, 7), false);

  const firstDoor = DOORS[0];
  const doorMidX = (firstDoor.x0 + firstDoor.x1) / 2;
  const doorMidZ = (firstDoor.z0 + firstDoor.z1) / 2;
  assert.equal(isWalkable(doorMidX, firstDoor.z0), true);
  assert.equal(isWalkable(doorMidX, firstDoor.z0 - 1e-6), false);
  assert.equal(isWalkable(doorMidX, firstDoor.z1), true);
  assert.equal(isWalkable(doorMidX, firstDoor.z1 + 1e-6), false);
  assert.equal(isWalkable(firstDoor.x0, doorMidZ), true);
  assert.equal(isWalkable(firstDoor.x1, doorMidZ), true);
});

test('red-team lerpAngle: equal, opposite, large-turn, and endpoint cases', () => {
  const same = 9.5 * Math.PI;
  assert.ok(Math.abs(lerpAngle(same, same, 0.37) - same) <= 1e-12);
  assert.ok(Math.abs(lerpAngle(0, Math.PI, 0.5) - Math.PI / 2) <= 1e-12);
  assert.ok(Math.abs(lerpAngle(0, -Math.PI, 0.5) + Math.PI / 2) <= 1e-12);

  const largeFrom = 7 * Math.PI + 0.4;
  const largeTo = -5 * Math.PI + 0.8;
  assert.ok(Math.abs(angularDifference(largeFrom, lerpAngle(largeFrom, largeTo, 0)) - 0) <= 1e-12);
  assert.ok(Math.abs(angularDifference(largeFrom, lerpAngle(largeFrom, largeTo, 1)) - angularDifference(largeFrom, largeTo)) <= 1e-12);
  const midpoint = lerpAngle(largeFrom, largeTo, 0.5);
  assert.ok(Math.abs(angularDifference(largeFrom, midpoint) - angularDifference(largeFrom, largeTo) / 2) <= 1e-12);
});
