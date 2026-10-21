import * as THREE from 'three';
import { rng } from '../deck.ts';

export type TextureKind =
  | 'library-floor'
  | 'library-wall'
  | 'kitchen-floor'
  | 'kitchen-wall'
  | 'greenhouse-floor'
  | 'greenhouse-wall'
  | 'observatory-floor'
  | 'observatory-wall';

export const TEXTURE_KINDS: readonly TextureKind[] = [
  'library-floor',
  'library-wall',
  'kitchen-floor',
  'kitchen-wall',
  'greenhouse-floor',
  'greenhouse-wall',
  'observatory-floor',
  'observatory-wall',
];

export const TILE_METERS: Readonly<Record<TextureKind, number>> = {
  'library-floor': 2.0,
  'library-wall': 1.2,
  'kitchen-floor': 1.2,
  'kitchen-wall': 0.6,
  'greenhouse-floor': 2.0,
  'greenhouse-wall': 1.0,
  'observatory-floor': 1.2,
  'observatory-wall': 2.0,
};

export interface Pixels {
  size: number;
  color: Uint8ClampedArray;
  bump: Uint8ClampedArray;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const BASE_COLORS: Readonly<Record<TextureKind, Rgb>> = {
  'library-floor': { r: 0x3d, g: 0x28, b: 0x17 },
  'library-wall': { r: 0x2b, g: 0x1d, b: 0x14 },
  'kitchen-floor': { r: 0xd8, g: 0xe2, b: 0xdc },
  'kitchen-wall': { r: 0x94, g: 0xa3, b: 0xb8 },
  'greenhouse-floor': { r: 0x4a, g: 0x5d, b: 0x4e },
  'greenhouse-wall': { r: 0x1b, g: 0x43, b: 0x32 },
  'observatory-floor': { r: 0x0f, g: 0x17, b: 0x2a },
  'observatory-wall': { r: 0x0a, g: 0x0f, b: 0x1d },
};

const LATTICE_SIZE = 64;
const LATTICE_MASK = LATTICE_SIZE - 1;

class PeriodicNoise {
  readonly values: Float32Array;

  constructor(rand: () => number) {
    const total = LATTICE_SIZE * LATTICE_SIZE * 4;
    this.values = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      this.values[i] = rand() * 2 - 1;
    }
  }

