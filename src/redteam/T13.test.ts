import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DECK, SUITS, RANKS } from '../deck.ts';
import { cardName, cardSvg } from '../ui/cardArt.ts';
import { cardFace } from '../ui/cardFace.ts';
import { createCardPicker } from '../ui/cardPicker.ts';
import { CardBillboardManager } from '../scene/cardBillboard.ts';
import { EYE_HEIGHT, LOCI, viewpoint } from '../data/palace.ts';
import type { CardId } from '../types.ts';

function createMockElement(tag: string): any {
  const listeners = new Map<string, Function>();
  const classes = new Set<string>();
  const attributes: Record<string, string> = {};
  const dataset: Record<string, string> = {};
  const children: any[] = [];
  return {
    tagName: tag.toUpperCase(),
    className: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
    dataset,
    attributes,
    children,
    parentElement: null,
    disabled: false,
    type: 'button',
    setAttribute(name: string, val: string) { attributes[name] = val; },
    getAttribute(name: string) { return attributes[name] ?? null; },
    addEventListener(evt: string, handler: Function) { listeners.set(evt, handler); },
    removeEventListener(evt: string) { listeners.delete(evt); },
    appendChild(child: any) {
      children.push(child);
      child.parentElement = this;
      return child;
    },
    removeChild(child: any) {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      child.parentElement = null;
      return child;
    },
    set innerHTML(val: string) { this._html = val; },
    get innerHTML() { return this._html ?? ''; },
    set textContent(val: string) { this._text = val; },
    get textContent() { return this._text ?? ''; },
  };
}

function setupGlobalDOM(colorSafe: boolean) {
  const rootClasses = new Set<string>(colorSafe ? ['color-safe'] : []);
  globalThis.document = {
    documentElement: {
      classList: {
        contains: (c: string) => rootClasses.has(c),
        add: (c: string) => rootClasses.add(c),
        remove: (c: string) => rootClasses.delete(c),
      },
    },
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: () => {} }),
        };
      }
      return createMockElement(tag);
    },
  } as unknown as Document;

  globalThis.Image = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_val: string) {
      setTimeout(() => this.onload?.(), 5);
    }
  } as unknown as typeof Image;
}

test('redteam: cardFace generates accessible img element with exact cardName aria-label for all 52 cards', () => {
  setupGlobalDOM(false);
  for (const card of DECK) {
    const el = cardFace(card);
    assert.equal(el.getAttribute('role'), 'img');
    assert.equal(el.getAttribute('aria-label'), cardName(card));
    const isRedCard = card.endsWith('H') || card.endsWith('D');
    assert.equal(el.className, isRedCard ? 'card-face red' : 'card-face');
    assert.ok(el.innerHTML.startsWith('<svg'));
    assert.ok(el.innerHTML.includes(card[0] === 'T' ? '10' : card[0]));
  }
});

test('redteam: cardFace dynamically respects colour-safe mode and applies four-colour SVG palettes', () => {
  setupGlobalDOM(true);
  for (const card of DECK) {
    const el = cardFace(card);
    const html = el.innerHTML;
    if (card.endsWith('D')) {
      assert.ok(html.includes('#1d4ed8'), `Diamond ${card} must use four-colour blue #1d4ed8`);
    } else if (card.endsWith('C')) {
      assert.ok(html.includes('#15803d'), `Club ${card} must use four-colour green #15803d`);
    } else if (card.endsWith('H')) {
      assert.ok(html.includes('#c81e1e'), `Heart ${card} must use four-colour red #c81e1e`);
    } else if (card.endsWith('S')) {
      assert.ok(html.includes('#111827'), `Spade ${card} must use four-colour dark #111827`);
    }
  }
});

test('redteam: createCardPicker maintains data-* attributes, aria-labels, and disabled state for all 52 cards', () => {
  setupGlobalDOM(false);
  const used = new Set<CardId>(['AS', '7H', 'KD']);
  const picked: CardId[] = [];
  const picker = createCardPicker({
    usedCards: used,
    onPick: (card) => picked.push(card),
  });

  assert.equal(picker.element.children.length, 4, 'Picker should have 4 suit rows');
  let totalButtons = 0;
  for (const row of picker.element.children) {
    assert.equal(row.children.length, 13, 'Each suit row must contain 13 rank buttons');
    for (const btn of row.children) {
      totalButtons++;
      const id = btn.dataset.card as CardId;
      assert.ok(DECK.includes(id), `Button card id ${id} must be in DECK`);
      assert.ok(RANKS.includes(btn.dataset.rank));
      assert.ok(SUITS.includes(btn.dataset.suit));
      assert.ok(btn.getAttribute('aria-label') !== null);
      assert.ok(btn.innerHTML.includes('picker-mini-card'));
      if (used.has(id)) {
        assert.equal(btn.disabled, true, `Used card ${id} must be disabled`);
        assert.ok(btn.classList.contains('used'));
      } else {
        assert.equal(btn.disabled, false, `Unused card ${id} must not be disabled`);
      }
    }
  }
  assert.equal(totalButtons, 52, 'Picker must contain all 52 buttons');
  picker.destroy();
});

