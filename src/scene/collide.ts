import { WALL, ROOMS, DOORS, LOCI, isWalkable } from '../data/palace.ts';
import { decorLayout } from './decor.ts';

export interface Box2 {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export const BODY_RADIUS = 0.3;

const LOCUS_PADDING = 0.05;
const PUSH_EPS = 1e-6;
const CONTACT_EPS = 1e-4;

// [width across face direction, depth along face direction] in metres.
const LOCUS_FOOTPRINTS: Readonly<Record<string, readonly [number, number]>> = {
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

let cachedSolidBoxes: readonly Box2[] | null = null;

function subtractIntervals(
  start: number,
  end: number,
  gaps: readonly [number, number][],
): [number, number][] {
  let segments: [number, number][] = [[start, end]];
  for (const [g0, g1] of gaps) {
    const next: [number, number][] = [];
    for (const [s0, s1] of segments) {
      if (g1 <= s0 || g0 >= s1) {
        next.push([s0, s1]);
      } else {
        if (g0 > s0) next.push([s0, g0]);
        if (g1 < s1) next.push([g1, s1]);
      }
    }
    segments = next;
  }
  return segments.filter(([s0, s1]) => s1 - s0 > 1e-6);
}

export function solidBoxes(): readonly Box2[] {
  if (cachedSolidBoxes) {
    return cachedSolidBoxes;
  }

  const boxes: Box2[] = [];
  const halfWall = WALL / 2;

  for (const room of ROOMS) {
    const { x0, z0, x1, z1 } = room.rect;

    const leftGaps = DOORS.filter((d) => d.x0 < x0 + halfWall && d.x1 > x0 - halfWall).map(
      (d): [number, number] => [d.z0, d.z1],
    );
    for (const [s0, s1] of subtractIntervals(z0, z1, leftGaps)) {
      boxes.push({ x0: x0 - halfWall, z0: s0, x1: x0 + halfWall, z1: s1 });
    }

    const rightGaps = DOORS.filter((d) => d.x0 < x1 + halfWall && d.x1 > x1 - halfWall).map(
      (d): [number, number] => [d.z0, d.z1],
    );
    for (const [s0, s1] of subtractIntervals(z0, z1, rightGaps)) {
      boxes.push({ x0: x1 - halfWall, z0: s0, x1: x1 + halfWall, z1: s1 });
    }

    const topGaps = DOORS.filter((d) => d.z0 < z0 + halfWall && d.z1 > z0 - halfWall).map(
      (d): [number, number] => [d.x0, d.x1],
    );
    for (const [s0, s1] of subtractIntervals(x0, x1, topGaps)) {
      boxes.push({ x0: s0, z0: z0 - halfWall, x1: s1, z1: z0 + halfWall });
    }

    const bottomGaps = DOORS.filter((d) => d.z0 < z1 + halfWall && d.z1 > z1 - halfWall).map(
      (d): [number, number] => [d.x0, d.x1],
    );
    for (const [s0, s1] of subtractIntervals(x0, x1, bottomGaps)) {
      boxes.push({ x0: s0, z0: z1 - halfWall, x1: s1, z1: z1 + halfWall });
    }
  }

  for (const locus of LOCI) {
    const [width, depth] = LOCUS_FOOTPRINTS[locus.kind] ?? [0.8, 0.8];
    const fx = Math.abs(locus.face[0]);
    const fz = Math.abs(locus.face[1]);
    const spanX = fx * depth + fz * width;
    const spanZ = fz * depth + fx * width;
    const halfX = spanX / 2 + LOCUS_PADDING;
    const halfZ = spanZ / 2 + LOCUS_PADDING;
    const [px, pz] = locus.pos;

    boxes.push({
      x0: px - halfX,
      z0: pz - halfZ,
      x1: px + halfX,
      z1: pz + halfZ,
    });
  }

  for (const item of decorLayout()) {
    if (item.zone !== 'wall') {
      continue;
    }
    boxes.push({
      x0: Math.min(item.min[0], item.max[0]),
      z0: Math.min(item.min[2], item.max[2]),
      x1: Math.max(item.min[0], item.max[0]),
      z1: Math.max(item.min[2], item.max[2]),
    });
  }

  cachedSolidBoxes = boxes;
  return boxes;
}

function circleOverlapsBox(x: number, z: number, b: Box2, radius: number): boolean {
  const cx = Math.max(b.x0, Math.min(x, b.x1));
  const cz = Math.max(b.z0, Math.min(z, b.z1));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < radius * radius;
}

export function isFree(x: number, z: number, boxes?: readonly Box2[]): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !isWalkable(x, z)) {
    return false;
  }
  const list = boxes ?? solidBoxes();
  for (let i = 0; i < list.length; i++) {
    if (circleOverlapsBox(x, z, list[i], BODY_RADIUS)) {
      return false;
    }
  }
  return true;
}

