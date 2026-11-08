import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOCI, ROOMS } from '../data/palace.ts';
import { palaceMap, type PalaceMapOptions } from './palaceMap.ts';

// Minimal mock SVG DOM implementation for Node.js
class MockSVGElement {
  nodeName: string;
  attributes = new Map<string, string>();
  style: Record<string, string> = {};
  children: MockSVGElement[] = [];
  parentElement: MockSVGElement | null = null;
  textContent = '';
  focused = false;
  listeners = new Map<string, Set<EventListener>>();

  constructor(nodeName: string) {
    this.nodeName = nodeName;
  }

  setAttribute(k: string, v: string) {
    this.attributes.set(k, String(v));
  }

  getAttribute(k: string): string | null {
    return this.attributes.get(k) ?? null;
  }

  removeAttribute(k: string) {
    this.attributes.delete(k);
  }

  appendChild<T extends MockSVGElement>(c: T): T {
    c.parentElement = this;
    this.children.push(c);
    return c;
  }

  removeChild<T extends MockSVGElement>(c: T): T {
    const idx = this.children.indexOf(c);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      c.parentElement = null;
    }
    return c;
  }

  addEventListener(type: string, listener: EventListener) {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: { type: string }): boolean {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const fn of [...set]) fn(event as Event);
    }
    return true;
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  focus() {
    this.focused = true;
  }

  querySelectorAll(sel: string): MockSVGElement[] {
    const matches: MockSVGElement[] = [];
    const walk = (el: MockSVGElement) => {
      const cls = el.getAttribute('class') ?? '';
      if (sel.startsWith('.') && cls.split(/\s+/).includes(sel.slice(1))) {
        matches.push(el);
      } else if (sel.startsWith('circle') && el.nodeName === 'circle') {
        matches.push(el);
      }
      for (const c of el.children) walk(c);
    };
    walk(this);
    return matches;
  }
}

let origDocument: unknown;

beforeEach(() => {
  origDocument = (globalThis as any).document;
  (globalThis as any).document = {
    createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
  };
});

afterEach(() => {
  (globalThis as any).document = origDocument;
});

test('1. Source code never uses innerHTML', () => {
  const code = readFileSync(resolve(import.meta.dirname, 'palaceMap.ts'), 'utf8');
  assert.equal(/innerHTML/.test(code), false, 'palaceMap.ts must not contain innerHTML');
});

test('2. 52 dots in route order, each located inside its room rectangle', () => {
  const map = palaceMap();
  const locusNodes = (map.element as unknown as MockSVGElement).querySelectorAll('.map-locus');
  assert.equal(locusNodes.length, 52, 'Must have exactly 52 locus nodes');

  for (let i = 0; i < 52; i++) {
    const node = locusNodes[i];
    assert.equal(node.getAttribute('data-index'), String(i), `Locus node ${i} must have data-index=${i}`);

    const locus = LOCI[i];
    const room = ROOMS.find((r) => r.name === locus.room);
    assert.ok(room, `Locus ${i} must belong to a defined room`);

    const dot = node.children.find((c) => c.nodeName === 'circle' && (c.getAttribute('class') ?? '').includes('map-dot'));
    assert.ok(dot, `Locus ${i} must have a dot element`);

    const cx = Number(dot.getAttribute('cx'));
    const cy = Number(dot.getAttribute('cy'));
    assert.equal(cx, locus.pos[0]);
    assert.equal(cy, locus.pos[1]);

    // Check inside room rectangle
    assert.ok(
      cx >= room.rect.x0 && cx <= room.rect.x1,
      `Locus ${i} x (${cx}) must be inside room ${room.name} [${room.rect.x0}, ${room.rect.x1}]`,
    );
    assert.ok(
      cy >= room.rect.z0 && cy <= room.rect.z1,
      `Locus ${i} z (${cy}) must be inside room ${room.name} [${room.rect.z0}, ${room.rect.z1}]`,
    );
  }
});

