import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { palaceMap } from '../ui/palaceMap.ts';

// Minimal element stub: enough for palaceMap to build and attach handlers in Node.
class Stub {
  nodeName: string;
  attrs = new Map<string, string>();
  style: Record<string, string> = {};
  children: Stub[] = [];
  textContent = '';
  listeners = new Map<string, Set<unknown>>();
  constructor(tag: string) { this.nodeName = tag; }
  setAttribute(k: string, v: string) { this.attrs.set(k, String(v)); }
  getAttribute(k: string) { return this.attrs.get(k) ?? null; }
  removeAttribute(k: string) { this.attrs.delete(k); }
  appendChild<T extends Stub>(c: T): T { this.children.push(c); return c; }
  removeChild<T extends Stub>(c: T): T { this.children = this.children.filter((x) => x !== c); return c; }
  addEventListener(t: string, f: unknown) { if (!this.listeners.has(t)) this.listeners.set(t, new Set()); this.listeners.get(t)!.add(f); }
  removeEventListener(t: string, f: unknown) { this.listeners.get(t)?.delete(f); }
  get classList() { return { add() {}, remove() {}, toggle() {}, contains: () => false }; }
  get firstChild() { return this.children[0] ?? null; }
  remove() {}
  focus() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
  replaceChildren(..._n: Stub[]) { this.children = []; }
  get isConnected() { return false; }
  get ownerDocument() { return null; }
  get namespaceURI() { return 'http://www.w3.org/2000/svg'; }
}

let origDocument: unknown;
beforeEach(() => {
  origDocument = (globalThis as any).document;
  (globalThis as any).document = {
    createElementNS: (_ns: string, tag: string) => new Stub(tag),
    createElement: (tag: string) => new Stub(tag),
    createTextNode: (t: string) => { const s = new Stub('#text'); s.textContent = t; return s; },
  };
});
afterEach(() => { (globalThis as any).document = origDocument; });

test('T18 1: heat keys outside 52 loci and NaN or huge values do not throw', () => {
  const map = palaceMap({});
  assert.doesNotThrow(() => map.update({
    heat: new Map<number, number>([[-1, 0.5], [52, 0.5], [999, Number.NaN], [3, 1e9], [4, -5]]),
  }));
});

test('T18 2: invalid highlight indices (negative, past the end, fractional) do not throw', () => {
  const map = palaceMap({});
  assert.doesNotThrow(() => map.update({ highlight: [-1, 52, 1.5, Number.NaN] }));
});

test('T18 3: destroy twice is safe and later update is ignored', () => {
  const map = palaceMap({ onPick: () => {} });
  map.destroy();
  assert.doesNotThrow(() => {
    map.destroy();
    map.update({ heat: new Map([[0, 1]]) });
  });
});

test('T18 4: two maps are independent (separate SVG roots and listeners)', () => {
  const a = palaceMap({ onPick: () => {} });
  const b = palaceMap({});
  assert.notEqual(a.element, b.element);
  a.destroy();
  assert.equal(b.element.getAttribute('aria-label'), 'Palace floor map');
});

test('T18 5: numbers:false and an empty options object build without throwing', () => {
  assert.doesNotThrow(() => palaceMap({ numbers: false }));
  assert.doesNotThrow(() => palaceMap());
});

test('T18 6: element is an SVG root with a viewBox', () => {
  const map = palaceMap({});
  assert.equal(map.element.getAttribute('viewBox') !== null, true);
});
