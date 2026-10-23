import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { emptySave } from '../store.ts';
import { next, type Screen } from '../router.ts';
import { mountShadowWalk } from '../ui/shadowWalk.ts';
import type { PalaceView } from '../types.ts';

const screens: readonly Screen[] = ['home', 'train', 'drill', 'settings', 'shadowWalk'];

test('redteam T8b: Shadow Walk is reachable only from Home and drill results', () => {
  const expected: Record<Screen, Screen> = {
    home: 'shadowWalk', train: 'train', drill: 'shadowWalk', settings: 'settings', shadowWalk: 'shadowWalk',
  };
  for (const screen of screens) {
    assert.equal(next(screen, 'shadowWalk'), expected[screen], `${screen} + shadowWalk`);
  }
  assert.equal(next('drill', 'result'), 'home');
});

test('redteam T8b: exiting Shadow Walk returns home and Back transitions remain scoped', () => {
  assert.equal(next('shadowWalk', 'back'), 'home');
  assert.equal(next('drill', 'back'), 'drill');
  assert.equal(next('home', 'back'), 'home');
  assert.equal(next('train', 'back'), 'home');
  assert.equal(next('settings', 'back'), 'home');
});

test('redteam T8b: unknown and prototype-shaped events preserve every screen', () => {
  const events = ['', 'unknown', '__proto__', 'constructor', 'toString', 'shadowWalk\u0000', 'BACK'];
  for (const screen of screens) for (const event of events) assert.equal(next(screen, event), screen);
});

test('redteam T8b: invalid screens and malformed event values are harmless', () => {
  for (const screen of ['', 'unknown', '__proto__', 'constructor', 'toString']) {
    for (const event of ['shadowWalk', 'back', 'result', 'drill']) assert.equal(next(screen as Screen, event), screen);
  }
  for (const screen of screens) {
    for (const event of [null, undefined, {}, Symbol('shadowWalk')]) {
      assert.doesNotThrow(() => assert.equal(next(screen, event as unknown as string), screen));
    }
  }
});

test('redteam T8b: Shadow Walk cleanup cancels reveal and makes any retained callback inert', () => {
  class FakeElement {
    className = '';
    textContent = '';
    style: Record<string, string> = {};
    children: FakeElement[] = [];
    type = '';
    appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
    addEventListener(): void {}
    removeEventListener(): void {}
  }

  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldSetTimeout = globalThis.setTimeout;
  const oldClearTimeout = globalThis.clearTimeout;
  const callbacks: ((index: number) => void)[] = [];
  const addedKeys: EventListenerOrEventListenerObject[] = [];
  const removedKeys: EventListenerOrEventListenerObject[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  const clearedTimers: number[] = [];
  const calls: string[] = [];

  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => new FakeElement() } });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener(_type: string, listener: EventListenerOrEventListenerObject): void { addedKeys.push(listener); },
      removeEventListener(_type: string, listener: EventListenerOrEventListenerObject): void { removedKeys.push(listener); },
    },
  });
  globalThis.setTimeout = ((handler: TimerHandler) => {
    const id = nextTimer++;
    timers.set(id, handler as () => void);
    return id;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: number | NodeJS.Timeout) => {
    clearedTimers.push(Number(id));
    timers.delete(Number(id));
  }) as typeof clearTimeout;

  try {
    const view = {
      loci: [{ index: 0, name: 'Velvet Armchair', room: 'Library' }],
      setFreeWalk(on: boolean): void { calls.push(`walk:${on}`); },
      clearCards(): void { calls.push('clear'); },
      showCard(_index: number, card: string | null): void { calls.push(`card:${card ?? 'hidden'}`); },
      onLocusClick(callback: (index: number) => void): void { callbacks.push(callback); },
    } as unknown as PalaceView;
    const root = new FakeElement();
    const data = emptySave();
    data.drills.push({ at: new Date().toISOString(), seed: 'red-team', daily: false,
      sequence: ['AS'], answers: ['AS'], memorizeMs: 1, recallMs: 1 });
    const cleanup = mountShadowWalk(root as unknown as HTMLElement, view, data, () => {});
    const retainedHandler = callbacks[0];

    assert.deepEqual(calls.slice(0, 2), ['walk:true', 'clear']);
    retainedHandler(0);
    assert.match(root.children[0].children[1].children[0].textContent, /What stood here\?/);
    retainedHandler(0);
    assert.equal(calls.at(-1), 'card:AS');
    assert.equal(timers.size, 1);

    cleanup();
    const callsAfterCleanup = calls.length;
    retainedHandler(0);
    assert.equal(calls.length, callsAfterCleanup, 'late locus events must be inert after unmount');
    assert.equal(calls.at(-2), 'walk:false');
    assert.equal(calls.at(-1), 'clear');
    assert.equal(clearedTimers.length, 1);
    assert.equal(timers.size, 0);
    assert.equal(removedKeys.length, 1);
    assert.equal(removedKeys[0], addedKeys[0]);
  } finally {
    globalThis.setTimeout = oldSetTimeout;
    globalThis.clearTimeout = oldClearTimeout;
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

// Lead: the contract now returns an unsubscribe function (answer to BLOCKED T8b), so this test checks it exists.
test('redteam T8b: PalaceView.onLocusClick returns an unsubscribe function', async () => {
  const contract = await readFile(new URL('../types.ts', import.meta.url), 'utf8');
  const implementation = await readFile(new URL('../scene/palaceView.ts', import.meta.url), 'utf8');
  assert.match(contract, /onLocusClick\(cb: \(index: number\) => void\): \(\) => void/);
  assert.match(implementation, /onLocusClick\(cb[\s\S]*?clickCallbacks\.push\(cb\);\s*return \(\) =>[\s\S]*?clickCallbacks\.splice/);
});
