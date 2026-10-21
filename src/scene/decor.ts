import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROOMS } from '../data/palace.ts';
import { rng } from '../deck.ts';

export type DecorZone = 'floor' | 'ceiling' | 'wall';

export interface DecorItem {
  kind: string;
  room: number;
  zone: DecorZone;
  min: [number, number, number];
  max: [number, number, number];
}

type MaterialKey =
  | 'darkWood'
  | 'brass'
  | 'crimson'
  | 'slateIron'
  | 'stone'
  | 'foliage'
  | 'warmGlow'
  | 'celestialGlow';

interface LocalSpec {
  kind: string;
  room: number;
  zone: DecorZone;
  lx0: number;
  y0: number;
  lz0: number;
  lx1: number;
  y1: number;
  lz1: number;
}

interface Part {
  geo: THREE.BufferGeometry;
  mat: MaterialKey;
}

const LOCAL_SPECS: readonly LocalSpec[] = [
  // Room 0: Library
  { kind: 'rug', room: 0, zone: 'floor', lx0: 3.2, y0: 0.0, lz0: 3.5, lx1: 10.8, y1: 0.025, lz1: 10.5 },
  { kind: 'ceiling_beam', room: 0, zone: 'ceiling', lx0: 3.3, y0: 3.72, lz0: 0.25, lx1: 3.7, y1: 3.98, lz1: 13.75 },
  { kind: 'ceiling_beam', room: 0, zone: 'ceiling', lx0: 10.3, y0: 3.72, lz0: 0.25, lx1: 10.7, y1: 3.98, lz1: 13.75 },
  { kind: 'chandelier', room: 0, zone: 'ceiling', lx0: 6.0, y0: 2.65, lz0: 6.0, lx1: 8.0, y1: 3.96, lz1: 8.0 },
  { kind: 'wall_sconce', room: 0, zone: 'wall', lx0: 3.78, y0: 1.8, lz0: 13.45, lx1: 4.22, y1: 2.52, lz1: 13.78 },
  { kind: 'wall_sconce', room: 0, zone: 'wall', lx0: 9.78, y0: 1.8, lz0: 13.45, lx1: 10.22, y1: 2.52, lz1: 13.78 },
  { kind: 'corner_column', room: 0, zone: 'wall', lx0: 0.22, y0: 0.0, lz0: 0.22, lx1: 0.62, y1: 3.98, lz1: 0.62 },
  { kind: 'corner_column', room: 0, zone: 'wall', lx0: 13.38, y0: 0.0, lz0: 0.22, lx1: 13.78, y1: 3.98, lz1: 0.62 },

  // Room 1: Kitchen
  { kind: 'tile_inlay', room: 1, zone: 'floor', lx0: 3.4, y0: 0.0, lz0: 3.8, lx1: 10.6, y1: 0.022, lz1: 10.2 },
  { kind: 'pot_rack', room: 1, zone: 'ceiling', lx0: 5.6, y0: 2.66, lz0: 6.1, lx1: 8.4, y1: 3.96, lz1: 7.9 },
  { kind: 'pendant_lamp', room: 1, zone: 'ceiling', lx0: 3.8, y0: 2.72, lz0: 4.2, lx1: 4.6, y1: 3.96, lz1: 5.0 },
  { kind: 'pendant_lamp', room: 1, zone: 'ceiling', lx0: 6.6, y0: 2.72, lz0: 9.0, lx1: 7.4, y1: 3.96, lz1: 9.8 },
  { kind: 'pendant_lamp', room: 1, zone: 'ceiling', lx0: 9.4, y0: 2.72, lz0: 4.2, lx1: 10.2, y1: 3.96, lz1: 5.0 },
  { kind: 'high_shelf', room: 1, zone: 'ceiling', lx0: 3.6, y0: 2.65, lz0: 13.32, lx1: 10.4, y1: 3.25, lz1: 13.78 },
  { kind: 'utensil_rail', room: 1, zone: 'wall', lx0: 3.75, y0: 1.25, lz0: 13.48, lx1: 4.25, y1: 1.95, lz1: 13.78 },
  { kind: 'utensil_rail', room: 1, zone: 'wall', lx0: 9.75, y0: 1.25, lz0: 13.48, lx1: 10.25, y1: 1.95, lz1: 13.78 },
  { kind: 'corner_column', room: 1, zone: 'wall', lx0: 0.22, y0: 0.0, lz0: 0.22, lx1: 0.62, y1: 3.98, lz1: 0.62 },

  // Room 2: Greenhouse
  { kind: 'stone_path', room: 2, zone: 'floor', lx0: 2.2, y0: 0.0, lz0: 5.6, lx1: 11.8, y1: 0.024, lz1: 8.4 },
  { kind: 'roof_frame', room: 2, zone: 'ceiling', lx0: 1.2, y0: 3.75, lz0: 1.2, lx1: 12.8, y1: 3.98, lz1: 12.8 },
  { kind: 'hanging_basket', room: 2, zone: 'ceiling', lx0: 4.1, y0: 2.62, lz0: 4.4, lx1: 4.9, y1: 3.96, lz1: 5.2 },
  { kind: 'hanging_basket', room: 2, zone: 'ceiling', lx0: 9.1, y0: 2.62, lz0: 4.4, lx1: 9.9, y1: 3.96, lz1: 5.2 },
  { kind: 'hanging_basket', room: 2, zone: 'ceiling', lx0: 4.1, y0: 2.62, lz0: 8.8, lx1: 4.9, y1: 3.96, lz1: 9.6 },
  { kind: 'hanging_basket', room: 2, zone: 'ceiling', lx0: 9.1, y0: 2.62, lz0: 8.8, lx1: 9.9, y1: 3.96, lz1: 9.6 },
  { kind: 'wall_trellis', room: 2, zone: 'wall', lx0: 3.75, y0: 0.4, lz0: 13.48, lx1: 4.25, y1: 2.45, lz1: 13.78 },
  { kind: 'wall_trellis', room: 2, zone: 'wall', lx0: 9.75, y0: 0.4, lz0: 13.48, lx1: 10.25, y1: 2.45, lz1: 13.78 },
  { kind: 'corner_column', room: 2, zone: 'wall', lx0: 0.22, y0: 0.0, lz0: 13.38, lx1: 0.62, y1: 3.98, lz1: 13.78 },

  // Room 3: Observatory
  { kind: 'zodiac_ring', room: 3, zone: 'floor', lx0: 3.8, y0: 0.0, lz0: 3.8, lx1: 10.2, y1: 0.025, lz1: 10.2 },
  { kind: 'meridian_arc', room: 3, zone: 'ceiling', lx0: 2.0, y0: 2.85, lz0: 6.65, lx1: 12.0, y1: 3.96, lz1: 7.35 },
  { kind: 'meridian_arc', room: 3, zone: 'ceiling', lx0: 6.65, y0: 2.85, lz0: 2.0, lx1: 7.35, y1: 3.96, lz1: 12.0 },
  { kind: 'star_lamp', room: 3, zone: 'ceiling', lx0: 4.2, y0: 2.68, lz0: 4.2, lx1: 4.8, y1: 3.96, lz1: 4.8 },
  { kind: 'star_lamp', room: 3, zone: 'ceiling', lx0: 9.2, y0: 2.68, lz0: 4.2, lx1: 9.8, y1: 3.96, lz1: 4.8 },
  { kind: 'star_lamp', room: 3, zone: 'ceiling', lx0: 4.2, y0: 2.68, lz0: 9.2, lx1: 4.8, y1: 3.96, lz1: 9.8 },
  { kind: 'star_lamp', room: 3, zone: 'ceiling', lx0: 9.2, y0: 2.68, lz0: 9.2, lx1: 9.8, y1: 3.96, lz1: 9.8 },
  { kind: 'star_plaque', room: 3, zone: 'wall', lx0: 3.75, y0: 1.1, lz0: 13.48, lx1: 4.25, y1: 2.35, lz1: 13.78 },
  { kind: 'star_plaque', room: 3, zone: 'wall', lx0: 9.75, y0: 1.1, lz0: 13.48, lx1: 10.25, y1: 2.35, lz1: 13.78 },
  { kind: 'corner_column', room: 3, zone: 'wall', lx0: 0.22, y0: 0.0, lz0: 0.22, lx1: 0.62, y1: 3.98, lz1: 0.62 },
];