interface Contact {
  nx: number;
  nz: number;
  depth: number;
}

function boxContact(x: number, z: number, b: Box2, targetRadius: number): Contact | null {
  const cx = Math.max(b.x0, Math.min(x, b.x1));
  const cz = Math.max(b.z0, Math.min(z, b.z1));
  const dx = x - cx;
  const dz = z - cz;
  const distSq = dx * dx + dz * dz;

  if (distSq >= targetRadius * targetRadius) {
    return null;
  }

  if (distSq > 1e-18) {
    const dist = Math.sqrt(distSq);
    return {
      nx: dx / dist,
      nz: dz / dist,
      depth: targetRadius - dist,
    };
  }

  // Centre is inside the box: push towards the nearest edge.
  const dLeft = x - b.x0;
  const dRight = b.x1 - x;
  const dTop = z - b.z0;
  const dBottom = b.z1 - z;
  const minEdge = Math.min(dLeft, dRight, dTop, dBottom);

  if (minEdge === dLeft) return { nx: -1, nz: 0, depth: dLeft + targetRadius };
  if (minEdge === dRight) return { nx: 1, nz: 0, depth: dRight + targetRadius };
  if (minEdge === dTop) return { nx: 0, nz: -1, depth: dTop + targetRadius };
  return { nx: 0, nz: 1, depth: dBottom + targetRadius };
}

function collectContacts(
  x: number,
  z: number,
  list: readonly Box2[],
  targetRadius: number,
): Contact[] {
  const contacts: Contact[] = [];
  for (let i = 0; i < list.length; i++) {
    const c = boxContact(x, z, list[i], targetRadius);
    if (!c) {
      continue;
    }
    // Merge nearly collinear normals, keeping the deeper constraint.
    let merged = false;
    for (let j = 0; j < contacts.length; j++) {
      if (contacts[j].nx * c.nx + contacts[j].nz * c.nz > 1 - 1e-6) {
        if (c.depth > contacts[j].depth) {
          contacts[j] = c;
        }
        merged = true;
        break;
      }
    }
    if (!merged) {
      contacts.push(c);
    }
  }
  contacts.sort((a, b) => b.depth - a.depth);
  return contacts;
}

// Clamps (x, z) into the nearest walkable room or door rect if custom boxes omit walls.
function clampToWalkable(x: number, z: number): [number, number] {
  if (isWalkable(x, z)) {
    return [x, z];
  }
  const margin = 1e-5;
  let bestX = x;
  let bestZ = z;
  let bestDistSq = Infinity;

  for (const r of ROOMS) {
    const rx = Math.max(r.rect.x0 + WALL + margin, Math.min(x, r.rect.x1 - WALL - margin));
    const rz = Math.max(r.rect.z0 + WALL + margin, Math.min(z, r.rect.z1 - WALL - margin));
    const dSq = (x - rx) * (x - rx) + (z - rz) * (z - rz);
    if (dSq < bestDistSq && isWalkable(rx, rz)) {
      bestDistSq = dSq;
      bestX = rx;
      bestZ = rz;
    }
  }

  for (const d of DOORS) {
    const dx = Math.max(d.x0 + margin, Math.min(x, d.x1 - margin));
    const dz = Math.max(d.z0 + margin, Math.min(z, d.z1 - margin));
    const dSq = (x - dx) * (x - dx) + (z - dz) * (z - dz);
    if (dSq < bestDistSq && isWalkable(dx, dz)) {
      bestDistSq = dSq;
      bestX = dx;
      bestZ = dz;
    }
  }

  return [bestX, bestZ];
}

