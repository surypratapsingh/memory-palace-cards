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
    home: 'shadowWalk',
    train: 'train',
    drill: 'shadowWalk',
    settings: 'settings',
    shadowWalk: 'shadowWalk',
  };
  for (const screen of screens) {
    assert.equal(next(screen, 'shadowWalk'), expected[screen], `${screen} + shadowWalk`);
  }
  assert.equal(next('drill', 'result'), 'home');
});

test('redteam T8b: exiting Shadow Walk returns home; unrelated Back transitions stay local', () => {
  assert.equal(next('shadowWalk', 'back'), 'home');
  assert.equal(next('drill', 'back'), 'drill');
  assert.equal(next('home', 'back'), 'home');
  assert.equal(next('train', 'back'), 'home');
  assert.equal(next('settings', 'back'), 'home');
});

test('redteam T8b: unknown and prototype-shaped events preserve every screen', () => {
  const events = ['', 'unknown', '__proto__', 'constructor', 'toString', 'shadowWalk\u0000', 'BACK'];
  for (const screen of screens) {
    for (const event of events) assert.equal(next(screen, event), screen, `${screen} + ${event}`);
  }
});

test('redteam T8b: invalid screen strings cannot enter Shadow Walk or another route', () => {
  for (const screen of ['', 'unknown', '__proto__', 'constructor', 'toString']) {
    for (const event of ['shadowWalk', 'back', 'result', 'drill']) {
      assert.equal(next(screen as Screen, event), screen, `${screen} + ${event}`);
    }
  }
});

test('redteam T8b: malformed runtime event values do not throw or change screens', () => {
  for (const screen of screens) {
    for (const event of [null, undefined, {}, Symbol('shadowWalk')]) {
      assert.doesNotThrow(() => {
        assert.equal(next(screen, event as unknown as string), screen);
      });
    }
  }
});

test('redteam T8b: shadow walk cleanup removes its timer, keyboard listener, cards and walk mode', () => {
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

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => new FakeElement() },
  });
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

    assert.equal(callbacks.length, 1, 'mount adds one locus-click callback');
    assert.deepEqual(calls.slice(0, 2), ['walk:true', 'clear']);
    callbacks[0](0);
    const promptPanel = root.children[0].children[1];
    assert.match(promptPanel.children[0].textContent, /What stood here\?/);
    callbacks[0](0);
    assert.equal(calls.at(-1), 'card:AS', 'a valid drill card is revealed');
    assert.equal(timers.size, 1, 'reveals schedule auto-hide');

    cleanup();
    assert.equal(calls.at(-2), 'walk:false', 'cleanup exits free-walk mode');
    assert.equal(calls.at(-1), 'clear', 'cleanup hides all cards');
    assert.equal(clearedTimers.length, 1, 'cleanup cancels the reveal timer');
    assert.equal(timers.size, 0, 'no reveal timer remains');
    assert.equal(removedKeys.length, 1);
    assert.equal(removedKeys[0], addedKeys[0], 'cleanup removes the exact keydown listener it installed');
  } finally {
    globalThis.setTimeout = oldSetTimeout;
    globalThis.clearTimeout = oldClearTimeout;
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('redteam T8b finding: PalaceView retains Shadow Walk click callbacks after unmount', async () => {
  const source = await readFile(new URL('../scene/palaceView.ts', import.meta.url), 'utf8');
  assert.match(source, /onLocusClick\(cb: \(index: number\) => void\): void \{\s*clickCallbacks\.push\(cb\);/);
  assert.doesNotMatch(source, /clickCallbacks\.splice|clickCallbacks\.delete|clickCallbacks\.length\s*=/,
    'the existing PalaceView API has no way to remove registered locus-click callbacks');
});