export function decorLayout(): readonly DecorItem[] {
  return LOCAL_SPECS.map((spec) => {
    const room = ROOMS[spec.room];
    if (!room) {
      throw new Error(`Invalid room index ${spec.room}`);
    }
    const { x0, z0 } = room.rect;
    return {
      kind: spec.kind,
      room: spec.room,
      zone: spec.zone,
      min: [
        Number((x0 + spec.lx0).toFixed(4)),
        Number(spec.y0.toFixed(4)),
        Number((z0 + spec.lz0).toFixed(4)),
      ],
      max: [
        Number((x0 + spec.lx1).toFixed(4)),
        Number(spec.y1.toFixed(4)),
        Number((z0 + spec.lz1).toFixed(4)),
      ],
    };
  });
}

function toCleanNonIndexed(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = src.index ? src.toNonIndexed() : src.clone();
  src.dispose();
  for (const attr of Object.keys(geo.attributes)) {
    if (attr !== 'position' && attr !== 'normal') {
      geo.deleteAttribute(attr);
    }
  }
  return geo;
}

function boxPart(
  mat: MaterialKey,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): Part {
  const raw = new THREE.BoxGeometry(sx, sy, sz);
  raw.translate(cx, cy, cz);
  return { geo: toCleanNonIndexed(raw), mat };
}

