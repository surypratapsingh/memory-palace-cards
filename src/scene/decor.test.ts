import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ROOMS, DOORS, LOCI, EYE_HEIGHT, viewpoint, glidePath } from '../data/palace.ts';
import { decorLayout, buildDecor } from './decor.ts';
import type { DecorItem } from './decor.ts';

function dist2DPointToAABB(
  px: number,
  pz: number,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
): number {
  const dx = px < minX ? minX - px : px > maxX ? px - maxX : 0;
  const dz = pz < minZ ? minZ - pz : pz > maxZ ? pz - maxZ : 0;
  return Math.hypot(dx, dz);
}

function rectsTouchOrOverlap(
  ax0: number,
  az0: number,
  ax1: number,
  az1: number,
  bx0: number,
  bz0: number,
  bx1: number,
  bz1: number,
): boolean {
  return ax0 <= bx1 && ax1 >= bx0 && az0 <= bz1 && az1 >= bz0;
}

function segmentIntersectsAABB3D(
  p0: [number, number, number],
  p1: [number, number, number],
  min: [number, number, number],
  max: [number, number, number],
): boolean {
  let tMin = 0;
  let tMax = 1;
  for (let axis = 0; axis < 3; axis++) {
    const s = p0[axis]!;
    const d = p1[axis]! - s;
    const bMin = min[axis]!;
    const bMax = max[axis]!;
    if (Math.abs(d) < 1e-9) {
      if (s < bMin || s > bMax) return false;
    } else {
      let t1 = (bMin - s) / d;
      let t2 = (bMax - s) / d;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

test('Rule 1: Every item lies strictly within its room bounds and height 0..4', () => {
  const items = decorLayout();
  assert.ok(items.length > 0);
  for (const item of items) {
    const room = ROOMS[item.room];
    assert.ok(room, `Invalid room ${item.room}`);
    const { x0, z0, x1, z1 } = room.rect;
    assert.ok(item.min[0] >= x0 + 0.2, `${item.kind} min.x < x0 + 0.2`);
    assert.ok(item.max[0] <= x1 - 0.2, `${item.kind} max.x > x1 - 0.2`);
    assert.ok(item.min[2] >= z0 + 0.2, `${item.kind} min.z < z0 + 0.2`);
    assert.ok(item.max[2] <= z1 - 0.2, `${item.kind} max.z > z1 - 0.2`);
    assert.ok(item.min[1] >= 0, `${item.kind} min.y < 0`);
    assert.ok(item.max[1] <= 4.0, `${item.kind} max.y > 4.0`);
    assert.ok(item.min[0] < item.max[0] && item.min[1] < item.max[1] && item.min[2] < item.max[2]);
  }
});

test('Rule 2: Floor items have max.y <= 0.03 and receiveShadow = true', () => {
  const items = decorLayout().filter((i) => i.zone === 'floor');
  assert.ok(items.length >= 4);
  for (const item of items) {
    assert.ok(item.max[1] <= 0.03, `Floor item ${item.kind} max.y = ${item.max[1]} > 0.03`);
  }
  const built = buildDecor();
  try {
    built.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        assert.equal(obj.receiveShadow, true);
      }
    });
  } finally {
    built.dispose();
  }
});

test('Rule 3: Ceiling items have min.y >= 2.6 and castShadow = false', () => {
  const items = decorLayout().filter((i) => i.zone === 'ceiling');
  assert.ok(items.length >= 4);
  for (const item of items) {
    assert.ok(item.min[1] >= 2.6, `Ceiling item ${item.kind} min.y = ${item.min[1]} < 2.6`);
  }
  const built = buildDecor();
  try {
    built.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        assert.equal(obj.castShadow, false);
      }
    });
  } finally {
    built.dispose();
  }
});