test('3. update() modifies heat, numbers, and highlights without rebuilding the SVG', () => {
  const map = palaceMap({ numbers: true });
  const root = map.element as unknown as MockSVGElement;
  const initialChildCount = root.children.length;

  // Initial heat neutral
  const locus0 = root.querySelectorAll('.map-locus')[0];
  assert.equal(locus0.getAttribute('data-heat'), 'neutral');

  // Update with heat, highlight, and hidden numbers
  const heatMap = new Map<number, number>([
    [0, 0.05], // cool
    [1, 0.25], // warm
    [2, 0.65], // hot
    [99, 0.9], // ignored
    [-1, 0.5], // ignored
  ]);

  map.update({
    heat: heatMap,
    highlight: [0, 5],
    numbers: false,
  });

  // SVG identity preserved, no elements rebuilt
  assert.equal(root.children.length, initialChildCount);

  const loci = root.querySelectorAll('.map-locus');
  assert.equal(loci[0].getAttribute('data-heat'), 'cool');
  assert.equal(loci[1].getAttribute('data-heat'), 'warm');
  assert.equal(loci[2].getAttribute('data-heat'), 'hot');
  assert.equal(loci[3].getAttribute('data-heat'), 'neutral');

  // Highlight check
  const ring0 = loci[0].children.find((c) => (c.getAttribute('class') ?? '').includes('map-highlight-ring'))!;
  assert.equal(ring0.style.display, '');

  const ring1 = loci[1].children.find((c) => (c.getAttribute('class') ?? '').includes('map-highlight-ring'))!;
  assert.equal(ring1.style.display, 'none');

  // Numbers hidden
  const num0 = loci[0].children.find((c) => (c.getAttribute('class') ?? '').includes('map-locus-num'))!;
  assert.equal(num0.style.display, 'none');
});

test('4. onPick attaches accessible roles and keyboard handlers; destroy() leaves 0 listeners', () => {
  let picked: number | null = null;
  const map = palaceMap({
    onPick: (idx) => {
      picked = idx;
    },
  });

  const root = map.element as unknown as MockSVGElement;
  const loci = root.querySelectorAll('.map-locus');

  // Check button role and aria-label
  assert.equal(loci[0].getAttribute('role'), 'button');
  assert.equal(loci[0].getAttribute('tabindex'), '0');
  assert.equal(
    loci[0].getAttribute('aria-label'),
    `Stop 1: ${LOCI[0].name}, ${LOCI[0].room}`,
  );

  // Click picks
  loci[0].click();
  assert.equal(picked, 0);

  // Keyboard Enter picks
  picked = null;
  loci[5].dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault() {} } as unknown as Event);
  assert.equal(picked, 5);

  // Keyboard Space picks
  picked = null;
  loci[10].dispatchEvent({ type: 'keydown', key: ' ', preventDefault() {} } as unknown as Event);
  assert.equal(picked, 10);

  // Arrow navigation moves focus
  loci[0].dispatchEvent({ type: 'keydown', key: 'ArrowRight', preventDefault() {} } as unknown as Event);
  assert.equal(loci[1].focused, true);

  loci[0].dispatchEvent({ type: 'keydown', key: 'ArrowLeft', preventDefault() {} } as unknown as Event);
  assert.equal(loci[51].focused, true);

  // Verify total active listeners
  let totalListeners = 0;
  for (const l of loci) {
    for (const set of l.listeners.values()) {
      totalListeners += set.size;
    }
  }
  assert.ok(totalListeners > 0, 'Expected active event listeners on loci before destroy');

  // Destroy removes all listeners
  map.destroy();

  let listenersAfter = 0;
  for (const l of loci) {
    for (const set of l.listeners.values()) {
      listenersAfter += set.size;
    }
  }
  assert.equal(listenersAfter, 0, 'destroy() must leave zero attached event listeners');

  // Calling update() or destroy() again after destruction is safe and does not throw
  assert.doesNotThrow(() => {
    map.update({ highlight: [1] });
    map.destroy();
  });
});

test('5. Heat values outside 0..1 or NaN clamp properly or show neutral', () => {
  const map = palaceMap({
    heat: new Map<number, number>([
      [0, -5],       // clamped to 0 -> cool
      [1, 10],       // clamped to 1 -> hot
      [2, NaN],      // neutral
      [3, Infinity], // neutral
    ]),
  });

  const root = map.element as unknown as MockSVGElement;
  const loci = root.querySelectorAll('.map-locus');

  assert.equal(loci[0].getAttribute('data-heat'), 'cool');
  assert.equal(loci[1].getAttribute('data-heat'), 'hot');
  assert.equal(loci[2].getAttribute('data-heat'), 'neutral');
  assert.equal(loci[3].getAttribute('data-heat'), 'neutral');
});
