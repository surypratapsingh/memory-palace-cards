import * as THREE from 'three';
import { ROOMS, LOCI } from '../data/palace.ts';

export interface RoomMood {
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number; // HemisphereLight
  keyColor: number;
  keyIntensity: number; // the shadow-casting light for this room
  fogColor: number;
  fogDensity: number; // FogExp2
  exposure: number; // renderer.toneMappingExposure
  ceiling: number; // ceiling colour
}

// Lead: exposures set after measuring mean brightness at all 52 loci against main (T9 fix round 1); every locus >= before.
export const MOODS: readonly RoomMood[] = [
  // 0: Library — warm amber, candle-lit, deep shadows, gold highlights
  {
    hemiSky: 0xffcf8b,
    hemiGround: 0x5c3418,
    hemiIntensity: 1.15,
    keyColor: 0xffc278,
    keyIntensity: 1.9,
    fogColor: 0x4e321c,
    fogDensity: 0.015,
    exposure: 1.75,
    ceiling: 0x4c301a,
  },
  // 1: Kitchen — bright, cool morning light
  {
    hemiSky: 0xf0f8ff,
    hemiGround: 0x68788c,
    hemiIntensity: 1.1,
    keyColor: 0xf8fcff,
    keyIntensity: 1.85,
    fogColor: 0x586c84,
    fogDensity: 0.011,
    exposure: 1.25,
    ceiling: 0x5a6e85,
  },
  // 2: Greenhouse — soft green daylight, slightly humid fog
  {
    hemiSky: 0xd8f5e0,
    hemiGround: 0x385e42,
    hemiIntensity: 1.05,
    keyColor: 0xe2fad4,
    keyIntensity: 1.75,
    fogColor: 0x345842,
    fogDensity: 0.022,
    exposure: 1.65,
    ceiling: 0x30523c,
  },
  // 3: Observatory — deep night blue, with a cool rim light so objects still read
  {
    hemiSky: 0x78b8f8,
    hemiGround: 0x182448,
    hemiIntensity: 2.5,
    keyColor: 0x8ab8f8,
    keyIntensity: 2.4,
    fogColor: 0x101c38,
    fogDensity: 0.018,
    exposure: 2.0,
    ceiling: 0x14203c,
  },
];

export interface Atmosphere {
  update(cameraX: number, cameraZ: number): void; // call once per frame
  dispose(): void;
}

const DOOR_BLEND_HALF_WIDTH = 1.5;

const PROP_FOOTPRINTS: Record<string, readonly [number, number]> = {
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

function doorXBetween(roomIdx: number): number {
  const left = ROOMS[roomIdx]!;
  const right = ROOMS[roomIdx + 1]!;
  const leftEnd = left.rect.x0 + 14;
  return (leftEnd + right.rect.x0) * 0.5;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHexColor(c0: number, c1: number, t: number): number {
  const r0 = (c0 >> 16) & 0xff;
  const g0 = (c0 >> 8) & 0xff;
  const b0 = c0 & 0xff;

  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r = Math.round(lerpNumber(r0, r1, t));
  const g = Math.round(lerpNumber(g0, g1, t));
  const b = Math.round(lerpNumber(b0, b1, t));

  return (r << 16) | (g << 8) | b;
}

function blendMoods(a: RoomMood, b: RoomMood, t: number): RoomMood {
  return {
    hemiSky: lerpHexColor(a.hemiSky, b.hemiSky, t),
    hemiGround: lerpHexColor(a.hemiGround, b.hemiGround, t),
    hemiIntensity: lerpNumber(a.hemiIntensity, b.hemiIntensity, t),
    keyColor: lerpHexColor(a.keyColor, b.keyColor, t),
    keyIntensity: lerpNumber(a.keyIntensity, b.keyIntensity, t),
    fogColor: lerpHexColor(a.fogColor, b.fogColor, t),
    fogDensity: lerpNumber(a.fogDensity, b.fogDensity, t),
    exposure: lerpNumber(a.exposure, b.exposure, t),
    ceiling: lerpHexColor(a.ceiling, b.ceiling, t),
  };
}

export function moodAt(x: number): RoomMood {
  for (let i = 0; i < ROOMS.length - 1; i++) {
    const doorX = doorXBetween(i);
    const start = doorX - DOOR_BLEND_HALF_WIDTH;
    const end = doorX + DOOR_BLEND_HALF_WIDTH;
    if (x < start) {
      return { ...MOODS[i]! };
    }
    if (x <= end) {
      const t = smoothstep(start, end, x);
      return blendMoods(MOODS[i]!, MOODS[i + 1]!, t);
    }
  }
  return { ...MOODS[MOODS.length - 1]! };
}

function roomIndexAtX(x: number): number {
  for (let i = 0; i < ROOMS.length - 1; i++) {
    if (x < doorXBetween(i)) return i;
  }
  return ROOMS.length - 1;
}

function makeRadialTexture(size: number, power: number, whiteCore: boolean): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const half = (size - 1) * 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.sqrt(dx * dx + dy * dy);
      const falloff = r >= 1 ? 0 : Math.pow(1 - r * r, power);
      const idx = (y * size + x) * 4;
      const c = whiteCore ? 255 : 0;
      data[idx] = c;
      data[idx + 1] = c;
      data[idx + 2] = c;
      data[idx + 3] = Math.round(falloff * 255);
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function contactShadows(): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);

  const tex = makeRadialTexture(64, 2.0, false);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });

  const count = LOCI.length;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.name = 'contact_shadows';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 1;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const locus = LOCI[i]!;
    const [w, d] = PROP_FOOTPRINTS[locus.kind] ?? [1.0, 0.85];
    dummy.position.set(locus.pos[0], 0.005, locus.pos[1]);
    dummy.rotation.set(0, Math.atan2(locus.face[0], locus.face[1]), 0);
    dummy.scale.set(w * 1.3, 1, d * 1.3);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  return mesh;
}

