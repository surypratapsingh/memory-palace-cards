import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface PropMaterials {
  main: THREE.Material;
  accent: THREE.Material;
  gold: THREE.Material;
}

type MatKey = keyof PropMaterials;

interface PartBuckets {
  main: THREE.BufferGeometry[];
  accent: THREE.BufferGeometry[];
  gold: THREE.BufferGeometry[];
}

interface CachedProp {
  main?: THREE.BufferGeometry;
  accent?: THREE.BufferGeometry;
  gold?: THREE.BufferGeometry;
}

type Footprint = readonly [width: number, depth: number, height: number];
type PropBuilder = (p: PartBuckets) => void;

const FOOTPRINTS: Record<string, Footprint> = {
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

export const PROP_KINDS: readonly string[] = Object.freeze(Object.keys(FOOTPRINTS));

const MAT_KEYS: readonly MatKey[] = ['main', 'accent', 'gold'];
const cache = new Map<string, CachedProp>();
const tmpMat = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();

function addPart(
  buckets: PartBuckets,
  mat: MatKey,
  raw: THREE.BufferGeometry,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): void {
  const geo = raw.index ? raw.toNonIndexed() : raw;
  if (geo !== raw) raw.dispose();

  tmpPos.set(x, y, z);
  tmpEuler.set(rx, ry, rz, 'XYZ');
  tmpQuat.setFromEuler(tmpEuler);
  tmpScale.set(sx, sy, sz);
  tmpMat.compose(tmpPos, tmpQuat, tmpScale);
  geo.applyMatrix4(tmpMat);

  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') {
      geo.deleteAttribute(name);
    }
  }
  buckets[mat].push(geo);
}

function box(
  p: PartBuckets,
  m: MatKey,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
): void {
  addPart(p, m, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
}

function cyl(
  p: PartBuckets,
  m: MatKey,
  rt: number,
  rb: number,
  h: number,
  segs: number,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
): void {
  addPart(p, m, new THREE.CylinderGeometry(rt, rb, h, segs), x, y, z, rx, ry, rz);
}

function cone(
  p: PartBuckets,
  m: MatKey,
  r: number,
  h: number,
  segs: number,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
): void {
  addPart(p, m, new THREE.ConeGeometry(r, h, segs), x, y, z, rx, ry, rz);
}

function sphere(
  p: PartBuckets,
  m: MatKey,
  r: number,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  wSeg = 10,
  hSeg = 8,
): void {
  addPart(p, m, new THREE.SphereGeometry(r, wSeg, hSeg), x, y, z, 0, 0, 0, sx, sy, sz);
}

function torus(
  p: PartBuckets,
  m: MatKey,
  r: number,
  tube: number,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  tSeg = 16,
): void {
  addPart(p, m, new THREE.TorusGeometry(r, tube, 6, tSeg), x, y, z, rx, ry, rz);
}

function capsule(
  p: PartBuckets,
  m: MatKey,
  r: number,
  len: number,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
): void {
  addPart(p, m, new THREE.CapsuleGeometry(r, len, 3, 8), x, y, z, rx, ry, rz);
}

function buildArmchair(p: PartBuckets): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(p, 'accent', 0.035, 0.022, 0.22, 8, sx * 0.36, 0.11, sz * 0.28, sz * 0.08, 0, -sx * 0.08);
      cyl(p, 'gold', 0.026, 0.024, 0.04, 8, sx * 0.37, 0.02, sz * 0.29);
    }
  }
  box(p, 'main', 0.82, 0.18, 0.68, 0, 0.28, 0.02);
  box(p, 'accent', 0.66, 0.14, 0.58, 0, 0.42, 0.05);
  box(p, 'main', 0.82, 0.72, 0.18, 0, 0.74, -0.27, -0.08, 0, 0);
  for (const sx of [-1, 1]) {
    box(p, 'main', 0.14, 0.36, 0.58, sx * 0.36, 0.52, 0.04);
    cyl(p, 'main', 0.08, 0.08, 0.62, 8, sx * 0.38, 0.68, 0.05, Math.PI / 2, 0, 0);
    box(p, 'main', 0.1, 0.42, 0.24, sx * 0.38, 0.88, -0.16, 0, sx * 0.12, 0);
    sphere(p, 'gold', 0.028, sx * 0.38, 0.68, 0.36);
  }
  for (const bx of [-0.18, 0, 0.18]) {
    for (const by of [0.68, 0.9]) {
      sphere(p, 'gold', 0.022, bx, by, -0.17);
    }
  }
}