  sample(u: number, v: number, periodX: number, periodY: number, layer = 0): number {
    const x = ((u % 1) + 1) % 1 * periodX;
    const y = ((v % 1) + 1) % 1 * periodY;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const x0 = (ix % periodX) & LATTICE_MASK;
    const x1 = ((ix + 1) % periodX) & LATTICE_MASK;
    const y0 = (iy % periodY) & LATTICE_MASK;
    const y1 = ((iy + 1) % periodY) & LATTICE_MASK;
    const base = (layer & 3) * (LATTICE_SIZE * LATTICE_SIZE);

    const v00 = this.values[base + y0 * LATTICE_SIZE + x0];
    const v10 = this.values[base + y0 * LATTICE_SIZE + x1];
    const v01 = this.values[base + y1 * LATTICE_SIZE + x0];
    const v11 = this.values[base + y1 * LATTICE_SIZE + x1];

    const nx0 = v00 + sx * (v10 - v00);
    const nx1 = v01 + sx * (v11 - v01);
    return nx0 + sy * (nx1 - nx0);
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function writeBuffers(
  size: number,
  base: Rgb,
  rawColor: Float32Array,
  rawBump: Float32Array,
  recenterMean: boolean,
): Pixels {
  const count = size * size;
  let shiftR = 0;
  let shiftG = 0;
  let shiftB = 0;

  if (recenterMean) {
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      sumR += rawColor[idx];
      sumG += rawColor[idx + 1];
      sumB += rawColor[idx + 2];
    }
    shiftR = base.r - sumR / count;
    shiftG = base.g - sumG / count;
    shiftB = base.b - sumB / count;
  }

  const color = new Uint8ClampedArray(count * 4);
  const bump = new Uint8ClampedArray(count * 4);

  for (let i = 0; i < count; i++) {
    const cIdx = i * 3;
    const outIdx = i * 4;
    color[outIdx] = Math.round(rawColor[cIdx] + shiftR);
    color[outIdx + 1] = Math.round(rawColor[cIdx + 1] + shiftG);
    color[outIdx + 2] = Math.round(rawColor[cIdx + 2] + shiftB);
    color[outIdx + 3] = 255;

    const bVal = Math.round(rawBump[i]);
    bump[outIdx] = bVal;
    bump[outIdx + 1] = bVal;
    bump[outIdx + 2] = bVal;
    bump[outIdx + 3] = 255;
  }

  return { size, color, bump };
}

function genLibraryFloor(
  size: number,
  base: Rgb,
  rand: () => number,
  noise: PeriodicNoise,
  rawColor: Float32Array,
  rawBump: Float32Array,
): void {
  // 11 planks across 2 m = 0.1818 m wide; 2 joints per 2 m row gives planks ~0.9-1.1 m long.
  const rows = 11;
  const jointA = new Float32Array(rows);
  const jointB = new Float32Array(rows);
  const toneA = new Float32Array(rows);
  const toneB = new Float32Array(rows);

  for (let r = 0; r < rows; r++) {
    // Keep staggered joints away from u=0 so wrap boundaries lie inside smooth plank interiors.
    const a = 0.14 + ((r * 0.37) % 0.24) + (rand() - 0.5) * 0.04;
    const b = a + 0.44 + (rand() - 0.5) * 0.06;
    jointA[r] = a;
    jointB[r] = b;
    toneA[r] = ((r % 2 === 0 ? 1 : -1) * (0.04 + rand() * 0.04));
    toneB[r] = ((r % 2 === 0 ? -1 : 1) * (0.04 + rand() * 0.04));
  }

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const rowCoord = v * rows + 0.5;
    const rowIdx = Math.floor(rowCoord) % rows;
    const rowFrac = rowCoord - Math.floor(rowCoord);
    const distRowGap = Math.min(rowFrac, 1 - rowFrac);
    const rowMask = smoothstep(0.015, 0.055, distRowGap);

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const dA = Math.abs(u - jointA[rowIdx]);
      const dB = Math.abs(u - jointB[rowIdx]);
      const distEndGap = Math.min(dA, dB);
      const endMask = smoothstep(0.004, 0.012, distEndGap);
      const gapMask = Math.min(rowMask, endMask);

      const inSecondPlank = u >= jointA[rowIdx] && u < jointB[rowIdx];
      const plankTone = inSecondPlank ? toneB[rowIdx] : toneA[rowIdx];

      const grain1 = noise.sample(u, v + rowIdx * 0.13, 6, 44, 0);
      const grain2 = noise.sample(u, v + rowIdx * 0.29, 12, 64, 1);
      const grain = grain1 * 4.5 + grain2 * 2.5;

      const factor = 1 + plankTone;
      const gapDarken = (1 - gapMask) * 18;

      const i = y * size + x;
      const cIdx = i * 3;
      rawColor[cIdx] = base.r * factor + grain - gapDarken;
      rawColor[cIdx + 1] = base.g * factor + grain * 0.7 - gapDarken * 0.8;
      rawColor[cIdx + 2] = base.b * factor + grain * 0.45 - gapDarken * 0.6;
      rawBump[i] = 135 * gapMask + grain * 1.8;
    }
  }
}

function genLibraryWall(
  size: number,
  base: Rgb,
  noise: PeriodicNoise,
  rawColor: Float32Array,
  rawBump: Float32Array,
): void {
  // 2 vertical panels across 1.2 m = 0.6 m wide; shifted so u=0 and v=0 sit on flat outer stiles/rails.
  for (let y = 0; y < size; y++) {
    const v = y / size;
    const py = (v + 0.5) % 1;
    const dy = Math.abs(py - 0.5) * 2;

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const px = (u * 2 + 0.5) % 1;
      const dx = Math.abs(px - 0.5) * 2;

      const panelD = Math.max(dx, dy * 0.92);
      // Outer rail/stile (panelD > 0.78) is raised; molding bevels between 0.64 and 0.78; center field recessed.
      const outerStile = smoothstep(0.72, 0.8, panelD);
      const molding = Math.sin(smoothstep(0.62, 0.76, panelD) * Math.PI);
      const frameHeight = outerStile * 32 + molding * 18;

      const grain =
        noise.sample(u, v, 36, 6, 0) * 3.2 + noise.sample(u, v, 64, 12, 1) * 1.8;
      const shade = (outerStile - 0.4) * 5 + molding * 4 + grain;

      const i = y * size + x;
      const cIdx = i * 3;
      rawColor[cIdx] = base.r + shade;
      rawColor[cIdx + 1] = base.g + shade * 0.75;
      rawColor[cIdx + 2] = base.b + shade * 0.55;
      rawBump[i] = 115 + frameHeight + grain * 1.6;
    }
  }
}

