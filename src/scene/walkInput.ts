import { moveBody, solidBoxes, BODY_RADIUS, type Box2 } from './collide.ts';

export interface WalkKeys {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
}

export function keysFromCodes(down: ReadonlySet<string>): WalkKeys {
  return {
    forward: down.has('KeyW') || down.has('ArrowUp'),
    back: down.has('KeyS') || down.has('ArrowDown'),
    left: down.has('KeyA') || down.has('ArrowLeft'),
    right: down.has('KeyD') || down.has('ArrowRight'),
    run: down.has('ShiftLeft') || down.has('ShiftRight'),
  };
}

export interface WalkState {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

export const WALK_SPEED = 1.6;
export const RUN_SPEED = 3.2;
export const ACCEL = 14;
export const STOP_TIME = 0.15;

// Ensures a full stop from RUN_SPEED or WALK_SPEED finishes within STOP_TIME even with discrete steps.
const BRAKE_ACCEL = Math.max(ACCEL, RUN_SPEED / STOP_TIME);

function stripWallVelocity(
  x: number,
  z: number,
  vx: number,
  vz: number,
  list: readonly Box2[],
): [number, number] {
  const contactRadius = BODY_RADIUS + 1e-4;
  let rvx = vx;
  let rvz = vz;
  const normals: [number, number][] = [];

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const cx = Math.max(b.x0, Math.min(x, b.x1));
    const cz = Math.max(b.z0, Math.min(z, b.z1));
    const dx = x - cx;
    const dz = z - cz;
    const distSq = dx * dx + dz * dz;

    if (distSq > 1e-18 && distSq <= contactRadius * contactRadius) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const nz = dz / dist;
      normals.push([nx, nz]);
      const into = rvx * nx + rvz * nz;
      if (into < 0) {
        rvx -= into * nx;
        rvz -= into * nz;
      }
    }
  }

  for (let i = 0; i < normals.length; i++) {
    if (rvx * normals[i][0] + rvz * normals[i][1] < -1e-6) {
      return [0, 0];
    }
  }

  return [rvx, rvz];
}

export function stepWalk(
  s: WalkState,
  keys: WalkKeys,
  yaw: number,
  dt: number,
  boxes?: readonly Box2[],
): WalkState {
  const clampedDt = Math.max(0, Math.min(0.05, Number.isFinite(dt) ? dt : 0));
  const list = boxes ?? solidBoxes();

  if (clampedDt === 0) {
    const [x, z] = moveBody(s.x, s.z, 0, 0, list);
    return { x, z, vx: s.vx, vz: s.vz };
  }

  const moveForward = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
  const moveRight = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

  // yaw = 0 faces -z; positive yaw turns left (-x).
  const dirX = moveForward * -Math.sin(yaw) + moveRight * Math.cos(yaw);
  const dirZ = moveForward * -Math.cos(yaw) + moveRight * -Math.sin(yaw);
  const dirLen = Math.hypot(dirX, dirZ);

  const targetSpeed = keys.run ? RUN_SPEED : WALK_SPEED;
  const targetVx = dirLen > 0 ? (dirX / dirLen) * targetSpeed : 0;
  const targetVz = dirLen > 0 ? (dirZ / dirLen) * targetSpeed : 0;

  const dvx = targetVx - s.vx;
  const dvz = targetVz - s.vz;
  const dvLen = Math.hypot(dvx, dvz);

  const isBraking =
    dirLen === 0 ||
    s.vx * targetVx + s.vz * targetVz < 0 ||
    Math.hypot(s.vx, s.vz) > targetSpeed + 1e-6;
  const accelRate = isBraking ? BRAKE_ACCEL : ACCEL;
  const maxDeltaV = accelRate * clampedDt;

  let vx = dvLen <= maxDeltaV || dvLen === 0 ? targetVx : s.vx + (dvx / dvLen) * maxDeltaV;
  let vz = dvLen <= maxDeltaV || dvLen === 0 ? targetVz : s.vz + (dvz / dvLen) * maxDeltaV;

  const wantDx = vx * clampedDt;
  const wantDz = vz * clampedDt;
  const [x, z] = moveBody(s.x, s.z, wantDx, wantDz, list);

  if (Math.hypot(wantDx, wantDz) > 1e-9 && Math.hypot(x - s.x, z - s.z) < 1e-9) {
    vx = 0;
    vz = 0;
  } else {
    [vx, vz] = stripWallVelocity(x, z, vx, vz, list);
  }

  return { x, z, vx, vz };
}