function buildBookshelf(p: PartBuckets): void {
  box(p, 'main', 1.04, 0.1, 0.36, 0, 0.05, 0);
  box(p, 'main', 1.06, 0.1, 0.38, 0, 1.91, 0);
  box(p, 'main', 1.02, 1.82, 0.04, 0, 0.98, -0.16);
  for (const sx of [-1, 1]) {
    box(p, 'main', 0.06, 1.82, 0.34, sx * 0.49, 0.98, 0);
    box(p, 'gold', 0.08, 0.08, 0.04, sx * 0.48, 1.88, 0.17);
  }
  const shelfYs = [0.44, 0.82, 1.2, 1.56];
  for (let s = 0; s < shelfYs.length; s++) {
    const sy = shelfYs[s]!;
    box(p, 'main', 0.92, 0.04, 0.32, 0, sy, 0);
    for (let i = 0; i < 7; i++) {
      const bh = 0.2 + ((i + s * 3) % 4) * 0.035;
      const bx = -0.36 + i * 0.11;
      const tilt = i === 6 ? -0.18 : 0;
      const mat: MatKey = (i + s) % 3 === 0 ? 'gold' : 'accent';
      box(p, mat, 0.075, bh, 0.22, bx, sy + 0.02 + bh * 0.5, 0.02, 0, 0, tilt);
    }
  }
}

function buildGlobe(p: PartBuckets): void {
  cyl(p, 'accent', 0.12, 0.28, 0.1, 10, 0, 0.05, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    box(p, 'accent', 0.1, 0.08, 0.56, Math.sin(a) * 0.22, 0.06, Math.cos(a) * 0.22, 0, a, 0);
    sphere(p, 'gold', 0.045, Math.sin(a) * 0.43, 0.045, Math.cos(a) * 0.43);
  }
  cyl(p, 'accent', 0.055, 0.08, 0.48, 10, 0, 0.32, 0);
  torus(p, 'gold', 0.075, 0.02, 0, 0.52, 0, Math.PI / 2, 0, 0, 12);
  torus(p, 'accent', 0.44, 0.028, 0, 0.88, 0, Math.PI / 2, 0, 0, 18);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    cyl(p, 'accent', 0.022, 0.022, 0.46, 6, Math.sin(a) * 0.22, 0.7, Math.cos(a) * 0.22, Math.cos(a) * 0.55, 0, -Math.sin(a) * 0.55);
  }
  torus(p, 'gold', 0.38, 0.024, 0, 0.88, 0, 0, 0, 0.4, 18);
  cyl(p, 'gold', 0.015, 0.015, 0.86, 6, 0, 0.88, 0, 0, 0, -0.4);
  sphere(p, 'main', 0.33, 0, 0.88, 0, 1, 1, 1, 14, 10);
  sphere(p, 'accent', 0.14, 0.18, 0.96, 0.22, 1.2, 0.8, 0.5, 8, 6);
  sphere(p, 'accent', 0.13, -0.2, 0.82, 0.2, 0.9, 1.3, 0.5, 8, 6);
  cone(p, 'gold', 0.04, 0.1, 8, -0.17, 1.29, 0, 0, 0, -0.4);
}

function buildGlobeCelestial(p: PartBuckets): void {
  cyl(p, 'accent', 0.36, 0.44, 0.1, 8, 0, 0.05, 0);
  cyl(p, 'gold', 0.26, 0.32, 0.06, 8, 0, 0.13, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    box(p, 'accent', 0.07, 0.46, 0.12, Math.sin(a) * 0.16, 0.36, Math.cos(a) * 0.16, 0, a, 0);
  }
  cyl(p, 'gold', 0.12, 0.12, 0.06, 10, 0, 0.56, 0);
  torus(p, 'main', 0.43, 0.025, 0, 0.9, 0, Math.PI / 2, 0, 0, 16);
  torus(p, 'main', 0.41, 0.022, 0, 0.9, 0, 0.45, 0, 0, 16);
  torus(p, 'gold', 0.39, 0.02, 0, 0.9, 0, -0.5, 0.4, 0.3, 16);
  sphere(p, 'main', 0.24, 0, 0.9, 0, 1, 1, 1, 10, 8);
  for (let i = 0; i < 10; i++) {
    const phi = (i * 2.4) % (Math.PI * 2);
    const theta = 0.4 + ((i * 0.7) % 2.3);
    const r = 0.25;
    sphere(
      p,
      'gold',
      0.032,
      r * Math.sin(theta) * Math.cos(phi),
      0.9 + r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi),
      1,
      1,
      1,
      4,
      4,
    );
  }
  cone(p, 'gold', 0.05, 0.14, 6, 0, 1.33, 0);
}