export function lampHalos(positions: readonly THREE.Vector3[]): THREE.Points {
  const count = positions.length;
  const posAttr = new Float32Array(count * 3);
  const colAttr = new Float32Array(count * 3);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const p = positions[i]!;
    posAttr[i * 3] = p.x;
    posAttr[i * 3 + 1] = p.y;
    posAttr[i * 3 + 2] = p.z;

    const rIdx = roomIndexAtX(p.x);
    tmpColor.setHex(rIdx === 3 ? 0x93c5fd : 0xffdfa0);
    colAttr[i * 3] = tmpColor.r;
    colAttr[i * 3 + 1] = tmpColor.g;
    colAttr[i * 3 + 2] = tmpColor.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colAttr, 3));

  const tex = makeRadialTexture(64, 2.2, true);
  const mat = new THREE.PointsMaterial({
    map: tex,
    size: 0.78,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'lamp_halos';
  points.renderOrder = 2;
  return points;
}

function updateShadowRigForRoom(dirLight: THREE.DirectionalLight, roomIdx: number): void {
  const room = ROOMS[roomIdx] ?? ROOMS[0]!;
  const x0 = room.rect.x0;
  const z0 = room.rect.z0;
  const rcx = x0 + 7;
  const rcz = z0 + 7;

  // Angled key light per room for shadow depth and rim modelling while staying inside room bounds
  const offsetX = roomIdx === 3 ? 2.4 : -2.2;
  const offsetZ = roomIdx === 1 ? -2.2 : 2.6;

  dirLight.target.position.set(rcx, 0, rcz);
  dirLight.position.set(rcx + offsetX, 12.0, rcz + offsetZ);

  // Lead: fit the frustum to this room's corners in light space, with up along -z so its axes match the room.
  // Tighter shadow texels than a fixed 21 m box, and it never reaches a neighbour room.
  const cam = dirLight.shadow.camera;
  dirLight.target.updateMatrixWorld(true);
  dirLight.updateMatrixWorld(true);
  cam.up.set(0, 0, -1);
  cam.position.copy(dirLight.position);
  cam.lookAt(dirLight.target.position);
  cam.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const cx of [room.rect.x0, room.rect.x1]) {
    for (const cy of [0, 4]) {
      for (const cz of [room.rect.z0, room.rect.z1]) box.expandByPoint(v.set(cx, cy, cz).applyMatrix4(cam.matrixWorldInverse));
    }
  }
  cam.left = box.min.x - 0.3;
  cam.right = box.max.x + 0.3;
  cam.bottom = box.min.y - 0.3;
  cam.top = box.max.y + 0.3;
  cam.near = Math.max(0.1, -box.max.z - 1);
  cam.far = -box.min.z + 1;
  cam.updateProjectionMatrix();
}

