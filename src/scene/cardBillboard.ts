// Card billboards use the same authored SVG art as the DOM trainer.
import * as THREE from 'three';
import type { CardId } from '../types.ts';
import { cardTexture, disposeCardTextures, releaseCardTexture } from './cardTexture.ts';
import type { CardTheme } from '../ui/cardArt.ts';

const cardPlaneGeom = new THREE.PlaneGeometry(0.8, 0.65);
const billboardHeight = 1.9;

interface ActiveCard {
  mesh: THREE.Mesh;
  texture: THREE.Texture | null;
  material: THREE.MeshBasicMaterial;
  baseY: number;
  locusIndex: number;
  token: object;
}

export class CardBillboardManager {
  private cards = new Map<number, ActiveCard>();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  showCard(
    index: number,
    pos: [number, number],
    card: CardId | null,
    opts?: { caption?: string; opacity?: number },
  ): void {
    this.removeCard(index);
    if (!card) return;

    const clampedOpacity = Math.max(0, Math.min(1, opts?.opacity ?? 1));
    const theme: CardTheme = document.documentElement.classList.contains('color-safe') ? 'four-colour' : 'classic';
    const token = {};
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: clampedOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(cardPlaneGeom, material);
    mesh.position.set(pos[0], billboardHeight, pos[1]);
    mesh.visible = false;
    this.scene.add(mesh);
    const active: ActiveCard = { mesh, texture: null, material, baseY: billboardHeight, locusIndex: index, token };
    this.cards.set(index, active);

    void cardTexture(card, theme).then((texture) => {
      if (this.cards.get(index) !== active || active.token !== token) {
        releaseCardTexture(texture);
        return;
      }
      active.texture = texture;
      material.map = texture;
      material.needsUpdate = true;
      mesh.visible = true;
    }).catch(() => {
      if (this.cards.get(index) === active) this.removeCard(index);
    });
  }

  removeCard(index: number): void {
    const active = this.cards.get(index);
    if (!active) return;

    this.scene.remove(active.mesh);
    if (active.texture) releaseCardTexture(active.texture);
    active.material.dispose();
    this.cards.delete(index);
  }

  clearCards(): void {
    for (const [index] of this.cards) {
      this.removeCard(index);
    }
  }

  update(time: number, camera: THREE.Camera): void {
    for (const card of this.cards.values()) {
      // Gentle floating bob
      card.mesh.position.y = card.baseY + Math.sin(time * 2.5 + card.locusIndex) * 0.04;
      // Billboard faces camera
      card.mesh.quaternion.copy(camera.quaternion);
    }
  }

  dispose(): void {
    this.clearCards();
    cardPlaneGeom.dispose();
    disposeCardTextures();
  }
}
