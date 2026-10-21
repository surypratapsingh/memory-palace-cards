// Card billboard floating above loci.
// Renders card face (rank, suit, color) and optional 2-line caption.
// Handles billboard facing, bob animation, and texture/material disposal to prevent GPU leaks.
import * as THREE from 'three';
import type { CardId } from '../types.ts';
import { cardLabel, isRed } from '../deck.ts';

const cardPlaneGeom = new THREE.PlaneGeometry(0.85, 1.15);

interface ActiveCard {
  mesh: THREE.Mesh;
  texture: THREE.CanvasTexture;
  material: THREE.MeshBasicMaterial;
  baseY: number;
  locusIndex: number;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

function renderCardCanvas(card: CardId, caption?: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 460;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background rounded card
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(8, 8, 324, 444, 20);
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  const red = isRed(card);
  const colorStr = red ? '#dc2626' : '#1e293b';
  const label = cardLabel(card);

  // Top-left small label
  ctx.fillStyle = colorStr;
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, 24, 24);

  // Big center card label
  ctx.font = 'bold 76px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const centerY = caption ? 170 : 230;
  ctx.fillText(label, 170, centerY);

  // Optional caption below (max 2 lines)
  if (caption) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 275);
    ctx.lineTo(310, 275);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const lines = wrapText(ctx, caption, 280, 2);
    let startY = lines.length === 1 ? 330 : 305;
    for (const line of lines) {
      ctx.fillText(line, 170, startY);
      startY += 32;
    }
  }

  return canvas;
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
    // Remove existing card at this locus if present
    this.removeCard(index);
    if (!card) return;

    const clampedOpacity = Math.max(0, Math.min(1, opts?.opacity ?? 1));
    const canvas = renderCardCanvas(card, opts?.caption);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: clampedOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(cardPlaneGeom, material);
    const baseY = 2.35;
    mesh.position.set(pos[0], baseY, pos[1]);
    this.scene.add(mesh);

    this.cards.set(index, {
      mesh,
      texture,
      material,
      baseY,
      locusIndex: index,
    });
  }

  removeCard(index: number): void {
    const active = this.cards.get(index);
    if (!active) return;

    this.scene.remove(active.mesh);
    active.texture.dispose();
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
  }
}
