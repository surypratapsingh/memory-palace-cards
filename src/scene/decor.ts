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

  // Room 2: Greenhouse — 0.45 m terracotta hanging baskets
  { kind: 'stone_path', room: 2, zone: 'floor', lx0: 2.2, y0: 0.0, lz0: 5.6, lx1: 11.8, y1: 0.024, lz1: 8.4 },
  { kind: 'roof_frame', room: 2, zone: 'ceiling', lx0: 1.2, y0: 3.75, lz0: 1.2, lx1: 12.8, y1: 3.98, lz1: 12.8 },
  { kind: 'hanging_basket', room: 2, zone: 'ceiling', lx0: 4.275, y0: 2.62, lz0: 4.575, lx1: 4.725, y1: 3.96, lz1: 5.025 },
  { kind: 'hanging_basket', room: 2, zone: 'ceiling', lx0: 9.275, y0: 2.62, lz0: 4.575, lx1: 9.725, y1: 3.96, lz1: 5.025 },
  { kind: 'hanging_basket', room: 2, zone: 'ceiling', lx0: 4.275, y0: 2.62, lz0: 8.975, lx1: 4.725, y1: 3.96, lz1: 9.425 },
  { kind: 'hanging_basket', room: 2, zone: 'ceiling', lx0: 9.275, y0: 2.62, lz0: 8.975, lx1: 9.725, y1: 3.96, lz1: 9.425 },
  { kind: 'wall_trellis', room: 2, zone: 'wall', lx0: 3.75, y0: 0.4, lz0: 13.48, lx1: 4.25, y1: 2.45, lz1: 13.78 },
  { kind: 'wall_trellis', room: 2, zone: 'wall', lx0: 9.75, y0: 0.4, lz0: 13.48, lx1: 10.25, y1: 2.45, lz1: 13.78 },
  { kind: 'corner_column', room: 2, zone: 'wall', lx0: 0.22, y0: 0.0, lz0: 13.38, lx1: 0.62, y1: 3.98, lz1: 13.78 },

  // Room 3: Observatory — slender meridian arcs and compact star orbs
  { kind: 'zodiac_ring', room: 3, zone: 'floor', lx0: 3.8, y0: 0.0, lz0: 3.8, lx1: 10.2, y1: 0.025, lz1: 10.2 },
  { kind: 'meridian_arc', room: 3, zone: 'ceiling', lx0: 2.0, y0: 2.85, lz0: 6.92, lx1: 12.0, y1: 3.96, lz1: 7.08 },
  { kind: 'meridian_arc', room: 3, zone: 'ceiling', lx0: 6.92, y0: 2.85, lz0: 2.0, lx1: 7.08, y1: 3.96, lz1: 12.0 },
  { kind: 'star_lamp', room: 3, zone: 'ceiling', lx0: 4.35, y0: 2.68, lz0: 4.35, lx1: 4.65, y1: 3.96, lz1: 4.65 },
  { kind: 'star_lamp', room: 3, zone: 'ceiling', lx0: 9.35, y0: 2.68, lz0: 4.35, lx1: 9.65, y1: 3.96, lz1: 4.65 },
  { kind: 'star_lamp', room: 3, zone: 'ceiling', lx0: 4.35, y0: 2.68, lz0: 9.35, lx1: 4.65, y1: 3.96, lz1: 9.65 },
  { kind: 'star_lamp', room: 3, zone: 'ceiling', lx0: 9.35, y0: 2.68, lz0: 9.35, lx1: 9.65, y1: 3.96, lz1: 9.65 },
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