function buildFireplace(p: PartBuckets): void {
  box(p, 'accent', 1.44, 0.1, 0.56, 0, 0.05, 0);
  for (const sx of [-1, 1]) {
    box(p, 'main', 0.34, 1.02, 0.48, sx * 0.52, 0.61, -0.02);
    box(p, 'accent', 0.38, 0.12, 0.52, sx * 0.52, 1.06, -0.02);
  }
  box(p, 'main', 0.76, 0.36, 0.46, 0, 0.94, -0.02);
  box(p, 'main', 1.38, 0.8, 0.1, 0, 0.5, -0.21);
  box(p, 'accent', 1.46, 0.1, 0.56, 0, 1.16, 0);
  box(p, 'main', 1.36, 0.06, 0.48, 0, 1.24, -0.02);
  for (const sx of [-1, 1]) {
    cyl(p, 'gold', 0.025, 0.035, 0.24, 8, sx * 0.24, 0.22, 0.14);
    sphere(p, 'gold', 0.04, sx * 0.24, 0.35, 0.14);
  }
  cyl(p, 'accent', 0.055, 0.055, 0.48, 8, 0, 0.18, 0.02, 0, 0.2, Math.PI / 2);
  cyl(p, 'accent', 0.05, 0.05, 0.44, 8, 0, 0.24, -0.04, 0, -0.25, Math.PI / 2);
  cone(p, 'gold', 0.09, 0.26, 6, -0.08, 0.36, 0.0, 0, 0, 0.1);
  cone(p, 'gold', 0.11, 0.32, 6, 0.04, 0.39, -0.02);
  cone(p, 'gold', 0.07, 0.22, 6, 0.13, 0.34, 0.03, 0, 0, -0.12);
}

function buildClock(p: PartBuckets): void {
  box(p, 'main', 0.46, 0.34, 0.4, 0, 0.17, 0);
  box(p, 'accent', 0.38, 0.24, 0.04, 0, 0.18, 0.19);
  box(p, 'main', 0.34, 1.0, 0.32, 0, 0.84, -0.01);
  for (const sx of [-1, 1]) {
    box(p, 'main', 0.06, 0.96, 0.06, sx * 0.15, 0.84, 0.14);
  }
  cyl(p, 'gold', 0.012, 0.012, 0.62, 6, 0, 0.92, 0.08, 0, 0, 0.08);
  cyl(p, 'gold', 0.08, 0.08, 0.03, 12, 0.05, 0.62, 0.09, Math.PI / 2, 0, 0);
  box(p, 'main', 0.44, 0.48, 0.38, 0, 1.58, 0);
  for (const sx of [-1, 1]) {
    cyl(p, 'accent', 0.025, 0.025, 0.44, 8, sx * 0.19, 1.58, 0.18);
    cone(p, 'gold', 0.03, 0.12, 6, sx * 0.18, 1.94, 0.12);
  }
  box(p, 'main', 0.38, 0.14, 0.34, 0, 1.88, 0);
  cone(p, 'gold', 0.04, 0.16, 8, 0, 2.0, 0);
  cyl(p, 'accent', 0.16, 0.16, 0.04, 14, 0, 1.58, 0.18, Math.PI / 2, 0, 0);
  torus(p, 'gold', 0.16, 0.015, 0, 1.58, 0.2, 0, 0, 0, 14);
  box(p, 'gold', 0.02, 0.11, 0.02, 0, 1.62, 0.21, 0, 0, -0.3);
  box(p, 'gold', 0.08, 0.02, 0.02, 0.03, 1.58, 0.21, 0, 0, -0.2);
}

function buildDesk(p: PartBuckets): void {
  box(p, 'main', 1.34, 0.07, 0.74, 0, 0.66, 0);
  for (const sx of [-1, 1]) {
    box(p, 'main', 0.34, 0.42, 0.66, sx * 0.46, 0.42, 0);
    for (const sz of [-1, 1]) {
      cyl(p, 'accent', 0.032, 0.022, 0.22, 8, sx * 0.58, 0.11, sz * 0.29);
    }
    for (const dy of [0.32, 0.5]) {
      box(p, 'accent', 0.28, 0.14, 0.03, sx * 0.46, dy, 0.34);
      sphere(p, 'gold', 0.022, sx * 0.46, dy, 0.37);
    }
  }
  box(p, 'accent', 0.5, 0.12, 0.03, 0, 0.56, 0.32);
  sphere(p, 'gold', 0.022, 0, 0.56, 0.35);
  box(p, 'main', 1.28, 0.1, 0.18, 0, 0.73, -0.26);
  cyl(p, 'gold', 0.06, 0.08, 0.04, 10, 0.36, 0.71, -0.08);
  cyl(p, 'gold', 0.08, 0.04, 0.06, 10, 0.36, 0.75, -0.08);
}