test('Rule 4: Wall items lie within 0.7 m of a wall, >= 1.0 m from loci, and >= 1.0 m from doors', () => {
  const items = decorLayout();
  for (const item of items) {
    if (item.zone !== 'wall') continue;
    assert.ok(item.max[1] > 0.03 && item.min[1] < 2.6);
    const { x0, z0, x1, z1 } = ROOMS[item.room]!.rect;
    const nearLeft = item.max[0] <= x0 + 0.7;
    const nearRight = item.min[0] >= x1 - 0.7;
    const nearNorth = item.max[2] <= z0 + 0.7;
    const nearSouth = item.min[2] >= z1 - 0.7;
    assert.ok(
      nearLeft || nearRight || nearNorth || nearSouth,
      `Wall item ${item.kind} in room ${item.room} not within 0.7 m of a wall`,
    );

    for (const locus of LOCI) {
      const d = dist2DPointToAABB(
        locus.pos[0],
        locus.pos[1],
        item.min[0],
        item.min[2],
        item.max[0],
        item.max[2],
      );
      assert.ok(d >= 1.0, `Wall item ${item.kind} too close (${d.toFixed(3)} m) to locus ${locus.index}`);
    }

    for (const door of DOORS) {
      const touches = rectsTouchOrOverlap(
        item.min[0],
        item.min[2],
        item.max[0],
        item.max[2],
        door.x0 - 1.0,
        door.z0 - 1.0,
        door.x1 + 1.0,
        door.z1 + 1.0,
      );
      assert.equal(touches, false, `Wall item ${item.kind} touches door grown by 1.0 m`);
    }
  }
});

test('Rule 5: Clear route along glidePath(i, j) sampled every 0.1 m (>= 0.45 m from wall items)', () => {
  const wallItems = decorLayout().filter((i) => i.zone === 'wall');
  for (let i = 0; i < LOCI.length; i++) {
    for (let j = i + 1; j < LOCI.length; j++) {
      const path = glidePath(i, j);
      for (let s = 0; s < path.length - 1; s++) {
        const [ax, az] = path[s]!;
        const [bx, bz] = path[s + 1]!;
        const segLen = Math.hypot(bx - ax, bz - az);
        const steps = Math.max(1, Math.ceil(segLen / 0.1));
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const px = ax + (bx - ax) * t;
          const pz = az + (bz - az) * t;
          for (const item of wallItems) {
            const d = dist2DPointToAABB(
              px,
              pz,
              item.min[0],
              item.min[2],
              item.max[0],
              item.max[2],
            );
            assert.ok(
              d >= 0.45,
              `glidePath(${i}, ${j}) sample (${px.toFixed(2)}, ${pz.toFixed(2)}) is ${d.toFixed(3)} m from ${item.kind}`,
            );
          }
        }
      }
    }
  }
});

test('Rule 6: Clear sight from viewpoint(i) at eye height to locus pos at h = 0.3, 1.0, 1.8', () => {
  const blockers = decorLayout().filter((i) => i.zone === 'wall' || i.zone === 'ceiling');
  const heights = [0.3, 1.0, 1.8];
  for (let i = 0; i < LOCI.length; i++) {
    const locus = LOCI[i]!;
    const vp = viewpoint(i);
    const p0: [number, number, number] = [vp[0], EYE_HEIGHT, vp[1]];
    for (const h of heights) {
      const p1: [number, number, number] = [locus.pos[0], h, locus.pos[1]];
      for (const item of blockers) {
        const hit = segmentIntersectsAABB3D(p0, p1, item.min, item.max);
        assert.equal(hit, false, `Sightline for locus ${i} (h=${h}) blocked by ${item.kind}`);
      }
    }
  }
});

test('Rule 7: No item with min.y < 2.8 touches a door rect grown by 0.5 m', () => {
  const items = decorLayout();
  for (const item of items) {
    if (item.min[1] >= 2.8) continue;
    for (const door of DOORS) {
      const touches = rectsTouchOrOverlap(
        item.min[0],
        item.min[2],
        item.max[0],
        item.max[2],
        door.x0 - 0.5,
        door.z0 - 0.5,
        door.x1 + 0.5,
        door.z1 + 0.5,
      );
      assert.equal(touches, false, `Item ${item.kind} (min.y=${item.min[1]}) touches grown door`);
    }
  }
});