function genKitchenFloor(
  size: number,
  base: Rgb,
  noise: PeriodicNoise,
  rawColor: Float32Array,
  rawBump: Float32Array,
): void {
  // 4x4 checker tiles across 1.2 m = 0.3 m per tile.
  const grid = 4;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    const gy = v * grid + 0.5;
    const iy = Math.floor(gy) % grid;
    const fy = gy - Math.floor(gy);
    const dy = Math.min(fy, 1 - fy);

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const gx = u * grid + 0.5;
      const ix = Math.floor(gx) % grid;
      const fx = gx - Math.floor(gx);
      const dx = Math.min(fx, 1 - fx);

      const dEdge = Math.min(dx, dy);
      const tileMask = smoothstep(0.018, 0.045, dEdge);

      const checker = (ix + iy) % 2 === 0 ? 6.5 : -6.5;
      const mottle =
        noise.sample(u, v, 16, 16, 0) * 2.5 + noise.sample(u, v, 32, 32, 1) * 1.2;
      const groutDarken = (1 - tileMask) * 26;
      const delta = checker + mottle - groutDarken;

      const i = y * size + x;
      const cIdx = i * 3;
      rawColor[cIdx] = base.r + delta;
      rawColor[cIdx + 1] = base.g + delta;
      rawColor[cIdx + 2] = base.b + delta;
      rawBump[i] = 90 + tileMask * 55 + mottle * 1.5;
    }
  }
}

function genKitchenWall(
  size: number,
  base: Rgb,
  rand: () => number,
  noise: PeriodicNoise,
  rawColor: Float32Array,
  rawBump: Float32Array,
): void {
  // 0.6 m tile: 4 cols (0.15 m) x 8 rows (0.075 m) in running bond.
  const cols = 4;
  const rows = 8;
  const brickGlaze = new Float32Array(cols * rows);
  for (let i = 0; i < brickGlaze.length; i++) {
    brickGlaze[i] = (rand() - 0.5) * 9;
  }

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const gy = v * rows + 0.5;
    const rowIdx = Math.floor(gy) % rows;
    const fy = gy - Math.floor(gy);
    const dy = Math.min(fy, 1 - fy);

    const rowShift = (rowIdx % 2) * 0.5;

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const gx = u * cols + 0.25 + rowShift;
      const colIdx = Math.floor(gx) % cols;
      const fx = gx - Math.floor(gx);
      const dx = Math.min(fx, 1 - fx);

      // Normalize edge distances to physical units (brick is twice as wide as high).
      const edgeDist = Math.min(dx * 2, dy);
      const brickMask = smoothstep(0.04, 0.11, edgeDist);
      const pillow = smoothstep(0.08, 0.35, edgeDist);

      const glaze = brickGlaze[rowIdx * cols + colIdx];
      const ripple =
        noise.sample(u, v, 16, 16, 0) * 2.8 + noise.sample(u, v, 32, 32, 1) * 1.4;
      const groutLight = (1 - brickMask) * 22;

      const delta = brickMask * (glaze + ripple) + groutLight;
      const i = y * size + x;
      const cIdx = i * 3;
      rawColor[cIdx] = base.r + delta * 0.9;
      rawColor[cIdx + 1] = base.g + delta * 0.95;
      rawColor[cIdx + 2] = base.b + delta;
      rawBump[i] = 95 + brickMask * 35 + pillow * 18 + ripple * 1.5;
    }
  }
}

