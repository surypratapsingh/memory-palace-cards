import * as THREE from 'three';
import type { CardId } from '../types.ts';
import { cardBackSvg, cardSvg, type CardTheme } from '../ui/cardArt.ts';

const TEX_W = 256;
const TEX_H = 358;

const promiseCache = new Map<string, Promise<THREE.Texture>>();
const textureCache = new Set<THREE.Texture>();
const textureReferences = new Map<THREE.Texture, number>();
const textureKeys = new Map<THREE.Texture, string>();
const activeBlobUrls = new Set<string>();
let generation = 0;

function renderSvgToTexture(svgMarkup: string, cacheKey: string): Promise<THREE.Texture> {
  const existing = promiseCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const callGen = generation;
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    activeBlobUrls.add(url);

    const img = new Image();
    img.onload = () => {
      if (activeBlobUrls.has(url)) {
        URL.revokeObjectURL(url);
        activeBlobUrls.delete(url);
      }

      const canvas = document.createElement('canvas');
      canvas.width = TEX_W;
      canvas.height = TEX_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        promiseCache.delete(cacheKey);
        reject(new Error('Failed to acquire 2D canvas context for card texture'));
        return;
      }

      ctx.drawImage(img, 0, 0, TEX_W, TEX_H);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;

      if (callGen !== generation) {
        texture.dispose();
        reject(new Error('Card texture was disposed before loading completed'));
        return;
      }
      textureCache.add(texture);
      textureKeys.set(texture, cacheKey);
      resolve(texture);
    };

    img.onerror = () => {
      if (activeBlobUrls.has(url)) {
        URL.revokeObjectURL(url);
        activeBlobUrls.delete(url);
      }
      promiseCache.delete(cacheKey);
      reject(new Error(`Failed to decode SVG image for ${cacheKey}`));
    };

    img.src = url;
  });

  promiseCache.set(cacheKey, promise);
  return promise;
}

export function cardTexture(id: CardId, theme: CardTheme = 'classic'): Promise<THREE.Texture> {
  const key = `card:${id}:${theme}`;
  return renderSvgToTexture(cardSvg(id, { theme, width: TEX_W }), key).then((texture) => {
    textureReferences.set(texture, (textureReferences.get(texture) ?? 0) + 1);
    return texture;
  });
}

export function releaseCardTexture(texture: THREE.Texture): void {
  const references = textureReferences.get(texture);
  if (references === undefined) return;    if (references > 1) {
      textureReferences.set(texture, references - 1);
      return;
    }
    textureReferences.delete(texture);
  textureCache.delete(texture);
  const key = textureKeys.get(texture);
  textureKeys.delete(texture);
  if (key) promiseCache.delete(key);
  texture.dispose();
}

export function cardBackTexture(): Promise<THREE.Texture> {
  return renderSvgToTexture(cardBackSvg({ width: TEX_W }), 'back');
}

export function disposeCardTextures(): void {
  generation++;
  promiseCache.clear();

  for (const tex of textureCache) {
    tex.dispose();
  }
  textureCache.clear();
  textureReferences.clear();
  textureKeys.clear();

  for (const url of activeBlobUrls) {
    URL.revokeObjectURL(url);
  }
  activeBlobUrls.clear();
}