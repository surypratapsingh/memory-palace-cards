import * as THREE from 'three';
import { DECK } from '../deck.ts';
import { cardTexture, disposeCardTextures } from '../scene/cardTexture.ts';
import { cardBackSvg, cardSvg, type CardTheme } from './cardArt.ts';

let currentTheme: CardTheme = 'classic';

const grid60 = document.getElementById('grid-60');
const grid120 = document.getElementById('grid-120');
const grid250 = document.getElementById('grid-250');
const btnClassic = document.getElementById('btn-classic');
const btnFour = document.getElementById('btn-four');

function populateGrid(container: HTMLElement | null, width: number, theme: CardTheme): void {
  if (!container) return;
  const parts: string[] = [];
  for (const id of DECK) {
    parts.push(cardSvg(id, { theme, width }));
  }
  parts.push(cardBackSvg({ width }));
  container.innerHTML = parts.join('');
}

function renderAllGrids(theme: CardTheme): void {
  populateGrid(grid60, 60, theme);
  populateGrid(grid120, 120, theme);
  populateGrid(grid250, 250, theme);
}

const canvasHost = document.getElementById('canvas-host');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(320, 260);
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasHost?.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f19);

const camera = new THREE.PerspectiveCamera(45, 320 / 260, 0.1, 50);
camera.position.set(0, 0, 3.2);

const planeGeo = new THREE.PlaneGeometry(1.25, 1.75);
const planeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
scene.add(planeMesh);

async function updateBillboardTexture(theme: CardTheme): Promise<void> {
  const tex = await cardTexture('QH', theme);
  planeMat.map = tex;
  planeMat.needsUpdate = true;
}

function setTheme(theme: CardTheme): void {
  currentTheme = theme;
  btnClassic?.classList.toggle('active', theme === 'classic');
  btnFour?.classList.toggle('active', theme === 'four-colour');
  renderAllGrids(theme);
  void updateBillboardTexture(theme);
}

btnClassic?.addEventListener('click', () => setTheme('classic'));
btnFour?.addEventListener('click', () => setTheme('four-colour'));

window.addEventListener('beforeunload', () => {
  disposeCardTextures();
  planeGeo.dispose();
  planeMat.dispose();
  renderer.dispose();
});

setTheme(currentTheme);

function animate(): void {
  requestAnimationFrame(animate);
  planeMesh.rotation.y += 0.012;
  renderer.render(scene, camera);
}

animate();