function genGreenhouseFloor(
  size: number,
  base: Rgb,
  rand: () => number,
  noise: PeriodicNoise,
  rawColor: Float32Array,
  rawBump: Float32Array,
): void {
  // 5x5 periodic Voronoi cells across 2 m (~0.4 m per flagstone).
  const grid = 5;
  const numCells = grid * grid;
  const seedX = new Float32Array(numCells);
  const seedY = new Float32Array(numCells);
  const stoneTone = new Float32Array(numCells);

  for (let cy = 0; cy < grid; cy++) {
    for (let cx = 0; cx < grid; cx++) {
      const idx = cy * grid + cx;
      // Seeds sit near integer grid points so cracks lie near half-integers, away from u=0 and v=0.
      seedX[idx] = cx + (rand() - 0.5) * 0.38;
      seedY[idx] = cy + (rand() - 0.5) * 0.38;
      stoneTone[idx] = (rand() - 0.5) * 15;
    }
  }

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;

      const warpX = noise.sample(u, v, 10, 10, 0) * 0.035;
      const warpY = noise.sample(u, v, 10, 10, 1) * 0.035;
      const px = (((u + warpX) % 1) + 1) % 1 * grid;
      const py = (((v + warpY) % 1) + 1) % 1 * grid;

      const gx = Math.round(px);
      const gy = Math.round(py);

      let minD1 = 1e9;
      let minD2 = 1e9;
      let bestCell = 0;

      for (let oy = -1; oy <= 1; oy++) {
        const wy = ((gy + oy) % grid + grid) % grid;
        for (let ox = -1; ox <= 1; ox++) {
          const wx = ((gx + ox) % grid + grid) % grid;
          const cellIdx = wy * grid + wx;

          let dx = seedX[cellIdx] - px;
          let dy = seedY[cellIdx] - py;
          if (dx > grid * 0.5) dx -= grid;
          if (dx < -grid * 0.5) dx += grid;
          if (dy > grid * 0.5) dy -= grid;
          if (dy < -grid * 0.5) dy += grid;

          const d = Math.hypot(dx, dy);
          if (d < minD1) {
            minD2 = minD1;
            minD1 = d;
            bestCell = cellIdx;
          } else if (d < minD2) {
            minD2 = d;
          }
        }
      }

      const crackDist = minD2 - minD1;
      const stoneMask = smoothstep(0.035, 0.095, crackDist);
      const grain =
        noise.sample(u, v, 20, 20, 2) * 4.5 + noise.sample(u, v, 40, 40, 3) * 2.2;
      const tone = stoneTone[bestCell] + grain;

      // Cracks have slightly green moss.
      const moss = 1 - stoneMask;
      const i = y * size + x;
      const cIdx = i * 3;
      rawColor[cIdx] = base.r + stoneMask * tone - moss * 12;
      rawColor[cIdx + 1] = base.g + stoneMask * tone + moss * 5;
      rawColor[cIdx + 2] = base.b + stoneMask * tone - moss * 11;
      rawBump[i] = 80 + stoneMask * 60 + grain * 2;
    }
  }
}

function genGreenhouseWall(
  size: number,
  base: Rgb,
  noise: PeriodicNoise,
  rawColor: Float32Array,
  rawBump: Float32Array,
): void {
  // 1 m tile: mullions every 0.5 m vertical (2 per tile) and 1.0 m horizontal (1 per tile).
  for (let y = 0; y < size; y++) {
    const v = y / size;
    const py = (v + 0.5) % 1;
    const dy = Math.min(py, 1 - py);

    // Smooth periodic vertical gradient inside each pane.
    const vertGrad = Math.sin(py * Math.PI) * 7 - 3.5;

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const px = (u * 2 + 0.5) % 1;
      const dx = Math.min(px, 1 - px) * 0.5;

      const distToMullion = Math.min(dx, dy);
      const paneMask = smoothstep(0.028, 0.052, distToMullion);
      const mullionMask = 1 - paneMask;

      const shimmer =
        noise.sample(u, v, 12, 12, 0) * 2.5 + noise.sample(u, v, 24, 24, 1) * 1.2;
      const delta = paneMask * (4.5 + vertGrad) - mullionMask * 12 + shimmer;

      const i = y * size + x;
      const cIdx = i * 3;
      rawColor[cIdx] = base.r + delta * 0.75;
      rawColor[cIdx + 1] = base.g + delta;
      rawColor[cIdx + 2] = base.b + delta * 0.9;
      rawBump[i] = 115 + mullionMask * 65 + shimmer * 1.5;
    }
  }
}