function buildStove(p: PartBuckets): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(p, 'accent', 0.04, 0.03, 0.08, 8, sx * 0.36, 0.04, sz * 0.34);
    }
  }
  box(p, 'main', 0.86, 0.72, 0.78, 0, 0.44, -0.01);
  box(p, 'accent', 0.72, 0.44, 0.04, 0, 0.38, 0.39);
  box(p, 'main', 0.54, 0.24, 0.05, 0, 0.38, 0.4);
  cyl(p, 'gold', 0.016, 0.016, 0.64, 8, 0, 0.55, 0.43, 0, 0, Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const kx = -0.27 + i * 0.18;
    cyl(p, 'gold', 0.028, 0.028, 0.04, 8, kx, 0.7, 0.4, Math.PI / 2, 0, 0);
  }
  for (const bx of [-0.21, 0.21]) {
    for (const bz of [-0.16, 0.16]) {
      cyl(p, 'accent', 0.12, 0.13, 0.03, 10, bx, 0.815, bz);
      cyl(p, 'gold', 0.05, 0.05, 0.04, 8, bx, 0.82, bz);
    }
  }
  box(p, 'main', 0.86, 0.12, 0.08, 0, 0.86, -0.36);
  box(p, 'gold', 0.76, 0.04, 0.09, 0, 0.9, -0.36);
}

function buildRefrigerator(p: PartBuckets): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(p, 'accent', 0.04, 0.03, 0.08, 8, sx * 0.32, 0.04, sz * 0.34);
    }
  }
  box(p, 'main', 0.8, 1.78, 0.76, 0, 0.97, -0.02);
  capsule(p, 'main', 0.36, 0.08, 0, 1.62, -0.02, 0, 0, Math.PI / 2);
  box(p, 'accent', 0.74, 1.56, 0.04, 0, 0.95, -0.41);
  box(p, 'main', 0.76, 0.5, 0.08, 0, 1.58, 0.38);
  box(p, 'accent', 0.77, 0.03, 0.09, 0, 1.3, 0.37);
  box(p, 'main', 0.76, 1.12, 0.08, 0, 0.71, 0.38);
  capsule(p, 'gold', 0.022, 0.22, -0.28, 1.56, 0.43);
  capsule(p, 'gold', 0.022, 0.36, -0.28, 0.98, 0.43);
  box(p, 'gold', 0.18, 0.04, 0.02, 0, 1.72, 0.43);
}

function buildCabinet(p: PartBuckets): void {
  box(p, 'main', 0.96, 0.68, 0.5, 0, 0.34, 0);
  for (const sx of [-1, 1]) {
    box(p, 'accent', 0.41, 0.54, 0.04, sx * 0.22, 0.34, 0.25);
    sphere(p, 'gold', 0.025, sx * 0.06, 0.36, 0.28);
  }
  box(p, 'accent', 0.98, 0.06, 0.52, 0, 0.71, 0);
  box(p, 'main', 0.92, 0.7, 0.05, 0, 1.09, -0.2);
  for (const sx of [-1, 1]) {
    box(p, 'main', 0.06, 0.7, 0.38, sx * 0.43, 1.09, -0.04);
  }
  for (const sy of [0.98, 1.22]) {
    box(p, 'main', 0.82, 0.04, 0.34, 0, sy, -0.04);
  }
  cyl(p, 'accent', 0.12, 0.12, 0.02, 10, -0.18, 0.86, -0.12, Math.PI / 2, 0, 0);
  cyl(p, 'gold', 0.06, 0.05, 0.14, 8, 0.18, 1.07, -0.04);
  box(p, 'main', 0.96, 0.08, 0.44, 0, 1.44, -0.02);
}

function buildTable(p: PartBuckets): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(p, 'accent', 0.04, 0.026, 0.68, 8, sx * 0.5, 0.34, sz * 0.35);
      box(p, 'gold', 0.06, 0.06, 0.06, sx * 0.5, 0.64, sz * 0.35);
    }
    box(p, 'accent', 0.04, 0.04, 0.68, sx * 0.5, 0.18, 0);
  }
  box(p, 'accent', 0.98, 0.04, 0.04, 0, 0.18, 0);
  box(p, 'main', 1.04, 0.08, 0.74, 0, 0.64, 0);
  box(p, 'main', 1.14, 0.06, 0.84, 0, 0.7, 0);
  cyl(p, 'accent', 0.18, 0.1, 0.05, 10, 0, 0.75, 0);
  sphere(p, 'gold', 0.04, -0.04, 0.76, 0.02);
  sphere(p, 'gold', 0.035, 0.05, 0.76, -0.03);
}