test('redteam: createCardPicker pendingRank highlights all matching rank cards and clean destroy unmounts', () => {
  setupGlobalDOM(false);
  const parent = createMockElement('div');
  const picker = createCardPicker({
    usedCards: new Set<CardId>(['AH']),
    pendingRank: 'A',
    onPick: () => {},
  });
  parent.appendChild(picker.element);
  assert.equal(picker.element.parentElement, parent);

  let highlightedCount = 0;
  for (const row of picker.element.children) {
    for (const btn of row.children) {
      if (btn.classList.contains('pending-highlight')) {
        highlightedCount++;
        assert.equal(btn.dataset.rank, 'A');
        assert.notEqual(btn.dataset.card, 'AH', 'Used AH must not receive pending-highlight');
      }
    }
  }
  assert.equal(highlightedCount, 3, 'Pending rank A must highlight 3 unused Aces');

  picker.update({ usedCards: new Set<CardId>(), pendingRank: null });
  for (const row of picker.element.children) {
    for (const btn of row.children) {
      assert.equal(btn.classList.contains('pending-highlight'), false);
    }
  }

  picker.destroy();
  assert.equal(picker.element.parentElement, null, 'destroy() must unmount container from parent element');
});

test('redteam: CardBillboardManager race condition: clearCards before texture resolves leaves zero meshes in scene', async () => {
  setupGlobalDOM(false);
  const scene = new THREE.Scene();
  const mgr = new CardBillboardManager(scene);

  mgr.showCard(0, [0, 0], 'AS');
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0]!.visible, false, 'Mesh must stay hidden until texture resolves');

  mgr.clearCards();
  assert.equal(scene.children.length, 0, 'clearCards must immediately remove mesh from scene');

  // Wait for mock Image onload and texture promise to resolve
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(scene.children.length, 0, 'Late promise resolution must not inject mesh into scene');

  mgr.dispose();
});

test('redteam: CardBillboardManager replacement race: replacing locus card before texture resolves shows latest card', async () => {
  setupGlobalDOM(false);
  const scene = new THREE.Scene();
  const mgr = new CardBillboardManager(scene);

  mgr.showCard(0, [1, 2], 'AS');
  const mesh1 = scene.children[0];
  assert.equal(scene.children.length, 1);

  // Immediately replace with KD before AS resolves
  mgr.showCard(0, [1, 2], 'KD');
  assert.equal(scene.children.length, 1);
  const mesh2 = scene.children[0];
  assert.notEqual(mesh1, mesh2, 'Replaced card must allocate a fresh mesh');

  await new Promise((r) => setTimeout(r, 20));
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0]!.visible, true, 'Active mesh must become visible after resolution');

  mgr.dispose();
});

test('redteam: ultra-wide 21:9 placement keeps all 52 loci billboards and object tops inside frustum with >5% margin', () => {
  const CARD_WIDTH = 0.8;
  const CARD_HEIGHT = 0.65;
  const CARD_Y = 1.9;
  const CAMERA_FOV = 65;
  const CAMERA_NEAR = 0.1;
  const GUIDED_PITCH = Math.atan2(1.3 - EYE_HEIGHT, 1.8);
  const OBJECT_TOPS: Readonly<Record<string, number>> = {
    armchair: 1.15, bookshelf: 2, globe: 1.51, fireplace: 1.31, clock: 2.1,
    desk: 0.8, stove: 0.94, refrigerator: 2, cabinet: 1.5, table: 0.79,
    sink: 1.275, cauldron: 1.26, plant: 1.55, fountain: 1.325, bench: 1.05,
    planter: 0.85, pedestal: 1.625, telescope: 1.768, armillary: 1.34,
    orrery: 1.275, astrolabe: 1.408, globe_celestial: 1.51,
  };

  const aspect = 21 / 9;
  const MARGIN_NDC = 0.1; // 5% margin corresponds to 0.1 in [-1, 1] NDC space

  for (let index = 0; index < LOCI.length; index++) {
    const locus = LOCI[index]!;
    const [x, z] = viewpoint(index);
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, 1000);
    camera.rotation.order = 'YXZ';
    camera.position.set(x, EYE_HEIGHT, z);
    camera.rotation.set(GUIDED_PITCH, Math.atan2(locus.face[0], locus.face[1]), 0);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    const center = new THREE.Vector3(locus.pos[0], CARD_Y, locus.pos[1]);
    for (const cx of [-CARD_WIDTH / 2, CARD_WIDTH / 2]) {
      for (const cy of [-CARD_HEIGHT / 2, CARD_HEIGHT / 2]) {
        const corner = new THREE.Vector3(cx, cy, 0).applyQuaternion(camera.quaternion).add(center);
        const projected = corner.clone().project(camera);
        assert.ok(Math.abs(projected.x) <= 1 - MARGIN_NDC, `${locus.name} billboard x=${projected.x} exceeds margin`);
        assert.ok(Math.abs(projected.y) <= 1 - MARGIN_NDC, `${locus.name} billboard y=${projected.y} exceeds margin`);
      }
    }

    const top = OBJECT_TOPS[locus.kind];
    assert.ok(top !== undefined, `Missing top height for ${locus.kind}`);
    const topProj = new THREE.Vector3(locus.pos[0], top, locus.pos[1]).project(camera);
    assert.ok(Math.abs(topProj.x) <= 1 - MARGIN_NDC, `${locus.name} top x=${topProj.x} exceeds margin`);
    assert.ok(Math.abs(topProj.y) <= 1 - MARGIN_NDC, `${locus.name} top y=${topProj.y} exceeds margin`);
  }
});