function genObservatoryFloor(
  size: number,
  base: Rgb,
  noise: PeriodicNoise,
  rawColor: Float32Array,
  rawBump: Float32Array,
): void {
  // 1.2 m tile with 0.6 m polished slate tiles (2x2) and faint veins.
  const grid = 2;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    const gy = v * grid + 0.5;
    const iy = Math.floor(gy) % grid;
    const fy = gy - Math.floor(gy);
    const dy = Math.min(fy, 1 - fy);

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const gx = u * grid + 0.5;
      const ix = Math.floor(gx) % grid;
      const fx = gx - Math.floor(gx);
      const dx = Math.min(fx, 1 - fx);

      const dJoint = Math.min(dx, dy);
      const tileMask = smoothstep(0.008, 0.022, dJoint);

      const wx = u + noise.sample(u, v, 6, 6, 0) * 0.08;
      const wy = v + noise.sample(u, v, 6, 6, 1) * 0.08;
      const veinField = noise.sample(wx + ix * 0.3, wy + iy * 0.3, 10, 10, 2);
      const vein = Math.exp(-veinField * veinField * 38) * 8.5;

      const slateWave = noise.sample(u, v, 16, 16, 3) * 2.5;
      const tileShift = ((ix + iy * 2) % 3 - 1) * 1.8;
      const jointDark = (1 - tileMask) * 8;
      const delta = tileMask * (vein + slateWave + tileShift) - jointDark;

      const i = y * size + x;
      const cIdx = i * 3;
      rawColor[cIdx] = base.r + delta * 0.75;
      rawColor[cIdx + 1] = base.g + delta * 0.85;
      rawColor[cIdx + 2] = base.b + delta;
      rawBump[i] = 105 + tileMask * 30 + slateWave * 1.5 - vein * 0.6;
    }
  }
}

function genObservatoryWall(
  size: number,
  base: Rgb,
  rand: () => number,
  noise: PeriodicNoise,
  rawColor: Float32Array,
  rawBump: Float32Array,
): void {
  // Smooth dark plaster across the whole periodic domain.
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const plaster =
        noise.sample(u, v, 12, 12, 0) * 2.6 + noise.sample(u, v, 24, 24, 1) * 1.4;

      const i = y * size + x;
      const cIdx = i * 3;
      rawColor[cIdx] = base.r + plaster * 0.7;
      rawColor[cIdx + 1] = base.g + plaster * 0.85;
      rawColor[cIdx + 2] = base.b + plaster;
      rawBump[i] = 128 + plaster * 3;
    }
  }

  // Faint speckles: 0.45% of pixels (<= 1%), at most +60 brighter (+14 to +38).
  const speckleCount = Math.floor(size * size * 0.0045);
  const innerSpan = size - 4;
  for (let s = 0; s < speckleCount; s++) {
    const sx = 2 + Math.floor(rand() * innerSpan);
    const sy = 2 + Math.floor(rand() * innerSpan);
    const boost = 14 + rand() * 24;
    const i = sy * size + sx;
    const cIdx = i * 3;
    rawColor[cIdx] = base.r + boost * 0.85;
    rawColor[cIdx + 1] = base.g + boost * 0.92;
    rawColor[cIdx + 2] = base.b + boost;
    rawBump[i] = 152;
  }
}