export function lampPositions(): readonly [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (const item of decorLayout()) {
    const [x0, y0, z0] = item.min;
    const [x1, y1, z1] = item.max;
    const cx = (x0 + x1) * 0.5;
    const cz = (z0 + z1) * 0.5;
    const sx = x1 - x0;

    if (item.kind === 'chandelier') {
      const r = sx * 0.42;
      const flameY = Number((y0 + 0.5).toFixed(4));
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        positions.push([
          Number((cx + Math.cos(angle) * r).toFixed(4)),
          flameY,
          Number((cz + Math.sin(angle) * r).toFixed(4)),
        ]);
      }
    } else if (item.kind === 'wall_sconce') {
      positions.push([
        Number(cx.toFixed(4)),
        Number((y1 - 0.1).toFixed(4)),
        Number((z0 + 0.08).toFixed(4)),
      ]);
    } else if (item.kind === 'pendant_lamp') {
      positions.push([
        Number(cx.toFixed(4)),
        Number((y0 + 0.12).toFixed(4)),
        Number(cz.toFixed(4)),
      ]);
    } else if (item.kind === 'star_lamp') {
      positions.push([
        Number(cx.toFixed(4)),
        Number((y0 + 0.14).toFixed(4)),
        Number(cz.toFixed(4)),
      ]);
    }
  }
  return positions;
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
  rx = 0,
  ry = 0,
  rz = 0,
): Part {
  const raw = new THREE.BoxGeometry(sx, sy, sz);
  if (rx !== 0) raw.rotateX(rx);
  if (ry !== 0) raw.rotateY(ry);
  if (rz !== 0) raw.rotateZ(rz);
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
  ry = 0,
): Part {
  const raw = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  if (ry !== 0) raw.rotateY(ry);
  raw.translate(cx, cy, cz);
  return { geo: toCleanNonIndexed(raw), mat };
}

