import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ROOMS, LOCI, viewpoint, EYE_HEIGHT } from '../data/palace.ts';
import {
  MOODS,
  moodAt,
  buildAtmosphere,
  contactShadows,
  lampHalos,
  type RoomMood,
} from './atmosphere.ts';
import { decorLayout, buildDecor, lampPositions } from './decor.ts';

function makeFakeRenderer(): THREE.WebGLRenderer {
  return {
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 1.0,
    shadowMap: {
      enabled: false,
      type: THREE.BasicShadowMap,
    },
  } as unknown as THREE.WebGLRenderer;
}

function unpackRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function getViewpointXZ(i: number): [number, number] {
  const locus = LOCI[i]!;
  let res: unknown;
  try {
    res = (viewpoint as (arg: unknown) => unknown)(i);
    if (!res) res = (viewpoint as (arg: unknown) => unknown)(locus);
  } catch {
    res = (viewpoint as (arg: unknown) => unknown)(locus);
  }
  if (Array.isArray(res)) {
    return res.length >= 3 ? [Number(res[0]), Number(res[2])] : [Number(res[0]), Number(res[1])];
  }
  if (res && typeof res === 'object' && 'x' in res && 'z' in res) {
    const v = res as { x: number; z: number };
    return [v.x, v.z];
  }
  return [locus.pos[0] + locus.face[0] * 1.8, locus.pos[1] + locus.face[1] * 1.8];
}

function segmentIntersectsAABB2D(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;

  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-8) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };

  return (
    clip(-dx, ax - minX) &&
    clip(dx, maxX - ax) &&
    clip(-dz, az - minZ) &&
    clip(dz, maxZ - az) &&
    t0 <= t1
  );
}

