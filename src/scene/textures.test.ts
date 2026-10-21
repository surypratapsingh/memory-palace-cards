import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  TEXTURE_KINDS,
  TILE_METERS,
  generate,
  texturesFor,
  roomMaterials,
  scaleUVs,
  disposeTextures,
  type TextureKind,
} from './textures.ts';

const EXPECTED_BASES: Readonly<Record<TextureKind, readonly [number, number, number]>> = {
  'library-floor': [0x3d, 0x28, 0x17],
  'library-wall': [0x2b, 0x1d, 0x14],
  'kitchen-floor': [0xd8, 0xe2, 0xdc],
  'kitchen-wall': [0x94, 0xa3, 0xb8],
  'greenhouse-floor': [0x4a, 0x5d, 0x4e],
  'greenhouse-wall': [0x1b, 0x43, 0x32],
  'observatory-floor': [0x0f, 0x17, 0x2a],
  'observatory-wall': [0x0a, 0x0f, 0x1d],
};

function computeStats(color: Uint8ClampedArray, size: number): {
  mean: [number, number, number];
  std: [number, number, number];
} {
  const n = size * size;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    sr += color[idx];
    sg += color[idx + 1];
    sb += color[idx + 2];
  }
  const mr = sr / n;
  const mg = sg / n;
  const mb = sb / n;

  let vr = 0;
  let vg = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    const dr = color[idx] - mr;
    const dg = color[idx + 1] - mg;
    const db = color[idx + 2] - mb;
    vr += dr * dr;
    vg += dg * dg;
    vb += db * db;
  }
  return {
    mean: [mr, mg, mb],
    std: [Math.sqrt(vr / n), Math.sqrt(vg / n), Math.sqrt(vb / n)],
  };
}

afterEach(() => {
  disposeTextures();
});

test('1. TEXTURE_KINDS and TILE_METERS define all 8 room surfaces with expected world sizes', () => {
  assert.equal(TEXTURE_KINDS.length, 8);
  assert.equal(TILE_METERS['library-floor'], 2);
  assert.equal(TILE_METERS['library-wall'], 1.2);
  assert.equal(TILE_METERS['kitchen-floor'], 1.2);
  assert.equal(TILE_METERS['kitchen-wall'], 0.6);
  assert.equal(TILE_METERS['greenhouse-floor'], 2);
  assert.equal(TILE_METERS['greenhouse-wall'], 1);
  assert.equal(TILE_METERS['observatory-floor'], 1.2);
  assert.equal(TILE_METERS['observatory-wall'], 2);
});

test('2. generate() outputs correct size, RGBA length, alpha=255, and grey bump (r=g=b)', () => {
  for (const kind of TEXTURE_KINDS) {
    const { size, color, bump } = generate(kind, 256);
    assert.equal(size, 256);
    assert.equal(color.length, 256 * 256 * 4);
    assert.equal(bump.length, 256 * 256 * 4);

    for (let i = 0; i < color.length; i += 4) {
      assert.equal(color[i + 3], 255, `${kind} color alpha at ${i}`);
      assert.equal(bump[i + 3], 255, `${kind} bump alpha at ${i}`);
      assert.equal(bump[i], bump[i + 1], `${kind} bump r===g at ${i}`);
      assert.equal(bump[i], bump[i + 2], `${kind} bump r===b at ${i}`);
    }
  }
});

test('3. generate() is deterministic for identical seeds and varies for different seeds', () => {
  for (const kind of TEXTURE_KINDS) {
    const a1 = generate(kind, 256);
    const a2 = generate(kind, 256, kind);
    const b = generate(kind, 256, `${kind}-alt-seed`);

    assert.deepEqual(a1.color, a2.color, `${kind} color determinism`);
    assert.deepEqual(a1.bump, a2.bump, `${kind} bump determinism`);
    assert.notDeepEqual(a1.color, b.color, `${kind} color changes with seed`);
  }
});

