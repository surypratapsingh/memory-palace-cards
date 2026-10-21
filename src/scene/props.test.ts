import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PROP_KINDS, buildProp, disposeProps, type PropMaterials } from './props.ts';

const FOOTPRINTS: Record<string, readonly [number, number, number]> = {
  armchair: [0.95, 0.8, 1.15],
  bookshelf: [1.1, 0.4, 2.0],
  globe: [1.0, 1.0, 1.4],
  globe_celestial: [1.0, 1.0, 1.4],
  fireplace: [1.5, 0.6, 1.3],
  clock: [0.5, 0.45, 2.1],
  desk: [1.4, 0.8, 0.8],
  stove: [0.9, 0.85, 0.95],
  refrigerator: [0.85, 0.9, 2.0],
  cabinet: [1.0, 0.55, 1.5],
  table: [1.2, 0.9, 0.8],
  sink: [1.0, 0.7, 1.3],
  cauldron: [1.0, 1.0, 0.85],
  plant: [0.9, 0.9, 1.55],
  fountain: [1.2, 1.2, 1.35],
  bench: [1.3, 0.5, 1.05],
  planter: [1.1, 0.5, 0.85],
  pedestal: [0.6, 0.6, 1.65],
  telescope: [0.8, 0.6, 1.75],
  armillary: [0.8, 0.8, 1.35],
  orrery: [0.85, 0.85, 1.3],
  astrolabe: [0.85, 0.4, 1.4],
};

function makeMaterials(): PropMaterials {
  return {
    main: new THREE.MeshStandardMaterial(),
    accent: new THREE.MeshStandardMaterial(),
    gold: new THREE.MeshStandardMaterial(),
  };
}

function getMeshes(group: THREE.Group): THREE.Mesh[] {
  return group.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
}

describe('procedural memory-palace props', () => {
  const mats = makeMaterials();

  it('1. builds every kind in PROP_KINDS and returns null for unknown kinds', () => {
    assert.deepEqual([...PROP_KINDS], Object.keys(FOOTPRINTS));
    for (const kind of PROP_KINDS) {
      const group = buildProp(kind, mats);
      assert.ok(group instanceof THREE.Group, `Expected Group for ${kind}`);
    }
    assert.equal(buildProp('sofa', mats), null);
    assert.equal(buildProp('', mats), null);
  });

  it('2. fits footprint within 5% tolerance, fills >= 75% W/H, rests on floor, and is centred on X/Z', () => {
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    for (const kind of PROP_KINDS) {
      const [fw, fd, fh] = FOOTPRINTS[kind]!;
      const group = buildProp(kind, mats);
      assert.ok(group);

      box.setFromObject(group);
      box.getSize(size);
      box.getCenter(center);

      assert.ok(size.x <= fw * 1.05, `${kind} width ${size.x} exceeds ${fw * 1.05}`);
      assert.ok(size.z <= fd * 1.05, `${kind} depth ${size.z} exceeds ${fd * 1.05}`);
      assert.ok(size.y <= fh * 1.05, `${kind} height ${size.y} exceeds ${fh * 1.05}`);

      assert.ok(size.x >= fw * 0.75, `${kind} width ${size.x} below 75% of ${fw}`);
      assert.ok(size.y >= fh * 0.75, `${kind} height ${size.y} below 75% of ${fh}`);

      assert.ok(box.min.y >= -0.001, `${kind} min.y ${box.min.y} < -0.001`);
      assert.ok(Math.abs(center.x) <= 0.05, `${kind} center.x ${center.x} not centred`);
      assert.ok(Math.abs(center.z) <= 0.05, `${kind} center.z ${center.z} not centred`);
    }
  });

  it('3. uses 1 to 3 meshes with only the given materials and <= 2500 triangles', () => {
    const allowed = new Set<THREE.Material>([mats.main, mats.accent, mats.gold]);

    for (const kind of PROP_KINDS) {
      const group = buildProp(kind, mats);
      assert.ok(group);
      const meshes = getMeshes(group);

      assert.ok(meshes.length >= 1 && meshes.length <= 3, `${kind} mesh count ${meshes.length}`);

      let triangles = 0;
      for (const mesh of meshes) {
        assert.ok(!Array.isArray(mesh.material) && allowed.has(mesh.material), `${kind} invalid material`);
        const geo = mesh.geometry;
        const count = geo.index ? geo.index.count : geo.getAttribute('position').count;
        triangles += count / 3;
      }
      assert.ok(triangles > 0 && triangles <= 2500, `${kind} triangles ${triangles} > 2500`);
    }
  });

  it('4. reuses cached geometries across calls while returning new Mesh instances', () => {
    for (const kind of PROP_KINDS) {
      const g1 = buildProp(kind, mats);
      const g2 = buildProp(kind, mats);
      assert.ok(g1 && g2);
      assert.notEqual(g1, g2);

      const m1 = getMeshes(g1);
      const m2 = getMeshes(g2);
      assert.equal(m1.length, m2.length);

      for (let i = 0; i < m1.length; i++) {
        assert.notEqual(m1[i], m2[i]);
        assert.equal(m1[i]!.geometry, m2[i]!.geometry);
      }
    }
  });

  it('5. disposes all cached geometries on disposeProps() and creates fresh ones afterwards', () => {
    const firstGeos = new Map<string, THREE.BufferGeometry[]>();
    const spies: ReturnType<typeof mock.method>[] = [];

    for (const kind of PROP_KINDS) {
      const group = buildProp(kind, mats);
      assert.ok(group);
      const geos = getMeshes(group).map((m) => m.geometry);
      firstGeos.set(kind, geos);
      for (const geo of geos) {
        spies.push(mock.method(geo, 'dispose'));
      }
    }

    disposeProps();

    for (const spy of spies) {
      assert.equal(spy.mock.callCount(), 1);
    }

    for (const kind of PROP_KINDS) {
      const nextGroup = buildProp(kind, mats);
      assert.ok(nextGroup);
      const nextGeos = getMeshes(nextGroup).map((m) => m.geometry);
      const prevGeos = firstGeos.get(kind)!;
      assert.equal(nextGeos.length, prevGeos.length);
      for (let i = 0; i < nextGeos.length; i++) {
        assert.notEqual(nextGeos[i], prevGeos[i]);
      }
    }
  });

  it('6. ensures every geometry has matching position, normal, and uv counts with no NaN positions', () => {
    for (const kind of PROP_KINDS) {
      const group = buildProp(kind, mats);
      assert.ok(group);

      for (const mesh of getMeshes(group)) {
        const pos = mesh.geometry.getAttribute('position');
        const norm = mesh.geometry.getAttribute('normal');
        const uv = mesh.geometry.getAttribute('uv');

        assert.ok(pos instanceof THREE.BufferAttribute, `${kind} missing position`);
        assert.ok(norm instanceof THREE.BufferAttribute, `${kind} missing normal`);
        assert.ok(uv instanceof THREE.BufferAttribute, `${kind} missing uv`);

        assert.ok(pos.count > 0);
        assert.equal(norm.count, pos.count, `${kind} normal count mismatch`);
        assert.equal(uv.count, pos.count, `${kind} uv count mismatch`);

        for (let i = 0; i < pos.array.length; i++) {
          assert.ok(!Number.isNaN(pos.array[i]), `${kind} has NaN at position index ${i}`);
        }
      }
    }
  });
});