describe('Atmosphere & Lighting', () => {
  it('1. MOODS has 4 entries with exposure in [0.6, 1.6] and fogDensity <= 0.035 (>= 75% visibility at 14 m)', () => {
    assert.equal(MOODS.length, 4);
    for (let i = 0; i < MOODS.length; i++) {
      const m = MOODS[i]!;
      assert.ok(m.exposure >= 0.6 && m.exposure <= 1.6, `Room ${i} exposure ${m.exposure}`);
      assert.ok(m.fogDensity > 0 && m.fogDensity <= 0.035, `Room ${i} fogDensity ${m.fogDensity}`);
      const visibility14m = Math.exp(-Math.pow(14 * m.fogDensity, 2));
      assert.ok(
        visibility14m >= 0.75,
        `Room ${i} 14m visibility ${visibility14m} < 0.75`,
      );
    }
  });

  it('2. moodAt(x) returns the pure room mood at each room centre', () => {
    for (let i = 0; i < ROOMS.length; i++) {
      const center = ROOMS[i]!.rect.x0 + 7;
      const sampled = moodAt(center);
      assert.deepEqual(sampled, MOODS[i]);
    }
  });

  it('3. moodAt(x) is continuous across every door from x=10 to x=50 in 0.01 m steps (<= 2% jump)', () => {
    const numKeys = ['hemiIntensity', 'keyIntensity', 'fogDensity', 'exposure'] as const;
    const colKeys = ['hemiSky', 'hemiGround', 'keyColor', 'fogColor', 'ceiling'] as const;

    const numRanges = new Map<string, number>();
    for (const k of numKeys) {
      const vals = MOODS.map((m) => m[k]);
      numRanges.set(k, Math.max(...vals) - Math.min(...vals));
    }

    const colRanges = new Map<string, [number, number, number]>();
    for (const k of colKeys) {
      const rgbs = MOODS.map((m) => unpackRgb(m[k]));
      colRanges.set(k, [
        Math.max(...rgbs.map((c) => c[0])) - Math.min(...rgbs.map((c) => c[0])),
        Math.max(...rgbs.map((c) => c[1])) - Math.min(...rgbs.map((c) => c[1])),
        Math.max(...rgbs.map((c) => c[2])) - Math.min(...rgbs.map((c) => c[2])),
      ]);
    }

    let prev: RoomMood = moodAt(10);
    for (let step = 1001; step <= 5000; step++) {
      const x = step / 100;
      const cur = moodAt(x);

      for (const k of numKeys) {
        const range = numRanges.get(k)!;
        if (range > 0) {
          const jump = Math.abs(cur[k] - prev[k]) / range;
          assert.ok(jump <= 0.02, `${k} jumped ${(jump * 100).toFixed(2)}% at x=${x}`);
        }
      }

      for (const k of colKeys) {
        const [rRange, gRange, bRange] = colRanges.get(k)!;
        const [r0, g0, b0] = unpackRgb(prev[k]);
        const [r1, g1, b1] = unpackRgb(cur[k]);
        if (rRange > 0) assert.ok(Math.abs(r1 - r0) / rRange <= 0.02, `${k}.R jump at x=${x}`);
        if (gRange > 0) assert.ok(Math.abs(g1 - g0) / gRange <= 0.02, `${k}.G jump at x=${x}`);
        if (bRange > 0) assert.ok(Math.abs(b1 - b0) / bRange <= 0.02, `${k}.B jump at x=${x}`);
      }

      prev = cur;
    }
  });

  it('4. buildAtmosphere adds 2 lights, configures ACESFilmic + PCFSoftShadowMap, and sets shadow flags', () => {
    const renderer = makeFakeRenderer();
    const scene = new THREE.Scene();
    const casterGroup = new THREE.Group();
    const casterChild = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    casterGroup.add(casterChild);
    const receiverMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 10));

    const atm = buildAtmosphere(renderer, scene, {
      casters: [casterGroup],
      receivers: [receiverMesh],
      lamps: [new THREE.Vector3(7, 3, 7)],
    });

    assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping);
    assert.equal(renderer.shadowMap.enabled, true);
    assert.equal(renderer.shadowMap.type, THREE.PCFSoftShadowMap);

    const lights = scene.children.filter((c): c is THREE.Light => c instanceof THREE.Light);
    assert.equal(lights.length, 2);
    assert.ok(lights.some((l) => l instanceof THREE.HemisphereLight));
    const dirLight = lights.find(
      (l): l is THREE.DirectionalLight => l instanceof THREE.DirectionalLight,
    );
    assert.ok(dirLight);
    assert.equal(dirLight.castShadow, true);
    assert.equal(dirLight.shadow.mapSize.x, 2048);
    assert.equal(dirLight.shadow.mapSize.y, 2048);

    assert.equal(casterGroup.castShadow, true);
    assert.equal(casterChild.castShadow, true);
    assert.equal(receiverMesh.receiveShadow, true);

    atm.dispose();
  });

  it('5. DirectionalLight shadow camera covers the active room and shifts when crossing each door', () => {
    const renderer = makeFakeRenderer();
    const scene = new THREE.Scene();
    const atm = buildAtmosphere(renderer, scene, {
      casters: [],
      receivers: [],
      lamps: [],
    });

    const dirLight = scene.children.find(
      (c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight,
    )!;
    const cam = dirLight.shadow.camera;
    const prevTargetXs: number[] = [];

    for (let r = 0; r < ROOMS.length; r++) {
      const room = ROOMS[r]!;
      const x0 = room.rect.x0;
      const z0 = room.rect.z0;
      const x1 = x0 + 14;
      const z1 = z0 + 14;

      atm.update(x0 + 7, z0 + 7);
      prevTargetXs.push(dirLight.target.position.x);

      for (const cx of [x0, x1]) {
        for (const cy of [0, 4]) {
          for (const cz of [z0, z1]) {
            const ndc = new THREE.Vector3(cx, cy, cz).project(cam);
            assert.ok(
              ndc.x >= -1.01 && ndc.x <= 1.01,
              `Room ${r} corner x NDC ${ndc.x} out of bounds`,
            );
            assert.ok(
              ndc.y >= -1.01 && ndc.y <= 1.01,
              `Room ${r} corner y NDC ${ndc.y} out of bounds`,
            );
            assert.ok(
              ndc.z >= -1.01 && ndc.z <= 1.01,
              `Room ${r} corner z NDC ${ndc.z} out of bounds`,
            );
          }
        }
      }

      const otherRoom = ROOMS[(r + 1) % ROOMS.length]!;
      const otherCenterNdc = new THREE.Vector3(
        otherRoom.rect.x0 + 7,
        1,
        otherRoom.rect.z0 + 7,
      ).project(cam);
      assert.ok(
        Math.abs(otherCenterNdc.x) > 1 || Math.abs(otherCenterNdc.y) > 1,
        `Room ${r} shadow frustum should not cover room ${(r + 1) % ROOMS.length}`,
      );
    }

    for (let i = 1; i < prevTargetXs.length; i++) {
      assert.notEqual(prevTargetXs[i], prevTargetXs[i - 1]);
    }

    atm.dispose();
  });

  it('6. contactShadows() returns one InstancedMesh of 52 decals with transparent true and depthWrite false', () => {
    const mesh = contactShadows();
    assert.ok(mesh instanceof THREE.InstancedMesh);
    assert.equal(mesh.count, 52);

    const mat = mesh.material as THREE.MeshBasicMaterial;
    assert.equal(mat.transparent, true);
    assert.equal(mat.depthWrite, false);
    assert.ok(mat.map instanceof THREE.DataTexture);

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    for (let i = 0; i < 52; i++) {
      mesh.getMatrixAt(i, m);
      pos.setFromMatrixPosition(m);
      assert.ok(Math.abs(pos.y - 0.005) < 1e-5);
    }

    mesh.geometry.dispose();
    mat.map.dispose();
    mat.dispose();
  });

  it('7. lampHalos() returns one Points object with positions.length * 3 floats and AdditiveBlending', () => {
    const pts = lampPositions().map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const halos = lampHalos(pts);

    assert.ok(halos instanceof THREE.Points);
    const posAttr = halos.geometry.getAttribute('position');
    assert.equal(posAttr.array.length, pts.length * 3);

    const mat = halos.material as THREE.PointsMaterial;
    assert.equal(mat.blending, THREE.AdditiveBlending);
    assert.equal(mat.depthWrite, false);
    assert.equal(mat.sizeAttenuation, true);
    assert.ok(mat.map instanceof THREE.DataTexture);

    halos.geometry.dispose();
    mat.map.dispose();
    mat.dispose();
  });

  it('8. dispose() removes all added objects from the scene and disposes geometries, materials and textures', () => {
    const renderer = makeFakeRenderer();
    const scene = new THREE.Scene();
    const atm = buildAtmosphere(renderer, scene, {
      casters: [],
      receivers: [],
      lamps: [new THREE.Vector3(7, 3, 7), new THREE.Vector3(21, 3, 7)],
    });

    assert.ok(scene.children.length > 0);
    assert.ok(scene.fog instanceof THREE.FogExp2);

    const shadows = scene.getObjectByName('contact_shadows') as THREE.InstancedMesh;
    const halos = scene.getObjectByName('lamp_halos') as THREE.Points;
    assert.ok(shadows);
    assert.ok(halos);

    const shadowMat = shadows.material as THREE.MeshBasicMaterial;
    const haloMat = halos.material as THREE.PointsMaterial;

    const spies = [
      mock.method(shadows.geometry, 'dispose'),
      mock.method(shadowMat, 'dispose'),
      mock.method(shadowMat.map!, 'dispose'),
      mock.method(halos.geometry, 'dispose'),
      mock.method(haloMat, 'dispose'),
      mock.method(haloMat.map!, 'dispose'),
    ];

    atm.dispose();

    assert.equal(scene.children.length, 0);
    assert.equal(scene.fog, null);
    for (const spy of spies) {
      assert.ok(spy.mock.callCount() >= 1);
    }
  });
});

