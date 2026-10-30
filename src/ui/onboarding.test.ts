import assert from 'node:assert/strict';
import test from 'node:test';
import { DECK } from '../deck.ts';
import { emptySave } from '../store.ts';
import type { CardId, DrillResult, PalaceView, SaveData } from '../types.ts';
import { mountOnboarding } from './onboarding.ts';

// Minimal DOM: enough for the onboarding screens and the card picker.
class El {
  className = '';
  textContent = '';
  type = '';
  disabled = false;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  classList = { add() {}, remove() {} };
  children: El[] = [];
  parentElement: El | null = null;
  private on = new Map<string, Set<() => void>>();
  appendChild(c: El) { c.parentElement = this; this.children.push(c); return c; }
  removeChild(c: El) { this.children.splice(this.children.indexOf(c), 1); c.parentElement = null; return c; }
  get firstChild() { return this.children[0] ?? null; }
  addEventListener(t: string, f: () => void) { this.on.set(t, (this.on.get(t) ?? new Set()).add(f)); }
  removeEventListener(t: string, f: () => void) { this.on.get(t)?.delete(f); }
  click() { for (const f of [...(this.on.get('click') ?? [])]) f(); }
  find(text: string): El | undefined {
    if (this.textContent === text) return this;
    for (const c of this.children) { const m = c.find(text); if (m) return m; }
  }
}

function run(answersFor: (dealt: CardId[]) => CardId[]) {
  const keys = new Set<(e: KeyboardEvent) => void>();
  const g = globalThis as Record<string, unknown>;
  const old = { document: g.document, window: g.window, localStorage: g.localStorage };
  const set = (k: string, v: unknown) => Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: v });
  set('document', { createElement: () => new El() });
  set('window', { addEventListener: (_: string, f: never) => keys.add(f), removeEventListener: (_: string, f: never) => keys.delete(f) });
  set('localStorage', { setItem() {} });
  const press = (key: string) => { for (const f of [...keys]) f({ key, preventDefault() {} } as KeyboardEvent); };

  const shown: CardId[] = [];
  const view = {
    loci: [0, 1, 2].map((index) => ({ index, name: `L${index}`, room: 'Library' })),
    glideTo: async () => {},
    showCard: (i: number, c: CardId) => { shown[i] = c; },
    clearCards() {}, setLocusMood() {}, setFreeWalk() {}, setGlideMs() {},
    onLocusClick: () => () => {},
    dispose() {},
  } as unknown as PalaceView;

  const root = new El();
  const done: { data: SaveData; result: DrillResult }[] = [];
  let skips = 0;
  const cleanup = mountOnboarding(root as unknown as HTMLElement, view, emptySave(), (data, result) => done.push({ data, result }), () => skips++);
  const attempt = () => {
    press(' '); press(' '); press(' '); // Next, Next, Test Recall
    const dealt = [...shown];
    for (const c of answersFor(dealt)) { press(c[0]); press(c[1]); }
    return dealt;
  };
  const restore = () => { cleanup(); for (const [k, v] of Object.entries(old)) set(k, v); };
  return { root, press, attempt, done, skips: () => skips, restore };
}

const wrong = (dealt: CardId[]) => DECK.filter((c) => !dealt.includes(c)).slice(0, 3);

test('onboarding: a perfect first run proves the method with one Continue action', () => {
  const t = run((dealt) => dealt);
  try {
    t.press(' '); // welcome
    t.attempt();
    assert.ok(t.root.find('★ Proved!'));
    assert.equal(t.root.find('Try again'), undefined);
    t.press(' ');
    assert.equal(t.done.length, 1);
    assert.equal(t.done[0].data.drills.length, 1);
  } finally { t.restore(); }
});

test('onboarding: a wrong run does not claim proof and offers a fresh try that saves both attempts', () => {
  let tries = 0;
  const t = run((dealt) => (tries++ === 0 ? wrong(dealt) : dealt));
  try {
    t.press(' ');
    const first = t.attempt();
    assert.equal(t.root.find('★ Proved!'), undefined);
    assert.ok(t.root.find('You remembered 0 of 3 in order. Try three new cards: see each image AT its object, big and strange.'));
    t.root.find('Try again')!.click();
    assert.equal(t.done.length, 0, 'retry stays in onboarding');
    const second = t.attempt();
    assert.notDeepEqual(second, first, 'retry deals new cards');
    assert.ok(t.root.find('★ Proved!'));
    t.press('Enter');
    assert.equal(t.done.length, 1);
    assert.equal(t.done[0].data.drills.length, 2);
  } finally { t.restore(); }
});

test('onboarding: Escape after a saved attempt hands the save back instead of skipping', () => {
  const t = run(wrong);
  try {
    t.press(' ');
    t.attempt();
    t.press(' '); // Try again
    t.press('Escape'); // leave during memorize
    assert.equal(t.skips(), 0);
    assert.equal(t.done.length, 1);
    assert.equal(t.done[0].data.drills.length, 1);
  } finally { t.restore(); }
});
