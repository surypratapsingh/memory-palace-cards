import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ROOMS, LOCI, EYE_HEIGHT, viewpoint } from '../data/palace.ts';
import { buildPalaceWorld } from './palaceWorld.ts';
import { buildDecor, decorLayout } from './decor.ts';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090d16);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const world = buildPalaceWorld();
const decor = buildDecor();
scene.add(world.root);
scene.add(decor.root);

const debugGroup = new THREE.Group();
debugGroup.visible = false;
scene.add(debugGroup);

const ZONE_COLORS = {
  floor: 0x22c55e,
  ceiling: 0x3b82f6,
  wall: 0xef4444,
} as const;

for (const item of decorLayout()) {
  const box = new THREE.Box3(
    new THREE.Vector3(item.min[0], item.min[1], item.min[2]),
    new THREE.Vector3(item.max[0], item.max[1], item.max[2]),
  );
  debugGroup.add(new THREE.Box3Helper(box, ZONE_COLORS[item.zone]));
}

const sightPositions: number[] = [];
for (let i = 0; i < LOCI.length; i++) {
  const locus = LOCI[i]!;
  const vp = viewpoint(i);
  for (const h of [0.3, 1.0, 1.8]) {
    sightPositions.push(vp[0], EYE_HEIGHT, vp[1], locus.pos[0], h, locus.pos[1]);
  }
}
const sightGeo = new THREE.BufferGeometry();
sightGeo.setAttribute('position', new THREE.Float32BufferAttribute(sightPositions, 3));
const sightMat = new THREE.LineBasicMaterial({ color: 0xfacc15 });
debugGroup.add(new THREE.LineSegments(sightGeo, sightMat));

function setOverview(): void {
  camera.position.set(28.75, 28, 32);
  controls.target.set(28.75, 1.5, 7);
  controls.update();
}

function setRoomView(roomIndex: number): void {
  const room = ROOMS[roomIndex];
  const locus = LOCI[roomIndex * 13 + 3];
  if (!room || !locus) return;
  const cx = (room.rect.x0 + room.rect.x1) * 0.5;
  const cz = (room.rect.z0 + room.rect.z1) * 0.5;
  camera.position.set(cx, EYE_HEIGHT, cz);
  controls.target.set(locus.pos[0], EYE_HEIGHT, locus.pos[1]);
  controls.update();
}

const overviewBtn = document.getElementById('btn-overview');
overviewBtn?.addEventListener('click', setOverview);

const roomButtonsContainer = document.getElementById('room-buttons');
ROOMS.forEach((room, index) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = room.name;
  btn.addEventListener('click', () => setRoomView(index));
  roomButtonsContainer?.appendChild(btn);
});

const boxesCheckbox = document.getElementById('chk-boxes') as HTMLInputElement | null;
boxesCheckbox?.addEventListener('change', () => {
  debugGroup.visible = Boolean(boxesCheckbox.checked);
});

const statsEl = document.getElementById('stats');

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

setOverview();

function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  if (statsEl) {
    const { calls, triangles } = renderer.info.render;
    statsEl.textContent = `calls: ${calls} | triangles: ${triangles}`;
  }
}

animate();