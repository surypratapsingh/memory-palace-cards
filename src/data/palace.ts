// Palace layout data: 4 rooms, 52 loci on a fixed walking route.
// Invariants G1-G6 from MATHS.md section 8. Pure data, no three.js import.
import type { LocusInfo } from '../types.ts';

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface Room {
  name: string;
  rect: Rect;
  light: number;
}

export interface Locus extends LocusInfo {
  kind: string;
  color: number;
  pos: [number, number];
  face: [number, number];
}

export const VIEW_DIST = 1.8;
export const EYE_HEIGHT = 1.6;
export const WALL = 0.2;

export const ROOMS: readonly Room[] = [
  { name: 'Library', rect: { x0: 0, z0: 0, x1: 14, z1: 14 }, light: 0xffeedd },
  { name: 'Kitchen', rect: { x0: 14.5, z0: 0, x1: 28.5, z1: 14 }, light: 0xf0f8ff },
  { name: 'Greenhouse', rect: { x0: 29.0, z0: 0, x1: 43.0, z1: 14 }, light: 0xe8f5e9 },
  { name: 'Observatory', rect: { x0: 43.5, z0: 0, x1: 57.5, z1: 14 }, light: 0x1e293b },
];

export const DOORS: readonly Rect[] = [
  { x0: 13.8, z0: 5.5, x1: 14.7, z1: 8.5 },
  { x0: 28.3, z0: 5.5, x1: 29.2, z1: 8.5 },
  { x0: 42.8, z0: 5.5, x1: 43.7, z1: 8.5 },
];

interface RelLocus {
  pos: [number, number];
  face: [number, number];
}

// 13 relative positions around the room perimeter, turning counter-clockwise monotonically (G6).
// Loci stand against walls, clear of door openings (z in [5.5, 8.5]).
const REL_LOCI: readonly RelLocus[] = [
  { pos: [0.8, 3.0], face: [1, 0] },
  { pos: [2.2, 0.8], face: [0, 1] },
  { pos: [4.8, 0.8], face: [0, 1] },
  { pos: [7.2, 0.8], face: [0, 1] },
  { pos: [9.6, 0.8], face: [0, 1] },
  { pos: [12.0, 0.8], face: [0, 1] },
  { pos: [13.2, 3.0], face: [-1, 0] },
  { pos: [13.2, 11.0], face: [-1, 0] },
  { pos: [11.5, 13.2], face: [0, -1] },
  { pos: [8.5, 13.2], face: [0, -1] },
  { pos: [5.5, 13.2], face: [0, -1] },
  { pos: [2.5, 13.2], face: [0, -1] },
  { pos: [0.8, 11.0], face: [1, 0] },
];