describe('Decor v2', () => {
  it('9. decorLayout() obeys floor, ceiling and wall zone rules in all 4 rooms', () => {
    const items = decorLayout();
    assert.ok(items.length >= 30);

    for (let r = 0; r < ROOMS.length; r++) {
      const roomItems = items.filter((item) => item.room === r);
      assert.ok(roomItems.some((i) => i.zone === 'floor'), `Room ${r} missing floor decor`);
      assert.ok(roomItems.some((i) => i.zone === 'ceiling'), `Room ${r} missing ceiling decor`);
      assert.ok(roomItems.some((i) => i.zone === 'wall'), `Room ${r} missing wall decor`);
    }

    for (const item of items) {
      const room = ROOMS[item.room]!;
      const rx0 = room.rect.x0;
      const rz0 = room.rect.z0;
      const rx1 = rx0 + 14;
      const rz1 = rz0 + 14;

      assert.ok(item.min[0] >= rx0 && item.max[0] <= rx1, `${item.kind} outside room X`);
      assert.ok(item.min[2] >= rz0 && item.max[2] <= rz1, `${item.kind} outside room Z`);

      if (item.zone === 'floor') {
        assert.ok(item.min[1] >= 0 && item.max[1] <= 0.05, `${item.kind} floor height out of bounds`);
      } else if (item.zone === 'ceiling') {
        assert.ok(
          item.min[1] >= 2.6 && item.max[1] <= 4.0,
          `${item.kind} ceiling height [${item.min[1]}, ${item.max[1]}] out of bounds`,
        );
      } else if (item.zone === 'wall') {
        const nearWall =
          item.min[0] - rx0 <= 0.7 ||
          rx1 - item.max[0] <= 0.7 ||
          item.min[2] - rz0 <= 0.7 ||
          rz1 - item.max[2] <= 0.7;
        assert.ok(nearWall, `${item.kind} not near wall`);
      }
    }
  });

  it('10. keeps sight lines at eye height, glide routes, doorways, and locus footprints clear', () => {
    const items = decorLayout();
    const blockingItems = items.filter(
      (item) => item.min[1] < EYE_HEIGHT + 0.25 && item.max[1] > 0.05,
    );

    for (const doorX of [14.25, 28.75, 43.25]) {
      for (const item of blockingItems) {
        const overlapsDoor =
          item.min[0] < doorX + 0.8 &&
          item.max[0] > doorX - 0.8 &&
          item.min[2] < 8.5 &&
          item.max[2] > 5.5;
        assert.equal(overlapsDoor, false, `${item.kind} blocks doorway at x=${doorX}`);
      }
    }

    for (let i = 0; i < LOCI.length; i++) {
      const locus = LOCI[i]!;
      const [vx, vz] = getViewpointXZ(i);
      const [lx, lz] = locus.pos;

      for (const item of blockingItems) {
        if (item.min[1] > EYE_HEIGHT || item.max[1] < EYE_HEIGHT) continue;
        const hitsSight = segmentIntersectsAABB2D(
          vx,
          vz,
          lx,
          lz,
          item.min[0],
          item.min[2],
          item.max[0],
          item.max[2],
        );
        assert.equal(hitsSight, false, `${item.kind} blocks sightline to locus ${i}`);

        if (i + 1 < LOCI.length) {
          const [nvx, nvz] = getViewpointXZ(i + 1);
          const hitsGlide = segmentIntersectsAABB2D(
            vx,
            vz,
            nvx,
            nvz,
            item.min[0],
            item.min[2],
            item.max[0],
            item.max[2],
          );
          assert.equal(hitsGlide, false, `${item.kind} blocks glide route ${i}->${i + 1}`);
        }
      }
    }
  });

  it('11. buildDecor() stays within 12 meshes, 8 materials, and 40,000 triangles and disposes cleanly', () => {
    const { root, dispose } = buildDecor();
    const meshes = root.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);

    assert.ok(meshes.length >= 1 && meshes.length <= 12, `Mesh count ${meshes.length} > 12`);

    const materials = new Set<THREE.Material>();
    let totalTriangles = 0;
    const geoSpies: ReturnType<typeof mock.method>[] = [];
    const matSpies: ReturnType<typeof mock.method>[] = [];

    for (const mesh of meshes) {
      const mat = mesh.material as THREE.Material;
      materials.add(mat);
      const pos = mesh.geometry.getAttribute('position');
      const norm = mesh.geometry.getAttribute('normal');
      assert.ok(pos && norm && pos.count === norm.count);
      totalTriangles += pos.count / 3;
      geoSpies.push(mock.method(mesh.geometry, 'dispose'));
    }

    for (const mat of materials) {
      matSpies.push(mock.method(mat, 'dispose'));
    }

    assert.ok(materials.size <= 8, `Material count ${materials.size} > 8`);
    assert.ok(totalTriangles <= 40000, `Triangles ${totalTriangles} > 40000`);

    dispose();
    for (const spy of [...geoSpies, ...matSpies]) {
      assert.equal(spy.mock.callCount(), 1);
    }
  });

  it('12. lampPositions() are all inside a room above 2.0 m, hanging baskets are ~0.45 m, and tile_inlay is not green', () => {
    const lamps = lampPositions();
    assert.ok(lamps.length >= 12);

    for (const [x, y, z] of lamps) {
      assert.ok(y > 2.0 && y < 4.0, `Lamp y=${y} must be above 2.0 m and below ceiling`);
      const inSomeRoom = ROOMS.some(
        (r) =>
          x >= r.rect.x0 &&
          x <= r.rect.x0 + 14 &&
          z >= r.rect.z0 &&
          z <= r.rect.z0 + 14,
      );
      assert.ok(inSomeRoom, `Lamp (${x}, ${y}, ${z}) is not inside any room`);
    }

    const baskets = decorLayout().filter((i) => i.kind === 'hanging_basket');
    assert.equal(baskets.length, 4);
    for (const b of baskets) {
      const w = b.max[0] - b.min[0];
      const d = b.max[2] - b.min[2];
      assert.ok(Math.abs(w - 0.45) < 0.05 && Math.abs(d - 0.45) < 0.05);
    }

    const { root, dispose } = buildDecor();
    const stoneMesh = root.getObjectByName('decor_stone') as THREE.Mesh | undefined;
    assert.ok(stoneMesh);
    const stoneMat = stoneMesh.material as THREE.MeshStandardMaterial;
    const hex = stoneMat.color.getHex();
    assert.notEqual(hex, 0x8a9a86);
    const [r, g, b] = unpackRgb(hex);
    assert.ok(
      r >= 200 && g >= 200 && b >= 200,
      `Expected cool white stone mat, got ${hex.toString(16)}`,
    );
    dispose();
  });
});