function buildSink(p: PartBuckets): void {
  box(p, 'main', 0.94, 0.76, 0.6, 0, 0.38, -0.02);
  for (const sx of [-1, 1]) {
    box(p, 'accent', 0.39, 0.56, 0.04, sx * 0.22, 0.34, 0.28);
    sphere(p, 'gold', 0.024, sx * 0.06, 0.38, 0.31);
  }
  box(p, 'accent', 0.88, 0.18, 0.08, 0, 0.72, 0.28);
  for (const sx of [-1, 1]) {
    box(p, 'main', 0.18, 0.12, 0.62, sx * 0.38, 0.8, 0);
  }
  box(p, 'main', 0.94, 0.12, 0.16, 0, 0.8, -0.23);
  box(p, 'accent', 0.62, 0.04, 0.44, 0, 0.7, 0.02);
  cyl(p, 'gold', 0.04, 0.04, 0.02, 8, 0, 0.72, 0.02);
  box(p, 'main', 0.94, 0.22, 0.06, 0, 0.96, -0.28);
  cyl(p, 'gold', 0.022, 0.026, 0.28, 8, 0, 1.0, -0.22);
  torus(p, 'gold', 0.09, 0.02, 0, 1.14, -0.13, 0, Math.PI / 2, 0, 12);
  for (const sx of [-1, 1]) {
    cyl(p, 'gold', 0.035, 0.02, 0.06, 8, sx * 0.14, 0.89, -0.22);
  }
}

function buildCauldron(p: PartBuckets): void {
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    box(p, 'accent', 0.12, 0.07, 0.34, Math.sin(a) * 0.18, 0.04, Math.cos(a) * 0.18, 0, a + 0.3, 0);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.3;
    cyl(p, 'accent', 0.04, 0.06, 0.26, 8, Math.sin(a) * 0.32, 0.13, Math.cos(a) * 0.32, -Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
  }
  sphere(p, 'main', 0.42, 0, 0.43, 0, 1.08, 0.82, 1.08, 12, 10);
  torus(p, 'main', 0.36, 0.055, 0, 0.68, 0, Math.PI / 2, 0, 0, 14);
  torus(p, 'gold', 0.39, 0.02, 0, 0.64, 0, Math.PI / 2, 0, 0, 14);
  for (const sx of [-1, 1]) {
    torus(p, 'gold', 0.07, 0.018, sx * 0.43, 0.52, 0, 0.3, Math.PI / 2, 0, 10);
  }
  cyl(p, 'accent', 0.33, 0.33, 0.04, 12, 0, 0.67, 0);
  for (const [bx, bz, r] of [
    [-0.1, 0.08, 0.06],
    [0.12, -0.06, 0.07],
    [0.02, 0.14, 0.05],
    [-0.14, -0.1, 0.055],
  ] as const) {
    sphere(p, 'gold', r, bx, 0.71, bz);
  }
  cyl(p, 'accent', 0.02, 0.025, 0.38, 6, 0.14, 0.68, -0.08, 0.35, 0, -0.35);
}

function buildPlant(p: PartBuckets): void {
  cyl(p, 'accent', 0.3, 0.26, 0.05, 10, 0, 0.025, 0);
  cyl(p, 'accent', 0.28, 0.2, 0.44, 10, 0, 0.24, 0);
  cyl(p, 'accent', 0.31, 0.29, 0.07, 10, 0, 0.46, 0);
  torus(p, 'gold', 0.29, 0.018, 0, 0.38, 0, Math.PI / 2, 0, 0, 12);
  cyl(p, 'main', 0.26, 0.26, 0.03, 10, 0, 0.48, 0);
  cyl(p, 'accent', 0.035, 0.055, 0.78, 7, 0, 0.84, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const h = 0.78 + (i % 3) * 0.18;
    cyl(p, 'accent', 0.018, 0.028, 0.36, 6, Math.sin(a) * 0.14, h, Math.cos(a) * 0.14, Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6);
    sphere(p, 'main', 0.19, Math.sin(a) * 0.26, h + 0.12, Math.cos(a) * 0.26, 1.1, 0.65, 1.1, 8, 6);
  }
  sphere(p, 'main', 0.24, 0, 1.32, 0, 1.1, 0.85, 1.1, 10, 8);
  cone(p, 'gold', 0.07, 0.16, 6, 0, 1.46, 0);
  sphere(p, 'gold', 0.045, 0.2, 1.18, 0.18);
  sphere(p, 'gold', 0.045, -0.22, 1.05, -0.15);
}