const LOCUS_DEFS: readonly { name: string; kind: string; color: number }[] = [
  // Room 0: Library
  { name: 'Velvet Armchair', kind: 'armchair', color: 0x8b0000 },
  { name: 'Mahogany Bookshelf', kind: 'bookshelf', color: 0x5c4033 },
  { name: 'Brass Globe', kind: 'globe', color: 0xb5a642 },
  { name: 'Stone Fireplace', kind: 'fireplace', color: 0x708090 },
  { name: 'Grandfather Clock', kind: 'clock', color: 0x654321 },
  { name: 'Scholar Desk', kind: 'desk', color: 0x8b5a2b },
  { name: 'Leather Wingback', kind: 'armchair', color: 0x2f4f4f },
  { name: 'Gilded Bookcase', kind: 'bookshelf', color: 0xd4af37 },
  { name: 'Marble Pedestal', kind: 'pedestal', color: 0xe5e7eb },
  { name: 'Reading Table', kind: 'table', color: 0x3d2817 },
  { name: 'Curio Cabinet', kind: 'cabinet', color: 0x800020 },
  { name: 'Carved Bookshelf', kind: 'bookshelf', color: 0x4a3728 },
  { name: 'Checkerboard Table', kind: 'table', color: 0x1f2937 },

  // Room 1: Kitchen
  { name: 'Cast Iron Stove', kind: 'stove', color: 0x1f2421 },
  { name: 'Retro Refrigerator', kind: 'refrigerator', color: 0x3b82f6 },
  { name: 'Oak Pantry Cabinet', kind: 'cabinet', color: 0xb8860b },
  { name: 'Butcher Block Table', kind: 'table', color: 0xd2b48c },
  { name: 'Ceramic Sink', kind: 'sink', color: 0xf8fafc },
  { name: 'Copper Cauldron', kind: 'cauldron', color: 0xb87333 },
  { name: 'Baking Hearth', kind: 'fireplace', color: 0x8b4513 },
  { name: 'Spice Shelf', kind: 'bookshelf', color: 0xcd853f },
  { name: 'Prep Counter Table', kind: 'table', color: 0x64748b },
  { name: 'Herb Planter', kind: 'planter', color: 0x22c55e },
  { name: 'Pottery Cauldron', kind: 'cauldron', color: 0x475569 },
  { name: 'Glass Cabinet', kind: 'cabinet', color: 0x38bdf8 },
  { name: 'Kitchen Clock', kind: 'clock', color: 0xe2e8f0 },

  // Room 2: Greenhouse
  { name: 'Fern Terrarium Pedestal', kind: 'pedestal', color: 0x166534 },
  { name: 'Orchid Planter', kind: 'planter', color: 0xec4899 },
  { name: 'Stone Fountain', kind: 'fountain', color: 0x94a3b8 },
  { name: 'Teak Garden Bench', kind: 'bench', color: 0xa0522d },
  { name: 'Bonsai Display Table', kind: 'table', color: 0x14532d },
  { name: 'Tropical Palm Pot', kind: 'plant', color: 0x15803d },
  { name: 'Seed Storage Cabinet', kind: 'cabinet', color: 0x78350f },
  { name: 'Water Lily Cauldron', kind: 'cauldron', color: 0x0284c7 },
  { name: 'Wrought Iron Bench', kind: 'bench', color: 0x0f172a },
  { name: 'Cactus Terrarium Pedestal', kind: 'pedestal', color: 0x84cc16 },
  { name: 'Hanging Vine Shelf', kind: 'bookshelf', color: 0x4d7c0f },
  { name: 'Citrus Tree Pot', kind: 'plant', color: 0xf97316 },
  { name: 'Tiered Fountain', kind: 'fountain', color: 0x065f46 },

  // Room 3: Observatory
  { name: 'Brass Telescope', kind: 'telescope', color: 0xd97706 },
  { name: 'Armillary Sphere', kind: 'armillary', color: 0xf59e0b },
  { name: 'Mechanical Orrery', kind: 'orrery', color: 0x6366f1 },
  { name: 'Celestial Globe', kind: 'globe_celestial', color: 0x1d4ed8 },
  { name: 'Star Chart Desk', kind: 'desk', color: 0x312e81 },
  { name: 'Ancient Astrolabe', kind: 'astrolabe', color: 0xca8a04 },
  { name: 'Meteorite Pedestal', kind: 'pedestal', color: 0x475569 },
  { name: 'Astronomer Armchair', kind: 'armchair', color: 0x4338ca },
  { name: 'Pendulum Clock', kind: 'clock', color: 0x7c3aed },
  { name: 'Stargazing Bench', kind: 'bench', color: 0x1e1b4b },
  { name: 'Deep Sky Telescope', kind: 'telescope', color: 0x0ea5e9 },
  { name: 'Planetary Orrery', kind: 'orrery', color: 0xe11d48 },
  { name: 'Star Atlas Bookshelf', kind: 'bookshelf', color: 0x2563eb },
];

export const LOCI: readonly Locus[] = LOCUS_DEFS.map((def, idx) => {
  const roomIdx = Math.floor(idx / 13);
  const relIdx = idx % 13;
  const room = ROOMS[roomIdx];
  const rel = REL_LOCI[relIdx];
  const x = Number((room.rect.x0 + rel.pos[0]).toFixed(3));
  const z = Number((room.rect.z0 + rel.pos[1]).toFixed(3));
  return {
    index: idx,
    name: def.name,
    room: room.name,
    kind: def.kind,
    color: def.color,
    pos: [x, z],
    face: [rel.face[0], rel.face[1]],
  };
});

export function viewpoint(i: number): [number, number] {
  const l = LOCI[i];
  const vx = Number((l.pos[0] + VIEW_DIST * l.face[0]).toFixed(3));
  const vz = Number((l.pos[1] + VIEW_DIST * l.face[1]).toFixed(3));
  return [vx, vz];
}

export function isWalkable(x: number, z: number): boolean {
  for (let r = 0; r < ROOMS.length; r++) {
    const rect = ROOMS[r].rect;
    if (
      x >= rect.x0 + WALL - 1e-9 &&
      x <= rect.x1 - WALL + 1e-9 &&
      z >= rect.z0 + WALL - 1e-9 &&
      z <= rect.z1 - WALL + 1e-9
    ) {
      return true;
    }
  }
  for (let d = 0; d < DOORS.length; d++) {
    const door = DOORS[d];
    if (
      x >= door.x0 - 1e-9 &&
      x <= door.x1 + 1e-9 &&
      z >= door.z0 - 1e-9 &&
      z <= door.z1 + 1e-9
    ) {
      return true;
    }
  }
  return false;
}

function doorCenter(doorIdx: number): [number, number] {
  const d = DOORS[doorIdx];
  return [Number(((d.x0 + d.x1) / 2).toFixed(3)), Number(((d.z0 + d.z1) / 2).toFixed(3))];
}

export function glidePath(from: number, to: number): [number, number][] {
  const rFrom = Math.floor(from / 13);
  const rTo = Math.floor(to / 13);
  const path: [number, number][] = [viewpoint(from)];

  if (rFrom < rTo) {
    for (let r = rFrom; r < rTo; r++) {
      path.push(doorCenter(r));
    }
  } else if (rFrom > rTo) {
    for (let r = rFrom - 1; r >= rTo; r--) {
      path.push(doorCenter(r));
    }
  }

  path.push(viewpoint(to));
  return path;
}
