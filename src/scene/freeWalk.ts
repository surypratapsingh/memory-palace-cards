import { nearestFree } from './collide.ts';
import { keysFromCodes, stepWalk, type WalkState } from './walkInput.ts';

export interface FreeWalkController {
  keyDown(code: string): void;
  keyUp(code: string): void;
  clear(): void;
  step(pos: { x: number; z: number }, yaw: number, dt: number): { x: number; z: number };
}

export function createFreeWalk(): FreeWalkController {
  const down = new Set<string>();
  let state: WalkState = { x: 0, z: 0, vx: 0, vz: 0 };
  let initialized = false;

  return {
    keyDown(code) {
      down.add(code);
    },
    keyUp(code) {
      down.delete(code);
    },
    clear() {
      down.clear();
      state.vx = 0;
      state.vz = 0;
    },
    step(pos, yaw, dt) {
      if (!initialized || state.x !== pos.x || state.z !== pos.z) {
        const [x, z] = nearestFree(pos.x, pos.z);
        state = { x, z, vx: 0, vz: 0 };
        initialized = true;
      }
      state = stepWalk(state, keysFromCodes(down), yaw, dt);
      return { x: state.x, z: state.z };
    },
  };
}