function cylPart(
  mat: MaterialKey,
  cx: number,
  cy: number,
  cz: number,
  rTop: number,
  rBot: number,
  h: number,
  segs = 10,
): Part {
  const raw = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  raw.translate(cx, cy, cz);
  return { geo: toCleanNonIndexed(raw), mat };
}

function ringFlatPart(
  mat: MaterialKey,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  tube: number,
  radialSegs = 6,
  tubularSegs = 20,
): Part {
  const raw = new THREE.TorusGeometry(radius, tube, radialSegs, tubularSegs);
  raw.rotateX(Math.PI / 2);
  raw.translate(cx, cy, cz);
  return { geo: toCleanNonIndexed(raw), mat };
}

// Fits all parts of a DecorItem so their combined vertex bounds match [item.min, item.max].
function fitPartsToItemAABB(parts: Part[], item: DecorItem): void {
  let gx0 = Infinity;
  let gy0 = Infinity;
  let gz0 = Infinity;
  let gx1 = -Infinity;
  let gy1 = -Infinity;
  let gz1 = -Infinity;

  for (const part of parts) {
    const pos = part.geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (x < gx0) gx0 = x;
      if (y < gy0) gy0 = y;
      if (z < gz0) gz0 = z;
      if (x > gx1) gx1 = x;
      if (y > gy1) gy1 = y;
      if (z > gz1) gz1 = z;
    }
  }

  const dx = gx1 - gx0 || 1;
  const dy = gy1 - gy0 || 1;
  const dz = gz1 - gz0 || 1;
  const tx = item.max[0] - item.min[0];
  const ty = item.max[1] - item.min[1];
  const tz = item.max[2] - item.min[2];

  for (const part of parts) {
    const pos = part.geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        item.min[0] + ((pos.getX(i) - gx0) / dx) * tx,
        item.min[1] + ((pos.getY(i) - gy0) / dy) * ty,
        item.min[2] + ((pos.getZ(i) - gz0) / dz) * tz,
      );
    }
    pos.needsUpdate = true;
    part.geo.computeVertexNormals();
  }
}

