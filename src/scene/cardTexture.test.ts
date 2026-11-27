import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cardTexture, cardBackTexture, releaseCardTexture, disposeCardTextures } from './cardTexture.ts';

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

let mock2dContext: { drawImage: () => void } | null = { drawImage: () => {} };

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: (type: string) => {
    if (type === '2d') return mock2dContext;
    return null;
  },
};

const g = globalThis as Record<string, unknown>;
const originalImage = g.Image;
const originalDocument = g.document;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

const createdUrls: string[] = [];
const revokedUrls: string[] = [];

beforeEach(() => {
  disposeCardTextures();
  MockImage.failNext = false;
  mock2dContext = { drawImage: () => {} };
  createdUrls.length = 0;
  revokedUrls.length = 0;

  g.Image = MockImage;
  g.document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return { ...mockCanvas, getContext: mockCanvas.getContext };
      return {};
    },
    documentElement: { classList: { contains: () => false } },
  };

  URL.createObjectURL = (blob: Blob) => {
    const url = `blob:mock-${Math.random()}`;
    createdUrls.push(url);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revokedUrls.push(url);
  };
});

afterEach(() => {
  disposeCardTextures();
  g.Image = originalImage;
  g.document = originalDocument;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

test('cardTexture loads texture with sRGB and mipmaps', async () => {
  const tex = await cardTexture('AS', 'classic');
  assert.ok(tex instanceof THREE.CanvasTexture);
  assert.equal(tex.colorSpace, THREE.SRGBColorSpace);
  assert.equal(tex.anisotropy, 8);
  assert.equal(tex.generateMipmaps, true);
  assert.ok(revokedUrls.length > 0);
  releaseCardTexture(tex);
});

test('cardTexture caches and reference counts repeat requests', async () => {
  const tex1 = await cardTexture('KH', 'classic');
  const tex2 = await cardTexture('KH', 'classic');
  assert.equal(tex1, tex2);

  // First release should decrement refcount but not dispose
  let disposed = false;
  tex1.dispose = () => { disposed = true; };
  releaseCardTexture(tex1);
  assert.equal(disposed, false);

  // Second release reaches 0 and disposes
  releaseCardTexture(tex2);
  assert.equal(disposed, true);
});

test('cardTexture handles concurrent requests with single promise', async () => {
  const [t1, t2] = await Promise.all([
    cardTexture('QD', 'four-colour'),
    cardTexture('QD', 'four-colour'),
  ]);
  assert.equal(t1, t2);
  releaseCardTexture(t1);
  releaseCardTexture(t2);
});

test('cardBackTexture loads card back texture', async () => {
  const back = await cardBackTexture();
  assert.ok(back instanceof THREE.CanvasTexture);
  releaseCardTexture(back);
});

test('releaseCardTexture safely ignores untracked texture', () => {
  const untracked = new THREE.CanvasTexture({ width: 10, height: 10 } as HTMLCanvasElement);
  assert.doesNotThrow(() => releaseCardTexture(untracked));
});

test('cardTexture rejects when image decoding fails and allows retry', async () => {
  MockImage.failNext = true;
  await assert.rejects(
    () => cardTexture('JH', 'classic'),
    /Failed to decode SVG image/
  );

  // Subsequent request after failure should retry cleanly and succeed
  MockImage.failNext = false;
  const retryTex = await cardTexture('JH', 'classic');
  assert.ok(retryTex instanceof THREE.CanvasTexture);
  releaseCardTexture(retryTex);
});

test('cardTexture rejects when canvas context is null', async () => {
  mock2dContext = null;
  await assert.rejects(
    () => cardTexture('TS', 'classic'),
    /Failed to acquire 2D canvas context/
  );
});

test('disposeCardTextures aborts in-flight loading if generation advances', async () => {
  const pendingPromise = cardTexture('9H', 'classic');
  disposeCardTextures(); // Advances generation immediately
  await assert.rejects(
    () => pendingPromise,
    /Card texture was disposed before loading completed/
  );
});

test('disposeCardTextures disposes cached textures and revokes active urls', async () => {
  const tex = await cardTexture('8C', 'classic');
  let disposed = false;
  tex.dispose = () => { disposed = true; };

  disposeCardTextures();
  assert.equal(disposed, true);
});