test('Rule 8: Every mesh vertex lies inside the AABB of an item of its room (tolerance 0.01 m)', () => {
  const items = decorLayout();
  const built = buildDecor();
  const tol = 0.01;
  const hitCounts = new Array<number>(items.length).fill(0);

  try {
    built.root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    built.root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const pos = obj.geometry.getAttribute('position');
      assert.ok(pos && pos.count > 0);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
        let matched = false;
        for (let idx = 0; idx < items.length; idx++) {
          const item: DecorItem = items[idx]!;
          if (
            v.x >= item.min[0] - tol &&
            v.x <= item.max[0] + tol &&
            v.y >= item.min[1] - tol &&
            v.y <= item.max[1] + tol &&
            v.z >= item.min[2] - tol &&
            v.z <= item.max[2] + tol
          ) {
            matched = true;
            hitCounts[idx]!++;
            break;
          }
        }
        assert.ok(
          matched,
          `Vertex (${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}) outside all item AABBs`,
        );
      }
    });

    for (let idx = 0; idx < items.length; idx++) {
      assert.ok(hitCounts[idx]! > 0, `Item ${idx} (${items[idx]!.kind}) has no vertices`);
    }
  } finally {
    built.dispose();
  }
});

test('Budget: <= 12 meshes, <= 40000 triangles, <= 8 materials, no lights, no textures', () => {
  const built = buildDecor();
  try {
    let meshCount = 0;
    let triangleCount = 0;
    const materials = new Set<THREE.Material>();

    built.root.traverse((obj) => {
      assert.equal(obj instanceof THREE.Light, false, 'No Light objects allowed in buildDecor');
      if (obj instanceof THREE.Mesh) {
        meshCount++;
        const geom = obj.geometry;
        const count = geom.index ? geom.index.count : geom.getAttribute('position').count;
        triangleCount += count / 3;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          materials.add(m);
          if (m instanceof THREE.MeshStandardMaterial) {
            assert.equal(m.map, null);
            assert.equal(m.normalMap, null);
            assert.equal(m.roughnessMap, null);
            assert.equal(m.metalnessMap, null);
            assert.equal(m.emissiveMap, null);
            assert.equal(m.aoMap, null);
            assert.ok(m.emissiveIntensity <= 1.5);
          }
        }
      }
    });

    assert.ok(meshCount >= 1 && meshCount <= 12, `Mesh count ${meshCount} exceeds budget 12`);
    assert.ok(triangleCount <= 40000, `Triangle count ${triangleCount} exceeds budget 40000`);
    assert.ok(materials.size >= 1 && materials.size <= 8, `Material count ${materials.size} exceeds 8`);
  } finally {
    built.dispose();
  }
});

test('dispose() disposes every geometry and material and is idempotent on second call', () => {
  const built = buildDecor();
  const geomSpies: number[] = [];
  const matSpies: number[] = [];
  const seenGeoms = new Set<THREE.BufferGeometry>();
  const seenMats = new Set<THREE.Material>();

  built.root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!seenGeoms.has(obj.geometry)) {
      seenGeoms.add(obj.geometry);
      const idx = geomSpies.push(0) - 1;
      const orig = obj.geometry.dispose.bind(obj.geometry);
      obj.geometry.dispose = () => {
        geomSpies[idx]!++;
        orig();
      };
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!seenMats.has(m)) {
        seenMats.add(m);
        const idx = matSpies.push(0) - 1;
        const orig = m.dispose.bind(m);
        m.dispose = () => {
          matSpies[idx]!++;
          orig();
        };
      }
    }
  });

  built.dispose();
  assert.ok(geomSpies.length > 0 && geomSpies.every((c) => c === 1));
  assert.ok(matSpies.length > 0 && matSpies.every((c) => c === 1));
  assert.doesNotThrow(() => built.dispose());
});

test('Determinism: two decorLayout() calls return deep-equal results', () => {
  const first = decorLayout();
  const second = decorLayout();
  assert.deepStrictEqual(first, second);
});

test('Room coverage and non-competing kinds: >= 4 items and all 3 zones per room, no locus kinds', () => {
  const items = decorLayout();
  const locusKinds = new Set(LOCI.map((l) => l.kind));

  for (const item of items) {
    assert.equal(locusKinds.has(item.kind), false, `Decor kind ${item.kind} collides with locus kind`);
  }

  for (let r = 0; r < ROOMS.length; r++) {
    const roomItems = items.filter((i) => i.room === r);
    assert.ok(roomItems.length >= 4, `Room ${r} has fewer than 4 items`);
    const zones = new Set(roomItems.map((i) => i.zone));
    assert.equal(zones.has('floor'), true, `Room ${r} missing floor item`);
    assert.equal(zones.has('ceiling'), true, `Room ${r} missing ceiling item`);
    assert.equal(zones.has('wall'), true, `Room ${r} missing wall item`);
  }
});