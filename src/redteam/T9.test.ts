import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LOCI, EYE_HEIGHT, viewpoint, isWalkable, DOORS } from '../data/palace.ts';
import { PROP_KINDS, buildProp, disposeProps } from '../scene/props.ts';
import { buildDecor, decorLayout } from '../scene/decor.ts';
import { TEXTURE_KINDS, TILE_METERS, generate, scaleUVs } from '../scene/textures.ts';
import { buildPalaceWorld } from '../scene/palaceWorld.ts';
import { buildAtmosphere } from '../scene/atmosphere.ts';

test('T9 redteam: every released locus kind resolves to a non-empty procedural prop with contract materials', () => {
  const mats = {
    main: new THREE.MeshStandardMaterial(),
    accent: new THREE.MeshStandardMaterial(),
    gold: new THREE.MeshStandardMaterial(),
  };
  try {
    for (const locus of LOCI) {
      assert.ok(PROP_KINDS.includes(locus.kind), `No prop builder for ${locus.kind}`);
      const group = buildProp(locus.kind, mats);
      assert.ok(group, `No built prop for ${locus.kind}`);
      assert.ok(group.children.length > 0, `Empty prop for ${locus.kind}`);
      let meshes = 0;
      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        meshes++;
        assert.ok(child.material === mats.main || child.material === mats.accent || child.material === mats.gold);
      });
      assert.ok(meshes > 0, `No prop mesh for ${locus.kind}`);
      const [x, z] = viewpoint(locus.index);
      assert.equal(isWalkable(x, z), true, `Viewpoint ${locus.index} outside walkable area`);
    }
  } finally {
    disposeProps();
    for (const mat of Object.values(mats)) mat.dispose();
  }
});

test('T9 redteam: world, decor and atmosphere disposal are repeatable; caches can regenerate after world disposal', () => {
  const world = buildPalaceWorld();
  assert.doesNotThrow(() => world.dispose());
  assert.doesNotThrow(() => world.dispose());
  const regenerated = generate('library-floor', 64, 't9-redteam');
  assert.equal(regenerated.size, 64);
  assert.equal(regenerated.color.length, 64 * 64 * 4);

  const renderer = {
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 1,
    shadowMap: { enabled: false, type: THREE.BasicShadowMap },
  } as unknown as THREE.WebGLRenderer;
  const scene = new THREE.Scene();
  const atmosphere = buildAtmosphere(renderer, scene, { casters: [], receivers: [], lamps: [] });
  assert.doesNotThrow(() => atmosphere.dispose());
  assert.doesNotThrow(() => atmosphere.dispose());
  assert.equal(scene.children.length, 0);
});

test('T9 redteam: decorative geometry stays within a declared item AABB', () => {
  const built = buildDecor();
  const items = decorLayout();
  try {
    built.root.updateMatrixWorld(true);
    built.root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const position = obj.geometry.getAttribute('position');
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(obj.matrixWorld);
        assert.ok(items.some((item) =>
          v.x >= item.min[0] - 0.01 && v.x <= item.max[0] + 0.01 &&
          v.y >= item.min[1] - 0.01 && v.y <= item.max[1] + 0.01 &&
          v.z >= item.min[2] - 0.01 && v.z <= item.max[2] + 0.01
        ), `Out-of-bounds decor vertex: ${v.toArray()}`);
      }
    });
  } finally {
    built.dispose();
  }
});

test('T9 redteam: texture generators return finite byte buffers and positive repeat scales', () => {
  assert.equal(TEXTURE_KINDS.length, 8);
  for (const kind of TEXTURE_KINDS) {
    const generated = generate(kind, 32, `adversarial:${kind}`);
    assert.equal(generated.color.length, 32 * 32 * 4);
    assert.equal(generated.bump.length, 32 * 32 * 4);
    for (const channel of generated.color) assert.ok(Number.isFinite(channel) && channel >= 0 && channel <= 255);
    for (const channel of generated.bump) assert.ok(Number.isFinite(channel) && channel >= 0 && channel <= 255);
    assert.ok(TILE_METERS[kind] > 0 && Number.isFinite(TILE_METERS[kind]));
    const geometry = new THREE.PlaneGeometry(14, 4);
    scaleUVs(geometry, 14, 4, TILE_METERS[kind]);
    for (const value of geometry.getAttribute('uv').array) assert.ok(Number.isFinite(value));
    geometry.dispose();
  }
});

test('T9 redteam: lower sight rays to all loci are clear of non-floor decor and doors remain passable', () => {
  const items = decorLayout().filter((item) => item.zone !== 'floor');
  for (let i = 0; i < LOCI.length; i++) {
    const [vx, vz] = viewpoint(i);
    const locus = LOCI[i]!;
    const from = new THREE.Vector3(vx, EYE_HEIGHT, vz);
    const to = new THREE.Vector3(locus.pos[0], 0.3, locus.pos[1]);
    const ray = new THREE.Ray(from, to.clone().sub(from).normalize());
    const distance = from.distanceTo(to);
    for (const item of items) {
      const hit = ray.intersectBox(new THREE.Box3(new THREE.Vector3(...item.min), new THREE.Vector3(...item.max)), new THREE.Vector3());
      assert.ok(!hit || hit.distance >= distance - 1e-5, `Locus ${i} low sightline blocked by ${item.kind}`);
    }
  }
  for (const door of DOORS) {
    for (const item of items) {
      const overlapsDoor = item.min[0] <= door.x1 && item.max[0] >= door.x0 &&
        item.min[2] <= door.z1 && item.max[2] >= door.z0 && item.min[1] < 2.8;
      assert.equal(overlapsDoor, false, `Decor ${item.kind} obstructs door ${door.x0}-${door.x1}`);
    }
  }
});

test('T9 redteam: prop geometry is cached per kind and cache disposal/rebuild works for every builder', () => {
  const mats = {
    main: new THREE.MeshStandardMaterial(),
    accent: new THREE.MeshStandardMaterial(),
    gold: new THREE.MeshStandardMaterial(),
  };
  try {
    for (const kind of PROP_KINDS) {
      const first = buildProp(kind, mats);
      const second = buildProp(kind, mats);
      assert.ok(first && second);
      const meshA = first.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
      const meshB = second.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
      assert.ok(meshA && meshB);
      assert.equal(meshA.geometry, meshB.geometry);
    }
    disposeProps();
    disposeProps();
    assert.ok(PROP_KINDS.every((kind) => buildProp(kind, mats) !== null));
  } finally {
    disposeProps();
    for (const mat of Object.values(mats)) mat.dispose();
  }
});
