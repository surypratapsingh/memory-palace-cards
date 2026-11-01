import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { ROOMS } from '../data/palace.ts';
import { MOODS, buildAtmosphere } from '../scene/atmosphere.ts';

function fakeRenderer(): THREE.WebGLRenderer {
  return {
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 1,
    shadowMap: { enabled: false, type: THREE.BasicShadowMap },
  } as unknown as THREE.WebGLRenderer;
}

const source = (name: string): string => readFileSync(new URL(`../scene/${name}`, import.meta.url), 'utf8');

test('T9 round 2: atmosphere uses the shadow mode three r186 supports, with a soft radius', () => {
  const renderer = fakeRenderer();
  const scene = new THREE.Scene();
  const atmosphere = buildAtmosphere(renderer, scene, { casters: [], receivers: [], lamps: [] });
  try {
    // r186 logs "PCFSoftShadowMap has been removed" and substitutes PCF; it must not be requested.
    assert.notEqual(renderer.shadowMap.type, THREE.PCFSoftShadowMap);
    assert.equal(renderer.shadowMap.type, THREE.PCFShadowMap);
    const key = scene.getObjectByName('atmosphere_key');
    assert.ok(key instanceof THREE.DirectionalLight);
    assert.ok(key.shadow.radius >= 2, `shadow.radius ${key.shadow.radius} does not blur the PCF map`);
  } finally {
    atmosphere.dispose();
  }
});

test('T9 round 2: tone mapping is not the ACES curve that crushed dark loci, and every room keeps its exposure floor', () => {
  const renderer = fakeRenderer();
  const scene = new THREE.Scene();
  const atmosphere = buildAtmosphere(renderer, scene, { casters: [], receivers: [], lamps: [] });
  try {
    assert.equal(renderer.toneMapping, THREE.NeutralToneMapping);
    assert.notEqual(renderer.toneMapping, THREE.ACESFilmicToneMapping);
    assert.equal(MOODS.length, ROOMS.length);
    for (let i = 0; i < MOODS.length; i++) {
      const mood = MOODS[i]!;
      assert.ok(mood.exposure >= 1.25, `room ${i} exposure ${mood.exposure} below the measured-bright baseline`);
      assert.ok(mood.exposure <= 2.2);
      const room = ROOMS[i]!;
      atmosphere.update((room.rect.x0 + room.rect.x1) / 2, 7);
      assert.equal(renderer.toneMappingExposure, mood.exposure, `room ${i} did not apply its exposure`);
    }
  } finally {
    atmosphere.dispose();
  }
});

test('T9 round 2: the scene harness has no HTML sink left', () => {
  const demo = source('demo.ts');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(demo), 'demo.ts reintroduced an HTML sink');
  assert.ok(/textContent/.test(demo), 'draw-call label should be written with textContent');
});

test('T9 round 2: palaceView dispose never fakes renderer memory counters', () => {
  const view = source('palaceView.ts');
  assert.ok(
    !/info\s*\.\s*memory\s*\.\s*(geometries|textures)\s*=/.test(view),
    'dispose() must not overwrite renderer.info.memory; the acceptance numbers must be real',
  );
});

test('T9 round 2: atmosphere dispose releases the directional shadow map and its texture exactly once', () => {
  const renderer = fakeRenderer();
  const scene = new THREE.Scene();
  const atmosphere = buildAtmosphere(renderer, scene, { casters: [], receivers: [], lamps: [] });
  const key = scene.getObjectByName('atmosphere_key') as THREE.DirectionalLight;
  let mapDisposed = 0;
  let textureDisposed = 0;
  (key.shadow as unknown as { map: unknown }).map = {
    dispose: () => void mapDisposed++,
    texture: { dispose: () => void textureDisposed++ },
  };
  atmosphere.dispose();
  // Light.dispose() also disposes the shadow map, so the app's explicit call can repeat harmlessly.
  assert.ok(mapDisposed >= 1, 'shadow map not disposed');
  assert.equal(textureDisposed, 1, 'shadow map texture not disposed');
  const mapsAfterFirst = mapDisposed;
  atmosphere.dispose();
  assert.equal(mapDisposed, mapsAfterFirst, 'second dispose released the shadow map again');
  assert.equal(textureDisposed, 1, 'second dispose released the texture again');
});