function buildFountain(p: PartBuckets): void {
  cyl(p, 'main', 0.56, 0.52, 0.26, 10, 0, 0.13, 0);
  cyl(p, 'accent', 0.48, 0.48, 0.04, 10, 0, 0.25, 0);
  torus(p, 'gold', 0.54, 0.03, 0, 0.25, 0, Math.PI / 2, 0, 0, 12);
  cyl(p, 'main', 0.12, 0.16, 0.52, 10, 0, 0.5, 0);
  cyl(p, 'main', 0.36, 0.16, 0.14, 10, 0, 0.78, 0);
  cyl(p, 'accent', 0.32, 0.32, 0.03, 10, 0, 0.85, 0);
  cyl(p, 'main', 0.08, 0.11, 0.32, 8, 0, 1.0, 0);
  cyl(p, 'main', 0.22, 0.09, 0.1, 10, 0, 1.16, 0);
  cone(p, 'gold', 0.07, 0.16, 8, 0, 1.26, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    sphere(p, 'gold', 0.04, Math.sin(a) * 0.35, 0.84, Math.cos(a) * 0.35);
  }
}

function buildBench(p: PartBuckets): void {
  for (const sx of [-1, 1]) {
    box(p, 'accent', 0.06, 0.42, 0.06, sx * 0.56, 0.21, 0.18);
    box(p, 'accent', 0.06, 0.94, 0.06, sx * 0.56, 0.47, -0.18);
    box(p, 'accent', 0.06, 0.05, 0.42, sx * 0.56, 0.4, 0);
    box(p, 'accent', 0.06, 0.05, 0.42, sx * 0.56, 0.64, 0);
    sphere(p, 'gold', 0.04, sx * 0.56, 0.96, -0.18);
    sphere(p, 'gold', 0.035, sx * 0.56, 0.66, 0.21);
  }
  for (let i = 0; i < 4; i++) {
    box(p, 'main', 1.2, 0.035, 0.08, 0, 0.43, -0.12 + i * 0.09);
  }
  for (let i = 0; i < 3; i++) {
    box(p, 'main', 1.18, 0.09, 0.035, 0, 0.62 + i * 0.14, -0.18);
  }
  cyl(p, 'gold', 0.07, 0.07, 0.04, 10, 0, 0.92, -0.18, Math.PI / 2, 0, 0);
}

function buildPlanter(p: PartBuckets): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(p, 'accent', 0.1, 0.08, 0.1, sx * 0.44, 0.04, sz * 0.17);
      box(p, 'gold', 0.06, 0.06, 0.06, sx * 0.49, 0.42, sz * 0.21);
    }
  }
  box(p, 'main', 1.02, 0.38, 0.44, 0, 0.27, 0);
  box(p, 'accent', 1.06, 0.05, 0.48, 0, 0.46, 0);
  box(p, 'accent', 0.88, 0.22, 0.03, 0, 0.27, 0.22);
  for (const bx of [-0.32, 0, 0.32]) {
    sphere(p, 'main', 0.17, bx, 0.58, 0, 1.1, 0.9, 1.0, 8, 6);
    cone(p, 'main', 0.14, 0.22, 7, bx, 0.68, 0);
    sphere(p, 'gold', 0.045, bx, 0.78, 0.02);
  }
}

function buildPedestal(p: PartBuckets): void {
  box(p, 'accent', 0.56, 0.1, 0.56, 0, 0.05, 0);
  box(p, 'main', 0.46, 0.1, 0.46, 0, 0.15, 0);
  torus(p, 'gold', 0.19, 0.025, 0, 0.22, 0, Math.PI / 2, 0, 0, 12);
  cyl(p, 'main', 0.16, 0.19, 0.88, 10, 0, 0.66, 0);
  torus(p, 'gold', 0.17, 0.025, 0, 1.1, 0, Math.PI / 2, 0, 0, 12);
  box(p, 'accent', 0.46, 0.08, 0.46, 0, 1.16, 0);
  box(p, 'main', 0.28, 0.08, 0.28, 0, 1.24, 0);
  cone(p, 'gold', 0.12, 0.34, 6, 0, 1.45, 0);
  torus(p, 'accent', 0.14, 0.02, 0, 1.42, 0, 0.4, 0.4, 0, 12);
}

