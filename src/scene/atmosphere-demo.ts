import * as THREE from 'three';
import { ROOMS, LOCI, viewpoint, EYE_HEIGHT } from '../data/palace.ts';
import { buildPalaceWorld } from './palaceWorld.ts';
import { buildDecor, lampPositions } from './decor.ts';
import { buildAtmosphere } from './atmosphere.ts';

const ROOM_LABELS = ['Library', 'Kitchen', 'Greenhouse', 'Observatory'] as const;

function resolveViewpointXZ(locusIndex: number): [number, number] {
  const locus = LOCI[locusIndex]!;
  let raw: unknown;
  try {
    raw = (viewpoint as (arg: unknown) => unknown)(locusIndex);
    if (!raw) raw = (viewpoint as (arg: unknown) => unknown)(locus);
  } catch {
    raw = (viewpoint as (arg: unknown) => unknown)(locus);
  }
  if (Array.isArray(raw)) {
    return raw.length >= 3 ? [Number(raw[0]), Number(raw[2])] : [Number(raw[0]), Number(raw[1])];
  }
  if (raw && typeof raw === 'object' && 'x' in raw && 'z' in raw) {
    const v = raw as { x: number; z: number };
    return [v.x, v.z];
  }
  return [locus.pos[0] + locus.face[0] * 1.8, locus.pos[1] + locus.face[1] * 1.8];
}

function thirdLocusIndexInRoom(roomIdx: number): number {
  const room = ROOMS[roomIdx]!;
  const x0 = room.rect.x0;
  const x1 = x0 + 14;
  const matches: number[] = [];
  for (let i = 0; i < LOCI.length; i++) {
    const lx = LOCI[i]!.pos[0];
    if (lx >= x0 && lx <= x1) {
      matches.push(i);
    }
  }
  return matches[2] ?? roomIdx * 13 + 2;
}

export function mountAtmosphereDemo(container: HTMLElement): void {
  container.innerHTML = '';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    90,
  );

  const palace = buildPalaceWorld();
  const decor = buildDecor();
  scene.add(palace.root);
  scene.add(decor.root);

  const standInGeo = new THREE.BoxGeometry(1, 1.2, 0.8);
  const standInMeshes: THREE.Mesh[] = [];
  const standInGroup = new THREE.Group();
  standInGroup.name = 'loci_stand_ins';

  for (let i = 0; i < LOCI.length; i++) {
    const locus = LOCI[i]!;
    const mat = new THREE.MeshStandardMaterial({
      color: locus.color,
      roughness: 0.6,
      metalness: 0.1,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(standInGeo, mat);
    mesh.position.set(locus.pos[0], 0.6, locus.pos[1]);
    mesh.rotation.y = Math.atan2(locus.face[0], locus.face[1]);
    standInGroup.add(mesh);
    standInMeshes.push(mesh);
  }
  scene.add(standInGroup);

  const lamps = lampPositions().map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const atmosphere = buildAtmosphere(renderer, scene, {
    casters: standInMeshes,
    receivers: [palace.root, decor.root],
    lamps,
  });

  const hud = document.createElement('div');
  hud.setAttribute(
    'style',
    'position: fixed; top: 12px; left: 12px; z-index: 10; display: flex; flex-direction: column; gap: 8px; background: rgba(17, 24, 39, 0.88); border: 1px solid var(--border, #334155); border-radius: 8px; padding: 10px 14px;',
  );

  const btnBar = document.createElement('div');
  btnBar.setAttribute('style', 'display: flex; flex-wrap: wrap; gap: 8px;');

  let walkStartMs: number | null = null;

  const jumpToRoom = (roomIdx: number): void => {
    walkStartMs = null;
    const locusIdx = thirdLocusIndexInRoom(roomIdx);
    const locus = LOCI[locusIdx]!;
    const [vx, vz] = resolveViewpointXZ(locusIdx);
    camera.position.set(vx, EYE_HEIGHT, vz);
    camera.lookAt(locus.pos[0], 0.8, locus.pos[1]);
    atmosphere.update(camera.position.x, camera.position.z);
  };

  for (let r = 0; r < ROOMS.length; r++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = ROOM_LABELS[r] ?? `Room ${r + 1}`;
    btn.addEventListener('click', () => jumpToRoom(r));
    btnBar.appendChild(btn);
  }

  const walkBtn = document.createElement('button');
  walkBtn.type = 'button';
  walkBtn.textContent = 'Walk through';
  walkBtn.addEventListener('click', () => {
    walkStartMs = performance.now();
  });
  btnBar.appendChild(walkBtn);

  const statsLine = document.createElement('div');
  statsLine.setAttribute(
    'style',
    'font-family: monospace; font-size: 0.85rem; font-variant-numeric: tabular-nums; color: var(--text, #f8fafc);',
  );
  statsLine.textContent = 'calls: 0 | triangles: 0 | fps: 60';

  hud.append(btnBar, statsLine);
  container.appendChild(hud);

  jumpToRoom(0);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let lastFrameMs = performance.now();
  let smoothedFps = 60;

  const tick = (now: number): void => {
    const dt = Math.max(1, now - lastFrameMs);
    lastFrameMs = now;
    smoothedFps = smoothedFps * 0.9 + (1000 / dt) * 0.1;

    if (walkStartMs !== null) {
      const elapsed = now - walkStartMs;
      const t = Math.min(1, elapsed / 20000);
      const x = 2 + (56 - 2) * t;
      camera.position.set(x, EYE_HEIGHT, 7);
      camera.lookAt(Math.min(57.5, x + 4), EYE_HEIGHT, 7);
      if (t >= 1) {
        walkStartMs = null;
      }
    }

    atmosphere.update(camera.position.x, camera.position.z);
    renderer.render(scene, camera);

    const { calls, triangles } = renderer.info.render;
    statsLine.textContent = `calls: ${calls} | triangles: ${triangles} | fps: ${Math.round(smoothedFps)}`;

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

if (typeof document !== 'undefined') {
  const app = document.getElementById('app');
  if (app) {
    mountAtmosphereDemo(app);
  }
}