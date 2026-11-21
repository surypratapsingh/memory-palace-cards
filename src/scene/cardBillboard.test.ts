import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { CardId } from '../types.ts';
import { CardBillboardManager } from './cardBillboard.ts';

const CARD: CardId = 'AS';

test('billboard opacity is clamped to 0..1 on the material', () => {
  const original = globalThis.document;
  globalThis.document = { documentElement: { classList: { contains: () => false } } } as unknown as Document;
  try {
    const cases: [number | undefined, number][] = [[undefined, 1], [0.4, 0.4], [2, 1], [-0.5, 0]];
    for (const [input, expected] of cases) {
      const scene = new THREE.Scene();
      const manager = new CardBillboardManager(scene);
      manager.showCard(0, [0, 0], CARD, input === undefined ? {} : { opacity: input });
      const mesh = scene.children[0] as THREE.Mesh;
      assert.equal((mesh.material as THREE.MeshBasicMaterial).opacity, expected, `opacity ${input}`);
      manager.clearCards();
    }
  } finally {
    globalThis.document = original;
  }
});