function buildItemParts(item: DecorItem, rand: () => number): Part[] {
  const [x0, y0, z0] = item.min;
  const [x1, y1, z1] = item.max;
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const cz = (z0 + z1) * 0.5;
  const sx = x1 - x0;
  const sy = y1 - y0;
  const sz = z1 - z0;
  const parts: Part[] = [];

  switch (item.kind) {
    case 'rug': {
      parts.push(boxPart('crimson', cx, y0 + sy * 0.35, cz, sx, sy * 0.7, sz));
      const bw = 0.28;
      parts.push(boxPart('brass', cx, y0 + sy * 0.75, z0 + bw * 0.5, sx - 0.1, sy * 0.5, bw));
      parts.push(boxPart('brass', cx, y0 + sy * 0.75, z1 - bw * 0.5, sx - 0.1, sy * 0.5, bw));
      parts.push(boxPart('brass', x0 + bw * 0.5, y0 + sy * 0.75, cz, bw, sy * 0.5, sz - 0.1));
      parts.push(boxPart('brass', x1 - bw * 0.5, y0 + sy * 0.75, cz, bw, sy * 0.5, sz - 0.1));
      parts.push(cylPart('brass', cx, y0 + sy * 0.8, cz, 0.85, 0.85, sy * 0.4, 12));
      break;
    }

    case 'ceiling_beam': {
      parts.push(boxPart('darkWood', cx, cy + sy * 0.15, cz, sx * 0.85, sy * 0.7, sz));
      parts.push(boxPart('darkWood', cx, y0 + sy * 0.25, z0 + 0.4, sx, sy * 0.5, 0.8));
      parts.push(boxPart('darkWood', cx, y0 + sy * 0.25, z1 - 0.4, sx, sy * 0.5, 0.8));
      parts.push(boxPart('brass', cx, cy, cz, sx, sy * 0.75, 0.25));
      break;
    }

    case 'chandelier': {
      parts.push(cylPart('brass', cx, y1 - 0.08, cz, 0.18, 0.12, 0.16, 10));
      parts.push(cylPart('brass', cx, cy + 0.1, cz, 0.05, 0.08, sy * 0.75, 8));
      parts.push(ringFlatPart('brass', cx, y0 + 0.22, cz, sx * 0.42, 0.04, 6, 18));
      parts.push(ringFlatPart('brass', cx, y0 + 0.48, cz, sx * 0.24, 0.03, 6, 14));
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const r = sx * 0.42;
        const ax = cx + Math.cos(angle) * r;
        const az = cz + Math.sin(angle) * r;
        parts.push(cylPart('brass', ax, y0 + 0.3, az, 0.06, 0.04, 0.14, 8));
        parts.push(cylPart('warmGlow', ax, y0 + 0.44, az, 0.03, 0.045, 0.16, 8));
      }
      parts.push(cylPart('brass', cx, y0 + 0.08, cz, 0.12, 0.02, 0.16, 8));
      break;
    }

    case 'wall_sconce': {
      parts.push(boxPart('darkWood', cx, cy, z1 - 0.04, sx * 0.85, sy * 0.9, 0.08));
      parts.push(boxPart('brass', cx, cy - 0.1, cz, 0.08, 0.08, sz * 0.8));
      parts.push(cylPart('brass', cx, cy + 0.04, z0 + 0.08, 0.09, 0.06, 0.16, 8));
      parts.push(cylPart('warmGlow', cx, y1 - 0.12, z0 + 0.08, 0.055, 0.07, 0.24, 8));
      break;
    }

    case 'corner_column': {
      const mat: MaterialKey =
        item.room === 0 ? 'darkWood' : item.room === 2 ? 'stone' : 'slateIron';
      parts.push(boxPart(mat, cx, y0 + 0.2, cz, sx, 0.4, sz));
      parts.push(boxPart(mat, cx, y1 - 0.2, cz, sx, 0.4, sz));
      parts.push(cylPart(mat, cx, cy, cz, sx * 0.38, sx * 0.42, sy - 0.4, 10));
      parts.push(boxPart('brass', cx, y0 + 0.42, cz, sx * 0.92, 0.06, sz * 0.92));
      parts.push(boxPart('brass', cx, y1 - 0.42, cz, sx * 0.92, 0.06, sz * 0.92));
      break;
    }

    case 'tile_inlay': {
      parts.push(boxPart('stone', cx, y0 + sy * 0.35, cz, sx, sy * 0.7, sz));
      const bw = 0.22;
      parts.push(boxPart('slateIron', cx, y0 + sy * 0.75, z0 + bw * 0.5, sx, sy * 0.5, bw));
      parts.push(boxPart('slateIron', cx, y0 + sy * 0.75, z1 - bw * 0.5, sx, sy * 0.5, bw));
      parts.push(boxPart('slateIron', x0 + bw * 0.5, y0 + sy * 0.75, cz, bw, sy * 0.5, sz));
      parts.push(boxPart('slateIron', x1 - bw * 0.5, y0 + sy * 0.75, cz, bw, sy * 0.5, sz));
      for (let i = 0; i < 5; i++) {
        const tx = x0 + 1.1 + i * 1.25;
        parts.push(boxPart('crimson', tx, y0 + sy * 0.8, cz, 0.65, sy * 0.4, 0.65));
      }
      break;
    }

    case 'pot_rack': {
      parts.push(boxPart('slateIron', cx, y0 + 0.52, z0 + 0.06, sx, 0.08, 0.08));
      parts.push(boxPart('slateIron', cx, y0 + 0.52, z1 - 0.06, sx, 0.08, 0.08));
      parts.push(boxPart('slateIron', x0 + 0.06, y0 + 0.52, cz, 0.08, 0.08, sz));
      parts.push(boxPart('slateIron', x1 - 0.06, y0 + 0.52, cz, 0.08, 0.08, sz));
      for (const [rx, rz] of [
        [x0 + 0.2, z0 + 0.2],
        [x1 - 0.2, z0 + 0.2],
        [x0 + 0.2, z1 - 0.2],
        [x1 - 0.2, z1 - 0.2],
      ] as const) {
        parts.push(cylPart('slateIron', rx, (y0 + 0.52 + y1) * 0.5, rz, 0.025, 0.025, y1 - (y0 + 0.52), 6));
      }
      for (let i = 0; i < 4; i++) {
        const px = x0 + 0.45 + i * 0.62;
        const pz = i % 2 === 0 ? z0 + 0.25 : z1 - 0.25;
        parts.push(cylPart('slateIron', px, y0 + 0.36, pz, 0.015, 0.015, 0.28, 6));
        parts.push(cylPart('brass', px, y0 + 0.14, pz, 0.18, 0.15, 0.26, 10));
      }
      break;
    }

    case 'pendant_lamp': {
      parts.push(cylPart('slateIron', cx, y1 - 0.05, cz, 0.12, 0.12, 0.1, 8));
      parts.push(cylPart('slateIron', cx, cy + 0.12, cz, 0.02, 0.02, sy * 0.72, 6));
      parts.push(cylPart('slateIron', cx, y0 + 0.24, cz, 0.08, sx * 0.46, 0.28, 12));
      parts.push(cylPart('warmGlow', cx, y0 + 0.1, cz, 0.09, 0.06, 0.2, 10));
      break;
    }

    case 'high_shelf': {
      parts.push(boxPart('darkWood', cx, y0 + 0.16, cz, sx, 0.08, sz * 0.85));
      parts.push(boxPart('slateIron', x0 + 0.3, y0 + 0.08, z1 - 0.08, 0.08, 0.16, 0.16));
      parts.push(boxPart('slateIron', cx, y0 + 0.08, z1 - 0.08, 0.08, 0.16, 0.16));
      parts.push(boxPart('slateIron', x1 - 0.3, y0 + 0.08, z1 - 0.08, 0.08, 0.16, 0.16));
      for (let i = 0; i < 8; i++) {
        const jx = x0 + 0.45 + i * 0.82;
        const jh = 0.22 + rand() * 0.16;
        const mat: MaterialKey = i % 3 === 0 ? 'brass' : i % 3 === 1 ? 'stone' : 'crimson';
        parts.push(cylPart(mat, jx, y0 + 0.2 + jh * 0.5, cz, 0.11, 0.12, jh, 8));
      }
      break;
    }

    case 'utensil_rail': {
      parts.push(boxPart('slateIron', cx, y1 - 0.08, z1 - 0.04, sx, 0.12, 0.08));
      parts.push(boxPart('brass', cx, y1 - 0.08, z0 + 0.06, sx * 0.92, 0.05, 0.05));
      for (let i = 0; i < 3; i++) {
        const ux = x0 + 0.1 + i * 0.15;
        parts.push(boxPart('brass', ux, cy - 0.04, z0 + 0.06, 0.04, sy * 0.72, 0.04));
        parts.push(cylPart('brass', ux, y0 + 0.1, z0 + 0.06, 0.07, 0.07, 0.18, 8));
      }
      break;
    }

    case 'stone_path': {
      parts.push(boxPart('slateIron', cx, y0 + sy * 0.3, cz, sx, sy * 0.6, sz));
      for (let i = 0; i < 7; i++) {
        const px = x0 + 0.75 + i * 1.35;
        parts.push(boxPart('stone', px, y0 + sy * 0.75, cz - 0.55, 1.05, sy * 0.5, 1.1));
        parts.push(boxPart('stone', px, y0 + sy * 0.75, cz + 0.55, 1.05, sy * 0.5, 1.1));
      }
      parts.push(cylPart('brass', cx, y0 + sy * 0.85, cz, 0.9, 0.9, sy * 0.3, 12));
      break;
    }

    case 'roof_frame': {
      for (let i = 0; i < 5; i++) {
        const bx = x0 + (i / 4) * sx;
        const clampedX = Math.min(Math.max(bx, x0 + 0.06), x1 - 0.06);
        parts.push(boxPart('slateIron', clampedX, cy, cz, 0.1, sy, sz));
      }
      for (let i = 0; i < 5; i++) {
        const bz = z0 + (i / 4) * sz;
        const clampedZ = Math.min(Math.max(bz, z0 + 0.06), z1 - 0.06);
        parts.push(boxPart('slateIron', cx, cy, clampedZ, sx, sy, 0.1));
      }
      break;
    }

    case 'hanging_basket': {
      parts.push(cylPart('slateIron', cx, y1 - 0.3, cz, 0.02, 0.02, 0.6, 6));
      parts.push(cylPart('stone', cx, cy + 0.12, cz, sx * 0.44, sx * 0.25, 0.28, 10));
      parts.push(cylPart('foliage', cx, cy + 0.26, cz, sx * 0.48, sx * 0.42, 0.18, 10));
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const vx = cx + Math.cos(angle) * (sx * 0.32);
        const vz = cz + Math.sin(angle) * (sz * 0.32);
        const vh = 0.55 + (i % 2) * 0.2 + rand() * 0.08;
        parts.push(boxPart('foliage', vx, y0 + vh * 0.5, vz, 0.09, vh, 0.09));
      }
      break;
    }

    case 'wall_trellis': {
      parts.push(boxPart('slateIron', x0 + 0.04, cy, z1 - 0.05, 0.06, sy, 0.06));
      parts.push(boxPart('slateIron', x1 - 0.04, cy, z1 - 0.05, 0.06, sy, 0.06));
      for (let i = 0; i < 5; i++) {
        const ry = y0 + 0.15 + i * (sy * 0.2);
        parts.push(boxPart('slateIron', cx, ry, z1 - 0.06, sx, 0.05, 0.05));
      }
      parts.push(boxPart('foliage', cx - 0.08, cy, cz, sx * 0.45, sy * 0.88, sz * 0.7));
      parts.push(boxPart('foliage', cx + 0.08, cy + 0.06, z0 + 0.06, sx * 0.45, sy * 0.75, 0.1));
      break;
    }

    case 'zodiac_ring': {
      parts.push(cylPart('slateIron', cx, y0 + sy * 0.3, cz, sx * 0.48, sx * 0.48, sy * 0.6, 24));
      parts.push(ringFlatPart('brass', cx, y0 + sy * 0.7, cz, sx * 0.46, sy * 0.28, 6, 28));
      parts.push(ringFlatPart('celestialGlow', cx, y0 + sy * 0.75, cz, sx * 0.34, sy * 0.25, 6, 24));
      parts.push(ringFlatPart('celestialGlow', cx, y0 + sy * 0.75, cz, sx * 0.18, sy * 0.25, 6, 20));
      for (let i = 0; i < 6; i++) {
        const raw = new THREE.BoxGeometry(sx * 0.92, sy * 0.35, 0.06);
        raw.rotateY((i * Math.PI) / 6);
        raw.translate(cx, y0 + sy * 0.75, cz);
        parts.push({ geo: toCleanNonIndexed(raw), mat: 'celestialGlow' });
      }
      break;
    }

    case 'meridian_arc': {
      const spanX = sx > sz;
      const span = spanX ? sx : sz;
      const segs = 12;
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs;
        const t1 = (i + 1) / segs;
        const tm = (t0 + t1) * 0.5;
        const arcH = Math.sin(tm * Math.PI);
        const py = y0 + arcH * (sy - 0.12) + 0.06;
        if (spanX) {
          const px = x0 + tm * span;
          parts.push(boxPart('brass', px, py, cz, span / segs + 0.05, 0.1, sz * 0.8));
          parts.push(boxPart('slateIron', px, (py + y1) * 0.5, cz, 0.06, y1 - py, 0.06));
        } else {
          const pz = z0 + tm * span;
          parts.push(boxPart('brass', cx, py, pz, sx * 0.8, 0.1, span / segs + 0.05));
          parts.push(boxPart('slateIron', cx, (py + y1) * 0.5, pz, 0.06, y1 - py, 0.06));
        }
      }
      break;
    }

    case 'star_lamp': {
      parts.push(cylPart('brass', cx, cy + 0.18, cz, 0.02, 0.02, sy * 0.65, 6));
      parts.push(boxPart('warmGlow', cx, y0 + 0.22, cz, sx * 0.75, 0.18, 0.18));
      parts.push(boxPart('warmGlow', cx, y0 + 0.22, cz, 0.18, 0.42, 0.18));
      parts.push(boxPart('warmGlow', cx, y0 + 0.22, cz, 0.18, 0.18, sz * 0.75));
      parts.push(ringFlatPart('brass', cx, y0 + 0.22, cz, sx * 0.42, 0.03, 6, 12));
      break;
    }

    case 'star_plaque': {
      parts.push(boxPart('slateIron', cx, cy, z1 - 0.06, sx, sy, 0.1));
      parts.push(boxPart('brass', cx, y1 - 0.04, cz, sx, 0.06, sz * 0.8));
      parts.push(boxPart('brass', cx, y0 + 0.04, cz, sx, 0.06, sz * 0.8));
      parts.push(ringFlatPart('celestialGlow', cx, cy, z0 + 0.06, sx * 0.32, 0.03, 6, 12));
      parts.push(boxPart('celestialGlow', cx, cy, z0 + 0.05, sx * 0.6, 0.06, 0.08));
      parts.push(boxPart('celestialGlow', cx, cy, z0 + 0.05, 0.06, sy * 0.6, 0.08));
      break;
    }

    default: {
      parts.push(boxPart('stone', cx, cy, cz, sx, sy, sz));
      break;
    }
  }

  fitPartsToItemAABB(parts, item);
  return parts;
}