function buildTelescope(p: PartBuckets): void {
  const legAngles = [0, 2.1, -2.1];
  for (let i = 0; i < legAngles.length; i++) {
    const a = legAngles[i]!;
    const dx = Math.sin(a) * 0.2;
    const dz = Math.cos(a) * 0.16;
    cyl(p, 'accent', 0.022, 0.016, 1.12, 7, dx, 0.54, dz, -Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
    cone(p, 'gold', 0.026, 0.07, 6, dx * 1.75, 0.035, dz * 1.65);
  }
  cyl(p, 'gold', 0.14, 0.14, 0.025, 8, 0, 0.48, 0);
  cyl(p, 'accent', 0.06, 0.07, 0.16, 8, 0, 1.1, 0);
  sphere(p, 'accent', 0.07, 0, 1.22, 0);
  cyl(p, 'gold', 0.012, 0.012, 0.28, 6, -0.14, 1.16, 0, 0, 0, -0.9);
  cyl(p, 'gold', 0.045, 0.045, 0.04, 8, -0.22, 1.09, 0, 0, 0, -0.9);
  cyl(p, 'main', 0.07, 0.05, 0.72, 10, 0, 1.36, 0.02, 0.85, 0, 0);
  cyl(p, 'gold', 0.078, 0.074, 0.14, 10, 0, 1.58, 0.26, 0.85, 0, 0);
  cyl(p, 'gold', 0.035, 0.025, 0.14, 8, 0, 1.12, -0.25, 0.85, 0, 0);
  cyl(p, 'gold', 0.018, 0.018, 0.28, 6, 0.07, 1.38, -0.04, 0.85, 0, 0);
}

function buildArmillary(p: PartBuckets): void {
  cyl(p, 'accent', 0.28, 0.34, 0.08, 10, 0, 0.04, 0);
  cyl(p, 'gold', 0.2, 0.25, 0.06, 10, 0, 0.11, 0);
  cyl(p, 'accent', 0.05, 0.08, 0.38, 10, 0, 0.32, 0);
  sphere(p, 'gold', 0.065, 0, 0.32, 0);
  torus(p, 'main', 0.36, 0.022, 0, 0.88, 0, Math.PI / 2, 0, 0, 18);
  torus(p, 'main', 0.35, 0.022, 0, 0.88, 0, 0, 0, 0, 18);
  torus(p, 'gold', 0.32, 0.018, 0, 0.88, 0, 0.5, 0.4, 0, 16);
  torus(p, 'gold', 0.29, 0.018, 0, 0.88, 0, -0.5, -0.4, 0, 16);
  torus(p, 'main', 0.25, 0.028, 0, 0.88, 0, 1.1, 0.3, 0, 16);
  cyl(p, 'gold', 0.012, 0.012, 0.86, 6, 0, 0.88, 0, 0.45, 0, -0.35);
  cone(p, 'gold', 0.035, 0.1, 6, 0.14, 1.24, 0.18, 0.45, 0, -0.35);
  sphere(p, 'accent', 0.085, 0, 0.88, 0);
}

function buildOrrery(p: PartBuckets): void {
  cyl(p, 'accent', 0.32, 0.36, 0.08, 10, 0, 0.04, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    box(p, 'accent', 0.08, 0.08, 0.46, Math.sin(a) * 0.18, 0.05, Math.cos(a) * 0.18, 0, a, 0);
  }
  cyl(p, 'main', 0.22, 0.24, 0.24, 12, 0, 0.2, 0);
  torus(p, 'gold', 0.24, 0.02, 0, 0.32, 0, Math.PI / 2, 0, 0, 14);
  cyl(p, 'gold', 0.14, 0.14, 0.03, 10, 0, 0.46, 0);
  cyl(p, 'gold', 0.1, 0.1, 0.03, 10, 0, 0.56, 0);
  cyl(p, 'accent', 0.03, 0.04, 0.76, 8, 0, 0.68, 0);
  torus(p, 'main', 0.38, 0.02, 0, 0.72, 0, Math.PI / 2, 0, 0, 18);
  sphere(p, 'gold', 0.11, 0, 1.12, 0, 1, 1, 1, 12, 10);
  const arms: readonly [number, number, number, number, MatKey][] = [
    [0.4, 0.18, 0.82, 0.035, 'accent'],
    [1.6, 0.25, 0.88, 0.045, 'main'],
    [2.9, 0.31, 0.94, 0.055, 'accent'],
    [4.2, 0.36, 1.0, 0.065, 'main'],
    [5.4, 0.38, 0.78, 0.04, 'gold'],
  ];
  for (const [ang, rad, y, pr, mat] of arms) {
    const px = Math.sin(ang) * rad;
    const pz = Math.cos(ang) * rad;
    box(p, 'gold', 0.02, 0.02, rad, px * 0.5, y - 0.06, pz * 0.5, 0, ang, 0);
    cyl(p, 'gold', 0.01, 0.01, 0.12, 6, px, y, pz);
    sphere(p, mat, pr, px, y + 0.06, pz);
    if (pr > 0.06) {
      torus(p, 'gold', 0.095, 0.01, px, y + 0.06, pz, 1.2, 0.3, 0, 12);
    }
  }
}

function buildAstrolabe(p: PartBuckets): void {
  box(p, 'accent', 0.68, 0.08, 0.34, 0, 0.04, 0);
  box(p, 'main', 0.52, 0.06, 0.26, 0, 0.1, 0);
  for (const sx of [-1, 1]) {
    box(p, 'accent', 0.06, 0.56, 0.12, sx * 0.26, 0.38, 0, 0, 0, -sx * 0.15);
    sphere(p, 'gold', 0.035, sx * 0.3, 0.66, 0);
  }
  cyl(p, 'accent', 0.04, 0.05, 0.32, 8, 0, 0.26, 0);
  cyl(p, 'main', 0.38, 0.38, 0.06, 18, 0, 0.78, 0, Math.PI / 2, 0, 0);
  torus(p, 'gold', 0.38, 0.025, 0, 0.78, 0, 0, 0, 0, 18);
  cyl(p, 'accent', 0.32, 0.32, 0.07, 16, 0, 0.78, 0, Math.PI / 2, 0, 0);
  torus(p, 'gold', 0.22, 0.018, 0.05, 0.83, 0.045, 0, 0, 0, 14);
  torus(p, 'gold', 0.14, 0.014, -0.04, 0.74, 0.045, 0, 0, 0, 12);
  box(p, 'gold', 0.68, 0.035, 0.03, 0, 0.78, 0.055, 0, 0, 0.65);
  sphere(p, 'gold', 0.035, 0, 0.78, 0.06);
  box(p, 'gold', 0.18, 0.08, 0.05, 0, 1.18, 0);
  torus(p, 'gold', 0.065, 0.016, 0, 1.29, 0, 0, 0, 0, 12);
}

const BUILDERS: Record<string, PropBuilder> = {
  armchair: buildArmchair,
  bookshelf: buildBookshelf,
  globe: buildGlobe,
  globe_celestial: buildGlobeCelestial,
  fireplace: buildFireplace,
  clock: buildClock,
  desk: buildDesk,
  stove: buildStove,
  refrigerator: buildRefrigerator,
  cabinet: buildCabinet,
  table: buildTable,
  sink: buildSink,
  cauldron: buildCauldron,
  plant: buildPlant,
  fountain: buildFountain,
  bench: buildBench,
  planter: buildPlanter,
  pedestal: buildPedestal,
  telescope: buildTelescope,
  armillary: buildArmillary,
  orrery: buildOrrery,
  astrolabe: buildAstrolabe,
};

function clampScale(actual: number, minTarget: number, maxTarget: number): number {
  if (actual <= 0) return 1;
  if (actual < minTarget) return minTarget / actual;
  if (actual > maxTarget) return maxTarget / actual;
  return 1;
}

function normalizeToFootprint(geos: THREE.BufferGeometry[], fp: Footprint): void {
  const [fw, fd, fh] = fp;
  const combined = new THREE.Box3();
  for (const g of geos) {
    g.computeBoundingBox();
    if (g.boundingBox) combined.union(g.boundingBox);
  }
  const size = new THREE.Vector3();
  combined.getSize(size);

  const sx = clampScale(size.x, fw * 0.85, fw * 0.98);
  const sy = clampScale(size.y, fh * 0.88, fh * 0.98);
  const sz = clampScale(size.z, fd * 0.78, fd * 0.98);

  if (sx !== 1 || sy !== 1 || sz !== 1) {
    combined.makeEmpty();
    for (const g of geos) {
      g.scale(sx, sy, sz);
      g.computeBoundingBox();
      if (g.boundingBox) combined.union(g.boundingBox);
    }
  }

  const cx = (combined.min.x + combined.max.x) * 0.5;
  const cz = (combined.min.z + combined.max.z) * 0.5;
  const minY = combined.min.y;
  for (const g of geos) {
    g.translate(-cx, -minY, -cz);
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }
}

function getOrCreateCached(kind: string): CachedProp | null {
  const existing = cache.get(kind);
  if (existing) return existing;

  const builder = BUILDERS[kind];
  const fp = FOOTPRINTS[kind];
  if (!builder || !fp) return null;

  const buckets: PartBuckets = { main: [], accent: [], gold: [] };
  builder(buckets);

  const cached: CachedProp = {};
  const mergedList: THREE.BufferGeometry[] = [];

  for (const key of MAT_KEYS) {
    const parts = buckets[key];
    if (parts.length > 0) {
      const merged = mergeGeometries(parts, false);
      for (const part of parts) part.dispose();
      cached[key] = merged;
      mergedList.push(merged);
    }
  }

  normalizeToFootprint(mergedList, fp);
  cache.set(kind, cached);
  return cached;
}

export function buildProp(kind: string, mats: PropMaterials): THREE.Group | null {
  if (!Object.hasOwn(BUILDERS, kind)) return null;
  const cached = getOrCreateCached(kind);
  if (!cached) return null;

  const group = new THREE.Group();
  group.name = kind;

  for (const key of MAT_KEYS) {
    const geo = cached[key];
    if (geo) {
      const mesh = new THREE.Mesh(geo, mats[key]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  return group;
}

export function disposeProps(): void {
  for (const cached of cache.values()) {
    cached.main?.dispose();
    cached.accent?.dispose();
    cached.gold?.dispose();
  }
  cache.clear();
}