test('4. every kind satisfies the seamless boundary difference rule on both columns and rows', () => {
  const size = 256;
  for (const kind of TEXTURE_KINDS) {
    const { color } = generate(kind, size);

    let seamColSum = 0;
    for (let y = 0; y < size; y++) {
      const first = (y * size + 0) * 4;
      const last = (y * size + (size - 1)) * 4;
      for (let c = 0; c < 3; c++) {
        seamColSum += Math.abs(color[first + c] - color[last + c]);
      }
    }
    const meanSeamCol = seamColSum / (size * 3);

    let adjColSum = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size - 1; x++) {
        const cur = (y * size + x) * 4;
        const next = (y * size + (x + 1)) * 4;
        for (let c = 0; c < 3; c++) {
          adjColSum += Math.abs(color[cur + c] - color[next + c]);
        }
      }
    }
    const meanAdjCol = adjColSum / (size * (size - 1) * 3);

    assert.ok(
      meanSeamCol <= 1.5 * meanAdjCol,
      `${kind} col seam ${meanSeamCol.toFixed(3)} > 1.5 * ${meanAdjCol.toFixed(3)}`,
    );

    let seamRowSum = 0;
    for (let x = 0; x < size; x++) {
      const first = (0 * size + x) * 4;
      const last = ((size - 1) * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        seamRowSum += Math.abs(color[first + c] - color[last + c]);
      }
    }
    const meanSeamRow = seamRowSum / (size * 3);

    let adjRowSum = 0;
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size; x++) {
        const cur = (y * size + x) * 4;
        const next = ((y + 1) * size + x) * 4;
        for (let c = 0; c < 3; c++) {
          adjRowSum += Math.abs(color[cur + c] - color[next + c]);
        }
      }
    }
    const meanAdjRow = adjRowSum / ((size - 1) * size * 3);

    assert.ok(
      meanSeamRow <= 1.5 * meanAdjRow,
      `${kind} row seam ${meanSeamRow.toFixed(3)} > 1.5 * ${meanAdjRow.toFixed(3)}`,
    );
  }
});

test('5. mean colour of every kind stays within 10 per channel of its room base colour', () => {
  for (const kind of TEXTURE_KINDS) {
    const { color, size } = generate(kind, 256);
    const { mean } = computeStats(color, size);
    const base = EXPECTED_BASES[kind];

    for (let c = 0; c < 3; c++) {
      const diff = Math.abs(mean[c] - base[c]);
      assert.ok(
        diff <= 10,
        `${kind} channel ${c} mean ${mean[c].toFixed(2)} differs from ${base[c]} by ${diff.toFixed(2)}`,
      );
    }
  }
});

test('6. per-channel standard deviation of every kind is 24 or less', () => {
  for (const kind of TEXTURE_KINDS) {
    const { color, size } = generate(kind, 256);
    const { std } = computeStats(color, size);

    for (let c = 0; c < 3; c++) {
      assert.ok(
        std[c] <= 24,
        `${kind} channel ${c} std ${std[c].toFixed(2)} exceeds 24`,
      );
      assert.ok(std[c] > 0.2, `${kind} channel ${c} is unexpectedly flat`);
    }
  }
});

test('7. observatory-wall speckles affect <= 1% of pixels and are at most +60 brighter', () => {
  const { color, size } = generate('observatory-wall', 256);
  const base = EXPECTED_BASES['observatory-wall'];
  const totalPixels = size * size;
  let specklePixels = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const dr = color[idx] - base[0];
    const dg = color[idx + 1] - base[1];
    const db = color[idx + 2] - base[2];
    const maxDelta = Math.max(dr, dg, db);

    assert.ok(maxDelta <= 60, `Speckle delta ${maxDelta} exceeds +60`);
    if (maxDelta > 8) {
      specklePixels += 1;
    }
  }

  assert.ok(
    specklePixels <= totalPixels * 0.01,
    `Speckle count ${specklePixels} exceeds 1% of ${totalPixels}`,
  );
  assert.ok(specklePixels > 0, 'Expected at least one speckle pixel');
});