function spherePart(
  mat: MaterialKey,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  wSegs = 10,
  hSegs = 8,
): Part {
  const raw = new THREE.SphereGeometry(radius, wSegs, hSegs);
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
        parts.push(cylPart('brass', ax, y0 + 0.28, az, 0.06, 0.04, 0.12, 8));
        parts.push(cylPart('warmGlow', ax, y0 + 0.42, az, 0.028, 0.038, 0.16, 8));
        parts.push(spherePart('warmGlow', ax, y0 + 0.53, az, 0.038, 6, 6));
      }
      parts.push(cylPart('brass', cx, y0 + 0.08, cz, 0.12, 0.02, 0.16, 8));
      break;
    }

    case 'wall_sconce': {
      parts.push(boxPart('darkWood', cx, cy, z1 - 0.04, sx * 0.85, sy * 0.9, 0.08));
      parts.push(boxPart('brass', cx, cy - 0.1, cz, 0.08, 0.08, sz * 0.8));
      parts.push(cylPart('brass', cx, cy + 0.04, z0 + 0.08, 0.09, 0.06, 0.16, 8));
      parts.push(cylPart('warmGlow', cx, y1 - 0.14, z0 + 0.08, 0.045, 0.06, 0.2, 8));
      parts.push(spherePart('warmGlow', cx, y1 - 0.02, z0 + 0.08, 0.04, 6, 6));
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
      // Subtle woven mat in the kitchen's cool whites with thin slate weave strips
      parts.push(boxPart('stone', cx, y0 + sy * 0.4, cz, sx, sy * 0.8, sz));
      // Lead: thin border only; the six inner strips read as court lines at eye height.
      const edge = 0.08;
      parts.push(boxPart('slateIron', cx, y0 + sy * 0.82, z0 + edge * 0.5, sx, sy * 0.36, edge));
      parts.push(boxPart('slateIron', cx, y0 + sy * 0.82, z1 - edge * 0.5, sx, sy * 0.36, edge));
      parts.push(boxPart('slateIron', x0 + edge * 0.5, y0 + sy * 0.82, cz, edge, sy * 0.36, sz));
      parts.push(boxPart('slateIron', x1 - edge * 0.5, y0 + sy * 0.82, cz, edge, sy * 0.36, sz));
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
        parts.push(
          cylPart('slateIron', rx, (y0 + 0.52 + y1) * 0.5, rz, 0.025, 0.025, y1 - (y0 + 0.52), 6),
        );
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
      parts.push(spherePart('warmGlow', cx, y0 + 0.1, cz, 0.08, 8, 8));
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
      // Irregular polygonal stepping stones without a frame, close to the floor tone
      const count = 11;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const px = x0 + 0.65 + t * (sx - 1.3);
        const zJitter = (i % 2 === 0 ? -1 : 1) * (0.28 + (i % 3) * 0.14);
        const pz = cz + zJitter;
        const r = 0.42 + ((i * 3) % 4) * 0.06;
        const segs = 6 + (i % 3);
        const mat: MaterialKey = 'slateIron'; // Lead: one stone colour; brown and slate together read as game tokens
        parts.push(
          cylPart(mat, px, y0 + sy * 0.5, pz, r * 0.94, r, sy, segs, i * 0.7),
        );
      }
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
      // Small ~0.45 m terracotta pot with hanging wire, thin trailing vine strands and small leaf quads
      const potY = y1 - 0.52;
      parts.push(cylPart('slateIron', cx, y1 - 0.22, cz, 0.012, 0.012, 0.44, 6));
      parts.push(cylPart('crimson', cx, potY, cz, 0.17, 0.1, 0.22, 9));
      parts.push(ringFlatPart('crimson', cx, potY + 0.1, cz, 0.17, 0.022, 6, 12));

      const vineCount = 6;
      for (let i = 0; i < vineCount; i++) {
        const angle = (i * Math.PI * 2) / vineCount + 0.2;
        const vr = 0.14 + (i % 2) * 0.03;
        const vx = cx + Math.cos(angle) * vr;
        const vz = cz + Math.sin(angle) * vr;
        const vh = 0.48 + (i % 3) * 0.14;
        const stemTop = potY + 0.04;
        parts.push(boxPart('foliage', vx, stemTop - vh * 0.5, vz, 0.02, vh, 0.02));

        for (let l = 0; l < 3; l++) {
          const ly = stemTop - 0.12 - l * (vh * 0.3);
          const side = l % 2 === 0 ? 1 : -1;
          const lx = vx + Math.cos(angle + side * 0.5) * 0.035;
          const lz = vz + Math.sin(angle + side * 0.5) * 0.035;
          parts.push(
            boxPart('foliage', lx, ly, lz, 0.065, 0.012, 0.045, 0.35 * side, angle, 0.25),
          );
        }
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
        parts.push({ geo: toCleanNonIndexed(raw), mat: 'brass' }); // Lead: brass spokes, glowing ones glared like a target
      }
      break;
    }

    case 'meridian_arc': {
      // Smooth thin brass TorusGeometry arch (arc = PI, tube ~ 0.04 m) across the Observatory ceiling
      const spanX = sx > sz;
      const radius = (spanX ? sx : sz) * 0.5;
      const arch = new THREE.TorusGeometry(radius, 0.04, 8, 36, Math.PI);
      arch.scale(1, (sy - 0.05) / radius, 1);
      if (!spanX) {
        arch.rotateY(Math.PI / 2);
      }
      arch.translate(cx, y0 + 0.04, cz);
      parts.push({ geo: toCleanNonIndexed(arch), mat: 'brass' });

      const innerArch = new THREE.TorusGeometry(radius * 0.96, 0.022, 6, 32, Math.PI);
      innerArch.scale(1, (sy - 0.12) / radius, 1);
      if (!spanX) {
        innerArch.rotateY(Math.PI / 2);
      }
      innerArch.translate(cx, y0 + 0.04, cz);
      parts.push({ geo: toCleanNonIndexed(innerArch), mat: 'slateIron' });
      break;
    }

    case 'star_lamp': {
      // Small glowing celestial orb with thin brass suspension rod and delicate gimbal ring
      const orbY = y0 + 0.14;
      const rodH = y1 - orbY;
      parts.push(cylPart('brass', cx, orbY + rodH * 0.5, cz, 0.012, 0.012, rodH, 6));
      parts.push(cylPart('brass', cx, y1 - 0.03, cz, 0.06, 0.04, 0.06, 8));
      parts.push(spherePart('celestialGlow', cx, orbY, cz, 0.095, 10, 8));
      parts.push(ringFlatPart('brass', cx, orbY, cz, 0.13, 0.014, 6, 14));
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
    crimson: new THREE.MeshStandardMaterial({ color: 0x9e3828, roughness: 0.85, metalness: 0.05 }),
    slateIron: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.5 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85, metalness: 0.05 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.75, metalness: 0.05 }),
    warmGlow: new THREE.MeshStandardMaterial({
      color: 0xfff3cc,
      emissive: 0xffb74d,
      emissiveIntensity: 1.5, // Lead: round 1 cap; lampHalos adds the glow
      roughness: 0.25,
      metalness: 0.0,
    }),
    celestialGlow: new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      emissive: 0x60a5fa,
      emissiveIntensity: 1.5,
      roughness: 0.25,
      metalness: 0.1,
    }),
  };
}

export function buildDecor(): { root: THREE.Group; dispose(): void } {
  const root = new THREE.Group();
  root.name = 'decor';

  const items = decorLayout();
  const rand = rng('decor-v2');
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