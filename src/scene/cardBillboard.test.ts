import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CardBillboardManager } from './cardBillboard.ts';
import { disposeCardTextures } from './cardTexture.ts';

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  static failNext = false;

  set src(val: string) {
    this._src = val;
    queueMicrotask(() => {
      if (MockImage.failNext) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
  get src() {
    return this._src;
  }
}

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: () => ({ drawImage: () => {} }),
};

const g = globalThis as Record<string, unknown>;
const originalImage = g.Image;
const originalDocument = g.document;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  disposeCardTextures();
  MockImage.failNext = false;
  g.Image = MockImage;
  g.document = {
    createElement: (tag: string) => (tag === 'canvas' ? { ...mockCanvas } : {}),
    documentElement: { classList: { contains: () => false } },
  };
  URL.createObjectURL = () => `blob:mock-${Math.random()}`;
  URL.revokeObjectURL = () => {};
});

afterEach(() => {
  disposeCardTextures();
  g.Image = originalImage;
  g.document = originalDocument;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

test('CardBillboardManager shows card and updates material map upon load', async () => {
  const scene = new THREE.Scene();
  const manager = new CardBillboardManager(scene);

  manager.showCard(0, [1, 2], 'AS', { opacity: 0.8 });
  assert.equal(scene.children.length, 1);
  const mesh = scene.children[0] as THREE.Mesh;
  assert.equal(mesh.position.x, 1);
  assert.equal(mesh.position.z, 2);
  assert.equal(mesh.visible, false);

  // Wait for texture promise microtask
  await new Promise((r) => setTimeout(r, 10));

  assert.equal(mesh.visible, true);
  const mat = mesh.material as THREE.MeshBasicMaterial;
  assert.ok(mat.map instanceof THREE.Texture);
  assert.equal(mat.opacity, 0.8);

  manager.dispose();
  assert.equal(scene.children.length, 0);
});

test('CardBillboardManager update modifies Y bob and camera billboard rotation', async () => {
  const scene = new THREE.Scene();
  const manager = new CardBillboardManager(scene);
  manager.showCard(3, [5, 6], 'KH');

  const camera = new THREE.PerspectiveCamera();
  camera.quaternion.set(0.1, 0.2, 0.3, 0.9).normalize();

  manager.update(1.0, camera);
  const mesh = scene.children[0] as THREE.Mesh;
  const expectedY = 1.9 + Math.sin(1.0 * 2.5 + 3) * 0.04;
  assert.ok(Math.abs(mesh.position.y - expectedY) < 1e-5);
  assert.ok(Math.abs(mesh.quaternion.x - camera.quaternion.x) < 1e-5);
  assert.ok(Math.abs(mesh.quaternion.y - camera.quaternion.y) < 1e-5);

  manager.dispose();
});

test('CardBillboardManager handles load error by removing card', async () => {
  const scene = new THREE.Scene();
  const manager = new CardBillboardManager(scene);
  MockImage.failNext = true;

  manager.showCard(1, [0, 0], '2D');
  assert.equal(scene.children.length, 1);

  await new Promise((r) => setTimeout(r, 15));
  assert.equal(scene.children.length, 0);

  manager.dispose();
});

test('CardBillboardManager replaces previous card at same locus and handles token mismatch', async () => {
  const scene = new THREE.Scene();
  const manager = new CardBillboardManager(scene);

  manager.showCard(0, [1, 1], '3H');
  // Immediately show another card at same index before first finishes
  manager.showCard(0, [1, 1], '4C');

  await new Promise((r) => setTimeout(r, 15));
  assert.equal(scene.children.length, 1);

  manager.removeCard(0);
  assert.equal(scene.children.length, 0);

  manager.dispose();
});

test('CardBillboardManager clamps opacity and handles null card', () => {
  const scene = new THREE.Scene();
  const manager = new CardBillboardManager(scene);

  manager.showCard(0, [0, 0], null);
  assert.equal(scene.children.length, 0);

  manager.showCard(0, [0, 0], '5S', { opacity: 2.5 });
  const mesh = scene.children[0] as THREE.Mesh;
  const mat = mesh.material as THREE.MeshBasicMaterial;
  assert.equal(mat.opacity, 1.0);

  manager.dispose();
});
