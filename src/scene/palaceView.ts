// PalaceView implementation.
// Spec: tasks/T1-scene.md, MATHS.md sections 7 and 8.
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { CardId, CreatePalaceView, LocusInfo, LocusMood, PalaceView } from '../types.ts';
import { LOCI, EYE_HEIGHT, viewpoint, isWalkable, glidePath } from '../data/palace.ts';
import { easeInOutCubic, lerpAngle } from './ease.ts';
import {
  buildLocusObject,
  updateLocusMoodVisuals,
  disposeLocusNode,
  disposeSharedGeometries,
  type LocusNode,
} from './objectKit.ts';
import { CardBillboardManager } from './cardBillboard.ts';
import { buildPalaceWorld, type PalaceWorld } from './palaceWorld.ts';
import { buildAtmosphere } from './atmosphere.ts';
import { lampPositions } from './decor.ts';

interface ActiveGlide {
  path: [number, number][];
  cumDists: number[];
  totalDist: number;
  startYaw: number;
  targetYaw: number;
  startTime: number;
  durationMs: number;
  targetIndex: number;
  resolve: () => void;
}

export const createPalaceView: CreatePalaceView = (container: HTMLElement): PalaceView => {
  // Renderer setup
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
  container.appendChild(renderer.domElement);

  // Scene & Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  const aspect = (container.clientWidth || 800) / (container.clientHeight || 600);
  const camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
  camera.rotation.order = 'YXZ';

  // Build architecture
  const world: PalaceWorld = buildPalaceWorld();
  scene.add(world.root);

  // Build 52 locus objects
  const locusNodes: LocusNode[] = [];
  const locusGroup = new THREE.Group();
  for (let i = 0; i < LOCI.length; i++) {
    const node = buildLocusObject(LOCI[i]);
    locusNodes.push(node);
    locusGroup.add(node.group);
  }
  scene.add(locusGroup);

  // Atmosphere
  const atmosphere = buildAtmosphere(renderer, scene, {
    casters: locusNodes.map((n) => n.group),
    receivers: world.receivers,
    lamps: lampPositions().map((p) => new THREE.Vector3(...p)),
  });

  // Card billboard manager
  const cardManager = new CardBillboardManager(scene);

  // State
  let currentLocusIndex = 0;
  let glideMs = 600;
  let freeWalkEnabled = false;
  let isSimulatedLock = false;
  let activeGlide: ActiveGlide | null = null;
  const clickCallbacks: ((index: number) => void)[] = [];

  // Initialize camera position at locus 0
  const initVp = viewpoint(0);
  camera.position.set(initVp[0], EYE_HEIGHT, initVp[1]);
  camera.rotation.y = Math.atan2(LOCI[0].face[0], LOCI[0].face[1]);

  // PointerLockControls for free walk
  const controls = new PointerLockControls(camera, renderer.domElement);

  // Wrap renderer.domElement.requestPointerLock to handle restricted environments
  // (e.g. embedded previews or iframes where requestPointerLock rejects with WrongDocumentError)
  const origRequestPointerLock = renderer.domElement.requestPointerLock
    ? renderer.domElement.requestPointerLock.bind(renderer.domElement)
    : null;
  if (origRequestPointerLock) {
    renderer.domElement.requestPointerLock = function (options?: PointerLockOptions) {
      try {
        const res = origRequestPointerLock(options);
        if (res && typeof (res as Promise<void>).catch === 'function') {
          (res as Promise<void>).catch(() => {
            isSimulatedLock = true;
          });
        }
        return res;
      } catch {
        isSimulatedLock = true;
        return Promise.resolve();
      }
    };
  }

  // Intercept pointerlockerror during capture phase to prevent noisy Three.js
  // console errors when running inside restricted iframes / embedded previews
  const onPointerLockError = (e: Event) => {
    e.stopImmediatePropagation();
  };
  document.addEventListener('pointerlockerror', onPointerLockError, true);

  // Keyboard state for free walk
  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && freeWalkEnabled) {
      if (controls.isLocked) {
        controls.unlock();
      }
      isSimulatedLock = false;
    }
    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = true;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = false;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Free walk click-to-lock
  const onCanvasClick = (e: MouseEvent) => {
    if (freeWalkEnabled && !controls.isLocked && !isSimulatedLock) {
      try {
        const promise = controls.lock() as unknown;
        if (promise && typeof (promise as Promise<unknown>).catch === 'function') {
          (promise as Promise<unknown>).catch(() => {
            isSimulatedLock = true;
          });
        }
      } catch {
        isSimulatedLock = true;
      }
      return;
    }

    // Raycast locus click
    const raycaster = new THREE.Raycaster();
    if (controls.isLocked || isSimulatedLock) {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    } else {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    }

    const intersects = raycaster.intersectObjects(locusGroup.children, true);
    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr && curr !== locusGroup) {
        if (typeof curr.userData?.locusIndex === 'number') {
          const hitIdx = curr.userData.locusIndex;
          for (const cb of clickCallbacks) {
            cb(hitIdx);
          }
          return;
        }
        curr = curr.parent;
      }
    }
  };

  renderer.domElement.addEventListener('click', onCanvasClick);

  // ResizeObserver
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    }
  });
  resizeObserver.observe(container);

  // Main animation loop
  let lastTime = performance.now();
  const startTime = lastTime;

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const elapsedTime = (now - startTime) / 1000;

    // 1. Update active camera glide
    if (activeGlide) {
      const elapsedMs = performance.now() - activeGlide.startTime;
      const tNorm = Math.min(1, Math.max(0, elapsedMs / activeGlide.durationMs));
      const eased = easeInOutCubic(tNorm);

      if (activeGlide.totalDist > 0) {
        const targetDist = eased * activeGlide.totalDist;
        const pts = activeGlide.path;
        const cum = activeGlide.cumDists;

        // Find current segment
        let seg = 0;
        while (seg < cum.length - 2 && cum[seg + 1] < targetDist) {
          seg++;
        }

        const segLen = cum[seg + 1] - cum[seg];
        const segT = segLen > 1e-6 ? (targetDist - cum[seg]) / segLen : 0;
        const posX = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * segT;
        const posZ = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * segT;

        camera.position.x = posX;
        camera.position.z = posZ;
      }

      camera.position.y = EYE_HEIGHT;
      camera.rotation.y = lerpAngle(activeGlide.startYaw, activeGlide.targetYaw, eased);

      if (tNorm >= 1) {
        currentLocusIndex = activeGlide.targetIndex;
        const finish = activeGlide.resolve;
        activeGlide = null;
        finish();
      }
    }

    // 2. Free walk update
    if (freeWalkEnabled) {
      const moveForward = keys.w || keys.ArrowUp;
      const moveBackward = keys.s || keys.ArrowDown;
      const moveLeft = keys.a || keys.ArrowLeft;
      const moveRight = keys.d || keys.ArrowRight;

      if (moveForward || moveBackward || moveLeft || moveRight) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();

        const moveDir = new THREE.Vector3();
        if (moveForward) moveDir.add(forward);
        if (moveBackward) moveDir.sub(forward);
        if (moveRight) moveDir.add(right);
        if (moveLeft) moveDir.sub(right);

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          const speed = 3.0; // 3 m/s
          const dx = moveDir.x * speed * delta;
          const dz = moveDir.z * speed * delta;

          const oldX = camera.position.x;
          const oldZ = camera.position.z;

          // Wall slide: try x move then z move separately
          if (isWalkable(oldX + dx, oldZ)) {
            camera.position.x = oldX + dx;
          }
          if (isWalkable(camera.position.x, oldZ + dz)) {
            camera.position.z = oldZ + dz;
          }
        }
      }
      camera.position.y = EYE_HEIGHT;
    }

    // 3. Update locus mood animations
    for (const node of locusNodes) {
      updateLocusMoodVisuals(node, elapsedTime);
    }

    // 4. Update card billboards
    cardManager.update(elapsedTime, camera);

    // 5. Update atmosphere
    atmosphere.update(camera.position.x, camera.position.z);

    // 6. Render
    renderer.render(scene, camera);
  });

  const view: PalaceView = {
    get loci(): readonly LocusInfo[] {
      return LOCI;
    },

    glideTo(index: number): Promise<void> {
      const targetLocus = LOCI[index];
      const targetVp = viewpoint(index);
      const targetYaw = Math.atan2(targetLocus.face[0], targetLocus.face[1]);

      // If already gliding, resolve earlier promise immediately
      if (activeGlide) {
        activeGlide.resolve();
        activeGlide = null;
      }

      if (glideMs <= 0) {
        camera.position.set(targetVp[0], EYE_HEIGHT, targetVp[1]);
        camera.rotation.y = targetYaw;
        currentLocusIndex = index;
        return new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(done);
          }
          setTimeout(done, 16);
        });
      }

      const path = glidePath(currentLocusIndex, index);
      const cumDists: number[] = [0];
      let totalDist = 0;
      for (let k = 0; k < path.length - 1; k++) {
        const segDist = Math.hypot(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1]);
        totalDist += segDist;
        cumDists.push(totalDist);
      }

      return new Promise<void>((resolve) => {
        activeGlide = {
          path,
          cumDists,
          totalDist,
          startYaw: camera.rotation.y,
          targetYaw,
          startTime: performance.now(),
          durationMs: glideMs,
          targetIndex: index,
          resolve,
        };
      });
    },

    showCard(index: number, card: CardId | null, opts?: { caption?: string; opacity?: number }): void {
      if (index < 0 || index >= LOCI.length) return;
      cardManager.showCard(index, LOCI[index].pos, card, opts);
    },

    clearCards(): void {
      cardManager.clearCards();
    },

    setLocusMood(index: number, mood: LocusMood): void {
      if (index >= 0 && index < locusNodes.length) {
        locusNodes[index].mood = mood;
      }
    },

    setFreeWalk(on: boolean): void {
      freeWalkEnabled = on;
      if (!on) {
        isSimulatedLock = false;
        if (controls.isLocked) {
          controls.unlock();
        }
      }
    },

    setGlideMs(ms: number): void {
      glideMs = Math.max(0, ms);
    },

    onLocusClick(cb: (index: number) => void): () => void {
      clickCallbacks.push(cb);
      return () => {
        const i = clickCallbacks.indexOf(cb);
        if (i >= 0) clickCallbacks.splice(i, 1);
      };
    },

    dispose(): void {
      // 1. Stop animation loop
      renderer.setAnimationLoop(null);

      // 2. Disconnect ResizeObserver
      resizeObserver.disconnect();

      // 3. Remove event listeners
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      document.removeEventListener('pointerlockerror', onPointerLockError, true);
      if (origRequestPointerLock) {
        renderer.domElement.requestPointerLock = origRequestPointerLock;
      }

      // 4. Resolve pending glide promise
      if (activeGlide) {
        activeGlide.resolve();
        activeGlide = null;
      }

      // 5. Dispose controls
      controls.dispose();

      // 6. Dispose cards
      cardManager.dispose();

      // 6b. Dispose atmosphere
      atmosphere.dispose();

      // 7. Dispose world architecture
      world.dispose();

      // 8. Dispose locus objects
      for (const node of locusNodes) {
        disposeLocusNode(node);
      }
      disposeSharedGeometries();

      // 9. Dispose renderer and remove canvas
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    },
  };
  (view as unknown as { renderer?: THREE.WebGLRenderer }).renderer = renderer;
  return view;
};
