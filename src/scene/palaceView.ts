// PalaceView implementation.
// Spec: tasks/T1-scene.md, MATHS.md sections 7 and 8.
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { CardId, CreatePalaceView, LocusInfo, LocusMood, PalaceView } from '../types.ts';
import { LOCI, EYE_HEIGHT, viewpoint, glidePath } from '../data/palace.ts';
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
import { createFreeWalk } from './freeWalk.ts';
import { nearestFree } from './collide.ts';

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
  const freeWalk = createFreeWalk();
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let dragPitch = 0;
  let dragPointerId: number | null = null;
  let activeGlide: ActiveGlide | null = null;
  const clickCallbacks: ((index: number) => void)[] = [];

  // Initialize camera position at locus 0
  const initVp = viewpoint(0);
  camera.position.set(initVp[0], EYE_HEIGHT, initVp[1]);
  camera.rotation.y = Math.atan2(LOCI[0].face[0], LOCI[0].face[1]);
  const guidedPitch = Math.atan2(1.3 - EYE_HEIGHT, 1.8);

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
    isSimulatedLock = true;
    e.stopImmediatePropagation();
  };
  document.addEventListener('pointerlockerror', onPointerLockError, true);

  const isEditableTarget = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!freeWalkEnabled || isEditableTarget(e.target)) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      if (controls.isLocked) controls.unlock();
      isSimulatedLock = false;
      dragging = false;
      freeWalk.clear();
      endPointerDrag();
      return;
    }
    freeWalk.keyDown(e.code);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) return;
    freeWalk.keyUp(e.code);
  };

  const endPointerDrag = () => {
    if (dragPointerId !== null && renderer.domElement.hasPointerCapture?.(dragPointerId)) {
      renderer.domElement.releasePointerCapture(dragPointerId);
    }
    dragging = false;
    dragPointerId = null;
  };
  const onBlur = () => {
    freeWalk.clear();
    endPointerDrag();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') onBlur();
  };
  const onPointerLockChange = () => {
    if (document.pointerLockElement !== renderer.domElement) onBlur();
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  let dragMoved = false;
  const onPointerDown = (e: PointerEvent) => {
    if (!freeWalkEnabled || controls.isLocked || dragPointerId !== null || e.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragPointerId = e.pointerId;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    renderer.domElement.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== dragPointerId || controls.isLocked) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
    camera.rotation.y -= dx * 0.003;
    dragPitch = THREE.MathUtils.clamp(dragPitch - dy * 0.003, -Math.PI / 3, Math.PI / 3);
    camera.rotation.x = dragPitch;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (dragPointerId !== e.pointerId) return;
    endPointerDrag();
  };
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);

  const raycastLocus = (clientX: number, clientY: number, locked: boolean): void => {
    const raycaster = new THREE.Raycaster();
    const rect = renderer.domElement.getBoundingClientRect();
    const point = locked
      ? new THREE.Vector2(0, 0)
      : new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(point, camera);
    const intersects = raycaster.intersectObjects(locusGroup.children, true);
    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr && curr !== locusGroup) {
        if (typeof curr.userData?.locusIndex === 'number') {
          for (const cb of clickCallbacks) cb(curr.userData.locusIndex);
          return;
        }
        curr = curr.parent;
      }
    }
  };

  const onCanvasClick = (e: MouseEvent) => {
    if (!freeWalkEnabled) return;
    if (dragMoved) {
      dragMoved = false;
      return;
    }
    if (!controls.isLocked && !isSimulatedLock) {
      try {
        const result = renderer.domElement.requestPointerLock?.();
        if (result && typeof (result as Promise<void>).catch === 'function') {
          void (result as Promise<void>).catch(() => {
            isSimulatedLock = true;
            raycastLocus(e.clientX, e.clientY, false);
          });
          if (!isSimulatedLock) return;
        } else if (result !== undefined) {
          return;
        } else {
          isSimulatedLock = true;
        }
      } catch {
        isSimulatedLock = true;
      }
    }
    raycastLocus(e.clientX, e.clientY, controls.isLocked);
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
      camera.rotation.x = guidedPitch;

      if (tNorm >= 1) {
        currentLocusIndex = activeGlide.targetIndex;
        const finish = activeGlide.resolve;
        activeGlide = null;
        finish();
      }
    }

    // 2. Free walk update
    if (freeWalkEnabled) {
      const next = freeWalk.step(camera.position, camera.rotation.y, delta);
      camera.position.x = next.x;
      camera.position.z = next.z;
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
        camera.rotation.x = guidedPitch;
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
      if (freeWalkEnabled === on) return;
      freeWalkEnabled = on;
      if (on) {
        const [x, z] = nearestFree(camera.position.x, camera.position.z);
        camera.position.set(x, EYE_HEIGHT, z);
        dragPitch = camera.rotation.x;
      } else {
        freeWalk.clear();
        endPointerDrag();
        isSimulatedLock = false;
        if (controls.isLocked) controls.unlock();
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
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      freeWalk.clear();
      endPointerDrag();
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