export function generate(kind: TextureKind, size: 256 | 512, seed?: string): Pixels {
  const actualSeed = seed ?? kind;
  const rand = rng(actualSeed);
  const noise = new PeriodicNoise(rand);
  const base = BASE_COLORS[kind];

  const count = size * size;
  const rawColor = new Float32Array(count * 3);
  const rawBump = new Float32Array(count);

  switch (kind) {
    case 'library-floor':
      genLibraryFloor(size, base, rand, noise, rawColor, rawBump);
      return writeBuffers(size, base, rawColor, rawBump, true);
    case 'library-wall':
      genLibraryWall(size, base, noise, rawColor, rawBump);
      return writeBuffers(size, base, rawColor, rawBump, true);
    case 'kitchen-floor':
      genKitchenFloor(size, base, noise, rawColor, rawBump);
      return writeBuffers(size, base, rawColor, rawBump, true);
    case 'kitchen-wall':
      genKitchenWall(size, base, rand, noise, rawColor, rawBump);
      return writeBuffers(size, base, rawColor, rawBump, true);
    case 'greenhouse-floor':
      genGreenhouseFloor(size, base, rand, noise, rawColor, rawBump);
      return writeBuffers(size, base, rawColor, rawBump, true);
    case 'greenhouse-wall':
      genGreenhouseWall(size, base, noise, rawColor, rawBump);
      return writeBuffers(size, base, rawColor, rawBump, true);
    case 'observatory-floor':
      genObservatoryFloor(size, base, noise, rawColor, rawBump);
      return writeBuffers(size, base, rawColor, rawBump, true);
    case 'observatory-wall':
      genObservatoryWall(size, base, rand, noise, rawColor, rawBump);
      return writeBuffers(size, base, rawColor, rawBump, false);
  }
}

const textureCache = new Map<
  TextureKind,
  { map: THREE.DataTexture; bumpMap: THREE.DataTexture }
>();

const materialCache = new Map<
  0 | 1 | 2 | 3,
  { floor: THREE.MeshStandardMaterial; wall: THREE.MeshStandardMaterial }
>();

function configureDataTexture(
  data: Uint8ClampedArray,
  size: number,
  colorSpace: THREE.ColorSpace,
): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = colorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function texturesFor(kind: TextureKind): {
  map: THREE.DataTexture;
  bumpMap: THREE.DataTexture;
} {
  const cached = textureCache.get(kind);
  if (cached) {
    return cached;
  }
  const pixels = generate(kind, 512, kind);
  const entry = {
    map: configureDataTexture(pixels.color, pixels.size, THREE.SRGBColorSpace),
    bumpMap: configureDataTexture(pixels.bump, pixels.size, THREE.NoColorSpace),
  };
  textureCache.set(kind, entry);
  return entry;
}

const ROOM_CONFIG: Readonly<
  Record<
    0 | 1 | 2 | 3,
    { floorKind: TextureKind; wallKind: TextureKind; floorRoughness: number }
  >
> = {
  0: { floorKind: 'library-floor', wallKind: 'library-wall', floorRoughness: 0.55 },
  1: { floorKind: 'kitchen-floor', wallKind: 'kitchen-wall', floorRoughness: 0.35 },
  2: { floorKind: 'greenhouse-floor', wallKind: 'greenhouse-wall', floorRoughness: 0.8 },
  3: { floorKind: 'observatory-floor', wallKind: 'observatory-wall', floorRoughness: 0.3 },
};

export function roomMaterials(room: 0 | 1 | 2 | 3): {
  floor: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
} {
  const cached = materialCache.get(room);
  if (cached) {
    return cached;
  }
  const cfg = ROOM_CONFIG[room];
  const floorTex = texturesFor(cfg.floorKind);
  const wallTex = texturesFor(cfg.wallKind);

  const floor = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: floorTex.map,
    bumpMap: floorTex.bumpMap,
    bumpScale: 1,
    roughness: cfg.floorRoughness,
    metalness: 0,
  });

  const wall = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: wallTex.map,
    bumpMap: wallTex.bumpMap,
    bumpScale: 1,
    roughness: 0.8,
    metalness: 0,
  });

  const entry = { floor, wall };
  materialCache.set(room, entry);
  return entry;
}

export function scaleUVs(
  geom: THREE.BufferGeometry,
  widthM: number,
  heightM: number,
  tileMeters: number,
): void {
  const uv = geom.getAttribute('uv');
  if (!uv) {
    return;
  }
  const scaleU = widthM / tileMeters;
  const scaleV = heightM / tileMeters;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * scaleU, uv.getY(i) * scaleV);
  }
  uv.needsUpdate = true;
}

export function disposeTextures(): void {
  for (const { map, bumpMap } of textureCache.values()) {
    map.dispose();
    bumpMap.dispose();
  }
  textureCache.clear();

  for (const { floor, wall } of materialCache.values()) {
    floor.dispose();
    wall.dispose();
  }
  materialCache.clear();
}