export function buildAtmosphere(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  opts: {
    casters: readonly THREE.Object3D[];
    receivers: readonly THREE.Object3D[];
    lamps: readonly THREE.Vector3[];
  },
): Atmosphere {
  const initialMood = MOODS[0]!;

  // Neutral, not ACES: ACES crushed the dark loci to near black (Library 11.5 -> 2.2 mean luma).
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = initialMood.exposure;
  if (renderer.shadowMap) {
    renderer.shadowMap.enabled = true;
    // three r186 removed PCFSoftShadowMap; PCFShadowMap blurs by shadow.radius (set on dirLight below).
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  for (const caster of opts.casters) {
    caster.castShadow = true;
    caster.traverse((child) => {
      child.castShadow = true;
    });
  }

  for (const receiver of opts.receivers) {
    receiver.receiveShadow = true;
    receiver.traverse((child) => {
      child.receiveShadow = true;
    });
  }

  // Rebalance existing palaceWorld lights and collect ceiling materials for mood tinting
  const savedLights: Array<{ light: THREE.Light; intensity: number; colorHex: number }> = [];
  const ceilingMaterials: THREE.MeshStandardMaterial[] = [];

  scene.traverse((obj) => {
    if (obj instanceof THREE.AmbientLight) {
      savedLights.push({
        light: obj,
        intensity: obj.intensity,
        colorHex: obj.color.getHex(),
      });
      obj.intensity = 0.32;
    } else if (obj instanceof THREE.PointLight) {
      savedLights.push({
        light: obj,
        intensity: obj.intensity,
        colorHex: obj.color.getHex(),
      });
      const rIdx = roomIndexAtX(obj.position.x);
      obj.intensity = rIdx === 3 ? 0.75 : 0.65;
      if (rIdx === 3 && obj.color.getHex() === 0x1e293b) {
        obj.color.setHex(0x60a5fa);
      }
    } else if (obj instanceof THREE.Mesh) {
      const mat = obj.material;
      if (
        mat instanceof THREE.MeshStandardMaterial &&
        (obj.name.toLowerCase().includes('ceiling') ||
          (obj.position.y >= 3.9 && mat.color.getHex() === 0x111827))
      ) {
        ceilingMaterials.push(mat);
      }
    }
  });

  const previousFog = scene.fog;
  const fog = new THREE.FogExp2(initialMood.fogColor, initialMood.fogDensity);
  scene.fog = fog;

  const hemiLight = new THREE.HemisphereLight(
    initialMood.hemiSky,
    initialMood.hemiGround,
    initialMood.hemiIntensity,
  );
  hemiLight.name = 'atmosphere_hemi';

  const dirLight = new THREE.DirectionalLight(initialMood.keyColor, initialMood.keyIntensity);
  dirLight.name = 'atmosphere_key';
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.normalBias = 0.02;
  dirLight.shadow.radius = 3;

  const shadows = contactShadows();
  const halos = lampHalos(opts.lamps);

  scene.add(hemiLight);
  scene.add(dirLight);
  scene.add(dirLight.target);
  scene.add(shadows);
  scene.add(halos);

  let activeRoom = -1;

  const update = (cameraX: number, _cameraZ: number): void => {
    const mood = moodAt(cameraX);
    hemiLight.color.setHex(mood.hemiSky);
    hemiLight.groundColor.setHex(mood.hemiGround);
    hemiLight.intensity = mood.hemiIntensity;

    dirLight.color.setHex(mood.keyColor);
    dirLight.intensity = mood.keyIntensity;

    fog.color.setHex(mood.fogColor);
    fog.density = mood.fogDensity;

    renderer.toneMappingExposure = mood.exposure;

    for (const mat of ceilingMaterials) {
      mat.color.setHex(mood.ceiling);
    }

    const nextRoom = roomIndexAtX(cameraX);
    if (nextRoom !== activeRoom) {
      activeRoom = nextRoom;
      updateShadowRigForRoom(dirLight, activeRoom);
    }
  };

  update(ROOMS[0]!.rect.x0 + 7, 7);

  let disposed = false;
  return {
    update,
    dispose(): void {
      if (disposed) return;
      disposed = true;

      scene.remove(hemiLight);
      scene.remove(dirLight);
      scene.remove(dirLight.target);
      scene.remove(shadows);
      scene.remove(halos);
      scene.fog = previousFog;

      for (const item of savedLights) {
        item.light.intensity = item.intensity;
        item.light.color.setHex(item.colorHex);
      }

      hemiLight.dispose();
      dirLight.shadow.map?.texture.dispose();
      dirLight.shadow.map?.dispose();
      dirLight.dispose();

      shadows.geometry.dispose();
      const shadowMat = shadows.material as THREE.MeshBasicMaterial;
      shadowMat.map?.dispose();
      shadowMat.dispose();
      shadows.dispose();

      halos.geometry.dispose();
      const haloMat = halos.material as THREE.PointsMaterial;
      haloMat.map?.dispose();
      haloMat.dispose();
    },
  };
}