function createMaterials(): Record<MaterialKey, THREE.MeshStandardMaterial> {
  return {
    darkWood: new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.8, metalness: 0.1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc89d3c, roughness: 0.35, metalness: 0.85 }),
    crimson: new THREE.MeshStandardMaterial({ color: 0x7a1c1c, roughness: 0.9, metalness: 0.05 }),
    slateIron: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.5 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8a9a86, roughness: 0.85, metalness: 0.05 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.75, metalness: 0.05 }),
    warmGlow: new THREE.MeshStandardMaterial({
      color: 0xfff1c1,
      emissive: 0xffb74d,
      emissiveIntensity: 1.4,
      roughness: 0.3,
      metalness: 0.0,
    }),
    celestialGlow: new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      roughness: 0.3,
      metalness: 0.1,
    }),
  };
}

export function buildDecor(): { root: THREE.Group; dispose(): void } {
  const root = new THREE.Group();
  root.name = 'decor';

  const items = decorLayout();
  const rand = rng('decor-v1');
  const materials = createMaterials();
  const buckets = new Map<MaterialKey, THREE.BufferGeometry[]>();

  for (const item of items) {
    const parts = buildItemParts(item, rand);
    for (const part of parts) {
      const list = buckets.get(part.mat);
      if (list) {
        list.push(part.geo);
      } else {
        buckets.set(part.mat, [part.geo]);
      }
    }
  }

  const createdGeometries: THREE.BufferGeometry[] = [];
  const createdMaterials: THREE.Material[] = Object.values(materials);

  for (const [matKey, geos] of buckets.entries()) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) {
      g.dispose();
    }
    if (!merged) continue;
    createdGeometries.push(merged);
    const mesh = new THREE.Mesh(merged, materials[matKey]);
    mesh.name = `decor_${matKey}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  let disposed = false;
  return {
    root,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const geo of createdGeometries) {
        geo.dispose();
      }
      for (const mat of createdMaterials) {
        mat.dispose();
      }
    },
  };
}