// Finds the shortest push-out from an initially overlapping state.
function pushOutShortest(x: number, z: number, list: readonly Box2[]): [number, number] {
  const rPush = BODY_RADIUS + PUSH_EPS;
  const candidates: [number, number][] = [];

  const [wx, wz] = clampToWalkable(x, z);
  if (wx !== x || wz !== z) {
    candidates.push([wx, wz]);
  }

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (!circleOverlapsBox(x, z, b, rPush)) {
      continue;
    }
    const cx = Math.max(b.x0, Math.min(x, b.x1));
    const cz = Math.max(b.z0, Math.min(z, b.z1));
    candidates.push(
      [b.x0 - rPush, cz],
      [b.x1 + rPush, cz],
      [cx, b.z0 - rPush],
      [cx, b.z1 + rPush],
    );
    const contact = boxContact(x, z, b, rPush);
    if (contact) {
      candidates.push([x + contact.nx * contact.depth, z + contact.nz * contact.depth]);
    }
  }

  let best: [number, number] | null = null;
  let bestDistSq = Infinity;

  for (const [cx, cz] of candidates) {
    const dSq = (cx - x) * (cx - x) + (cz - z) * (cz - z);
    if (dSq < bestDistSq && isFree(cx, cz, list)) {
      bestDistSq = dSq;
      best = [cx, cz];
    }
  }

  const ringPoint = nearestFree(x, z, list);
  const ringDistSq =
    (ringPoint[0] - x) * (ringPoint[0] - x) + (ringPoint[1] - z) * (ringPoint[1] - z);

  if (best && bestDistSq <= ringDistSq) {
    return best;
  }
  return ringPoint;
}

// Returns true when displacement (dx, dz) is wedged into an inside corner of >= 2 active normals.
function isCornerLocked(dx: number, dz: number, contacts: readonly Contact[]): boolean {
  if (contacts.length < 2) {
    return false;
  }

  const eps = 1e-9;
  let allSatisfied = true;
  for (let i = 0; i < contacts.length; i++) {
    if (dx * contacts[i].nx + dz * contacts[i].nz < -eps) {
      allSatisfied = false;
      break;
    }
  }
  if (allSatisfied) {
    return false;
  }

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const dot = dx * c.nx + dz * c.nz;
    if (dot >= 0) {
      continue;
    }
    const sx = dx - dot * c.nx;
    const sz = dz - dot * c.nz;
    if (sx * dx + sz * dz <= eps) {
      continue;
    }
    let slideValid = true;
    for (let j = 0; j < contacts.length; j++) {
      if (sx * contacts[j].nx + sz * contacts[j].nz < -eps) {
        slideValid = false;
        break;
      }
    }
    if (slideValid) {
      return false;
    }
  }

  return true;
}

function resolveSubstep(
  startX: number,
  startZ: number,
  dx: number,
  dz: number,
  list: readonly Box2[],
): [number, number] {
  const rPush = BODY_RADIUS + PUSH_EPS;
  const rContact = BODY_RADIUS + CONTACT_EPS;

  const startContacts = collectContacts(startX, startZ, list, rContact);
  if (isCornerLocked(dx, dz, startContacts)) {
    return [startX, startZ];
  }

  let px = startX + dx;
  let pz = startZ + dz;

  for (let iter = 0; iter < 32; iter++) {
    const contacts = collectContacts(px, pz, list, rPush);
    if (contacts.length === 0 || contacts[0].depth < 1e-13) {
      break;
    }

    if (contacts.length >= 2) {
      const c1 = contacts[0];
      const c2 = contacts[1];
      const dot = c1.nx * c2.nx + c1.nz * c2.nz;
      const det = 1 - dot * dot;
      // Simultaneous 2-constraint solve jumps directly to the corner intersection.
      if (det > 1e-6) {
        const a = (c1.depth - c2.depth * dot) / det;
        const b = (c2.depth - c1.depth * dot) / det;
        if (a >= 0 && b >= 0) {
          px += a * c1.nx + b * c2.nx;
          pz += a * c1.nz + b * c2.nz;
          continue;
        }
      }
    }

    const c = contacts[0];
    px += c.nx * c.depth;
    pz += c.nz * c.depth;
  }

  if (!isWalkable(px, pz)) {
    [px, pz] = clampToWalkable(px, pz);
  }

  if (isFree(px, pz, list)) {
    return [px, pz];
  }

  // Fallback axis split if a tight 3-body configuration blocked diagonal projection.
  const onlyX = startX + dx;
  if (isFree(onlyX, startZ, list)) {
    return [onlyX, startZ];
  }
  const onlyZ = startZ + dz;
  if (isFree(startX, onlyZ, list)) {
    return [startX, onlyZ];
  }

  return [startX, startZ];
}