test('8. texturesFor caches per kind and configures DataTexture properties properly', () => {
  const first = texturesFor('library-floor');
  const second = texturesFor('library-floor');
  assert.equal(first, second);
  assert.equal(first.map, second.map);
  assert.equal(first.bumpMap, second.bumpMap);

  assert.equal(first.map.image.width, 512);
  assert.equal(first.map.image.height, 512);
  assert.equal(first.map.colorSpace, THREE.SRGBColorSpace);
  assert.equal(first.bumpMap.colorSpace, THREE.NoColorSpace);

  for (const tex of [first.map, first.bumpMap]) {
    assert.equal(tex.format, THREE.RGBAFormat);
    assert.equal(tex.wrapS, THREE.RepeatWrapping);
    assert.equal(tex.wrapT, THREE.RepeatWrapping);
    assert.equal(tex.magFilter, THREE.LinearFilter);
    assert.equal(tex.minFilter, THREE.LinearMipmapLinearFilter);
    assert.equal(tex.generateMipmaps, true);
    assert.equal(tex.anisotropy, 4);
  }
});

test('9. roomMaterials caches per room and sets expected roughness, metalness, and maps', () => {
  const expectedFloorRoughness = [0.55, 0.35, 0.8, 0.3] as const;
  const rooms = [0, 1, 2, 3] as const;

  for (const room of rooms) {
    const mats1 = roomMaterials(room);
    const mats2 = roomMaterials(room);
    assert.equal(mats1, mats2);

    assert.equal(mats1.floor.color.getHex(), 0xffffff);
    assert.equal(mats1.wall.color.getHex(), 0xffffff);
    assert.equal(mats1.floor.roughness, expectedFloorRoughness[room]);
    assert.equal(mats1.wall.roughness, 0.8);
    assert.equal(mats1.floor.metalness, 0);
    assert.equal(mats1.wall.metalness, 0);
    assert.equal(mats1.floor.bumpScale, 1);
    assert.equal(mats1.wall.bumpScale, 1);
    assert.ok(mats1.floor.map instanceof THREE.DataTexture);
    assert.ok(mats1.floor.bumpMap instanceof THREE.DataTexture);
    assert.ok(mats1.wall.map instanceof THREE.DataTexture);
    assert.ok(mats1.wall.bumpMap instanceof THREE.DataTexture);
  }
});

test('10. disposeTextures calls dispose() on all cached textures and materials and resets caches', () => {
  const libTex = texturesFor('library-floor');
  const kitMat = roomMaterials(1);

  let disposedCount = 0;
  const watch = (obj: { dispose: () => void }): void => {
    const orig = obj.dispose.bind(obj);
    obj.dispose = () => {
      disposedCount += 1;
      orig();
    };
  };

  watch(libTex.map);
  watch(libTex.bumpMap);
  watch(kitMat.floor);
  watch(kitMat.wall);
  watch(kitMat.floor.map!);
  watch(kitMat.floor.bumpMap!);
  watch(kitMat.wall.map!);
  watch(kitMat.wall.bumpMap!);

  disposeTextures();
  assert.equal(disposedCount, 8);

  const libTexAfter = texturesFor('library-floor');
  const kitMatAfter = roomMaterials(1);
  assert.notEqual(libTexAfter.map, libTex.map);
  assert.notEqual(libTexAfter.bumpMap, libTex.bumpMap);
  assert.notEqual(kitMatAfter.floor, kitMat.floor);
  assert.notEqual(kitMatAfter.wall, kitMat.wall);
});

test('11. scaleUVs multiplies u and v on PlaneGeometry(4, 2) by widthM/tileMeters and heightM/tileMeters', () => {
  const geom = new THREE.PlaneGeometry(4, 2);
  const uv = geom.getAttribute('uv');
  const origU: number[] = [];
  const origV: number[] = [];
  for (let i = 0; i < uv.count; i++) {
    origU.push(uv.getX(i));
    origV.push(uv.getY(i));
  }

  scaleUVs(geom, 4, 2, 0.5);

  for (let i = 0; i < uv.count; i++) {
    assert.ok(Math.abs(uv.getX(i) - origU[i] * 8) < 1e-6);
    assert.ok(Math.abs(uv.getY(i) - origV[i] * 4) < 1e-6);
  }
});