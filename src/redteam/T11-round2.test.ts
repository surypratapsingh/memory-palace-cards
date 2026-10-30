import assert from 'node:assert/strict';
import test from 'node:test';
import { DECK } from '../deck.ts';
import { emptySave } from '../store.ts';
import type { CardId, DrillResult, PalaceView, SaveData } from '../types.ts';
import { mountOnboarding } from '../ui/onboarding.ts';

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
  setAttribute() {}
  getAttribute() { return null; }
  focus() {}
  appendChild(c: El) { c.parentElement = this; this.children.push(c); return c; }
  removeChild(c: El) { this.children.splice(this.children.indexOf(c), 1); c.parentElement = null; return c; }
  get firstChild() { return this.children[0] ?? null; }
  addEventListener(t: string, f: () => void) { this.on.set(t, (this.on.get(t) ?? new Set()).add(f)); }
  removeEventListener(t: string, f: () => void) { this.on.get(t)?.delete(f); }
  click() { for (const f of [...(this.on.get('click') ?? [])]) f(); }
  find(text: string): El | undefined {
    if (this.textContent === text) return this;
    for (const c of this.children) { const m = c.find(text); if (m) return m; }
    return undefined;
  }
  flatten(): El[] {
    return [this, ...this.children.flatMap((c) => c.flatten())];
  }
}

function harness(answerFor: (dealt: CardId[]) => CardId[]) {
  const keys = new Set<(e: KeyboardEvent) => void>();
  const g = globalThis as Record<string, unknown>;
  const saved = { document: g.document, window: g.window, localStorage: g.localStorage };
  const set = (k: string, v: unknown) => Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: v });
  set('document', { createElement: () => new El() });
  set('window', {
    addEventListener: (_: string, f: never) => keys.add(f),
    removeEventListener: (_: string, f: never) => keys.delete(f),
  });
  set('localStorage', { setItem() {}, getItem() { return null; } });
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
  const unmount = mountOnboarding(root as unknown as HTMLElement, view, emptySave(), (data, result) => done.push({ data, result }), () => skips++);
  const attempt = () => {
    press(' '); press(' '); press(' '); // Next, Next, Test Recall
    const dealt = [...shown];
    for (const c of answerFor(dealt)) { press(c[0]); press(c[1]); }
    return dealt;
  };
  const restore = () => { unmount(); for (const [k, v] of Object.entries(saved)) set(k, v); };
  return { root, press, attempt, done, keys, skips: () => skips, restore };
}

const wrong = (dealt: CardId[]) => DECK.filter((c) => !dealt.includes(c)).slice(0, 3);

test('redteam T11 round 2: an imperfect run can leave with Continue and saves the attempt exactly once', () => {
  const t = harness(wrong);
  try {
    t.press(' ');
    t.attempt();
    assert.ok(t.root.find('Almost there'));
    assert.ok(t.root.find('You remembered 0 of 3 in order. Try three new cards: see each image AT its object, big and strange.'));
    assert.equal(t.root.find('Memory champions'), undefined);
    t.root.find('Continue')!.click();
    assert.equal(t.done.length, 1);
    assert.equal(t.skips(), 0);
    assert.equal(t.done[0].data.drills.length, 1);
    assert.equal(t.done[0].result.daily, false);
    assert.equal(t.done[0].result.sequence.length, 3);
    assert.ok(Number.isFinite(t.done[0].result.memorizeMs) && t.done[0].result.memorizeMs >= 0);
  } finally { t.restore(); }
});

test('redteam T11 round 2: a retry saves each attempt once, with two distinct drills and one completion', () => {
  const t = harness(wrong);
  try {
    t.press(' ');
    t.attempt();
    assert.equal(t.done.length, 0, 'the result screen alone must not complete the flow');
    t.root.find('Try again')!.click();
    assert.equal(t.done.length, 0);
    t.attempt();
    assert.ok(t.root.find('Almost there'));
    assert.equal(t.done.length, 0);
    t.root.find('Continue')!.click();
    assert.equal(t.done.length, 1);
    assert.equal(t.skips(), 0);
    const savedDrills = t.done[0].data.drills;
    assert.equal(savedDrills.length, 2, 'each attempt is saved exactly once');
    assert.notEqual(savedDrills[0].seed, savedDrills[1].seed, 'retry deals a fresh sequence');
    assert.notEqual(savedDrills[0].at, savedDrills[1].at);
  } finally { t.restore(); }
});

test('redteam T11 round 2: a perfect run proves the method, keeps the exact copy, and offers one action', () => {
  const t = harness((dealt) => dealt);
  try {
    t.press(' ');
    const dealt = t.attempt();
    assert.ok(t.root.find('★ Proved!'));
    assert.ok(t.root.find('You remembered 3 of 3 in order. Memory champions use exactly this.'));
    assert.equal(t.root.find('Try again'), undefined);
    const buttons = t.root.flatten().filter((el) => el.type === 'button');
    assert.deepEqual(buttons.map((b) => b.textContent), ['Continue']);
    assert.equal(t.done.length, 0);
    t.press(' ');
    assert.equal(t.done.length, 1);
    assert.deepEqual(t.done[0].result.answers, dealt);
    assert.equal(t.done[0].data.drills.length, 1);
  } finally { t.restore(); }
});

test('redteam T11 round 2: a double Space on the perfect result completes exactly once', () => {
  const t = harness((dealt) => dealt);
  try {
    t.press(' ');
    t.attempt();
    t.press(' ');
    t.press(' ');
    assert.equal(t.done.length, 1, 'the result listener must be removed after completing');
    assert.equal(t.done[0].data.drills.length, 1, 'no second save');
    assert.equal(t.done[0].data.streak.count, 1, 'no double streak increment');
  } finally { t.restore(); }
});

test('redteam T11 round 2: a retry never stacks key listeners and Escape after the second save forwards that save', () => {
  const t = harness(wrong);
  try {
    t.press(' ');
    const first = t.attempt();
    assert.equal(t.keys.size, 1, 'one active phase listener on the result screen');
    t.root.find('Try again')!.click();
    assert.equal(t.keys.size, 1, 'retry replaces the listener instead of stacking another');
    const second = t.attempt();
    assert.notDeepEqual(second, first);
    assert.equal(t.keys.size, 1);
    t.press('Escape');
    assert.equal(t.done.length, 1);
    assert.equal(t.skips(), 0, 'a saved attempt is handed back, not skipped');
    assert.deepEqual(t.done[0].result.sequence, second);
    assert.equal(t.done[0].data.drills.length, 2);
    assert.equal(t.keys.size, 0, 'leaving removes the last listener');
  } finally { t.restore(); }
});