export function moveBody(
  x: number,
  z: number,
  dx: number,
  dz: number,
  boxes?: readonly Box2[],
): [number, number] {
  const list = boxes ?? solidBoxes();
  let [px, pz] = isFree(x, z, list) ? [x, z] : pushOutShortest(x, z, list);

  const dist = Math.hypot(dx, dz);
  if (dist === 0) {
    return [px, pz];
  }

  const maxStep = BODY_RADIUS / 2;
  const steps = Math.max(1, Math.ceil(dist / maxStep));
  const stepDx = dx / steps;
  const stepDz = dz / steps;

  for (let i = 0; i < steps; i++) {
    const [nx, nz] = resolveSubstep(px, pz, stepDx, stepDz, list);
    if (nx === px && nz === pz) {
      break;
    }
    px = nx;
    pz = nz;
  }

  if (!isFree(px, pz, list)) {
    return nearestFree(px, pz, list);
  }
  return [px, pz];
}

export function nearestFree(
  x: number,
  z: number,
  boxes?: readonly Box2[],
): [number, number] {
  const list = boxes ?? solidBoxes();
  if (isFree(x, z, list)) {
    return [x, z];
  }

  const ringStep = 0.05;
  const maxRadius = 3.0;
  const rPush = BODY_RADIUS + PUSH_EPS;

  // Precompute orthogonal projections onto nearby box boundaries so aligned exits are exact.
  const exactCandidates: [number, number][] = [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (!circleOverlapsBox(x, z, b, rPush)) {
      continue;
    }
    const cx = Math.max(b.x0, Math.min(x, b.x1));
    const cz = Math.max(b.z0, Math.min(z, b.z1));
    exactCandidates.push(
      [b.x0 - rPush, cz],
      [b.x1 + rPush, cz],
      [cx, b.z0 - rPush],
      [cx, b.z1 + rPush],
    );
  }

  const maxRings = Math.round(maxRadius / ringStep);
  for (let k = 1; k <= maxRings; k++) {
    const r = k * ringStep;
    const prevR = (k - 1) * ringStep;
    let best: [number, number] | null = null;
    let bestDistSq = Infinity;

    for (const [cx, cz] of exactCandidates) {
      const d = Math.hypot(cx - x, cz - z);
      if (d > prevR && d <= r && d * d < bestDistSq && isFree(cx, cz, list)) {
        bestDistSq = d * d;
        best = [cx, cz];
      }
    }

    const samples = Math.max(36, Math.ceil((2 * Math.PI * r) / 0.025));
    for (let s = 0; s < samples; s++) {
      const angle = (2 * Math.PI * s) / samples;
      const cx = x + r * Math.cos(angle);
      const cz = z + r * Math.sin(angle);
      const dSq = (cx - x) * (cx - x) + (cz - z) * (cz - z);
      if (dSq < bestDistSq && isFree(cx, cz, list)) {
        bestDistSq = dSq;
        best = [cx, cz];
      }
    }

    if (best) {
      return best;
    }
  }

  // Fallback if everything within 3 m was blocked: return first room centre.
  const r0 = ROOMS[0].rect;
  return [(r0.x0 + r0.x1) / 2, (r0.z0 + r0.z1) / 2];
}