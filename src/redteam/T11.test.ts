import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { emptySave } from '../store.ts';
import { initialScreen, isFresh, next, type Screen } from '../router.ts';
import { mountOnboarding } from '../ui/onboarding.ts';
import type { PalaceView } from '../types.ts';

class FakeElement {
  className = '';
  textContent = '';
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  type = '';
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  private handlers = new Map<string, Set<() => void>>();

  appendChild(child: FakeElement): FakeElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: FakeElement): FakeElement {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentElement = null;
    return child;
  }

  get firstChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | (() => void)): void {
    const callback = typeof listener === 'function' ? listener : () => listener.handleEvent(new Event(type));
    const entries = this.handlers.get(type) ?? new Set<() => void>();
    entries.add(callback);
    this.handlers.set(type, entries);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | (() => void)): void {
    const callback = typeof listener === 'function' ? listener : () => listener.handleEvent(new Event(type));
    this.handlers.get(type)?.delete(callback);
  }

  click(): void {
    for (const listener of [...(this.handlers.get('click') ?? [])]) listener();
  }

  findButton(label: string): FakeElement | undefined {
    if (this.type === 'button' && this.textContent === label) return this;
    for (const child of this.children) {
      const match = child.findButton(label);
      if (match) return match;
    }
    return undefined;
  }
}

function browserHarness() {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  const windowHandlers = new Map<string, Set<(event: KeyboardEvent) => void>>();
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => new FakeElement() },
  });
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: { now: () => 1_000 },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener(type: string, listener: (event: KeyboardEvent) => void): void {
        const listeners = windowHandlers.get(type) ?? new Set<(event: KeyboardEvent) => void>();
        listeners.add(listener);
        windowHandlers.set(type, listeners);
      },
      removeEventListener(type: string, listener: (event: KeyboardEvent) => void): void {
        windowHandlers.get(type)?.delete(listener);
      },
    },
  });
  const fireKey = (key: string) => {
    const event = { key, preventDefault() {} } as KeyboardEvent;
    for (const listener of [...(windowHandlers.get('keydown') ?? [])]) listener(event);
  };
  const restore = () => {
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (oldPerformance) Object.defineProperty(globalThis, 'performance', oldPerformance);
    else Reflect.deleteProperty(globalThis, 'performance');
  };
  return { fireKey, restore, windowHandlers };
}

function stubView(): PalaceView {
  return {
    loci: [{ index: 0, name: 'Velvet Armchair', room: 'Library' }],
    glideTo: async () => {},
    showCard() {},
    clearCards() {},
    setLocusMood() {},
    setFreeWalk() {},
    setGlideMs() {},
    onLocusClick: () => () => {},
    dispose() {},
  };
}

test('redteam T11: truly fresh profiles boot onboarding; a drill or any SRS entry sends the player home', () => {
  assert.equal(isFresh(emptySave()), true);
  assert.equal(initialScreen(emptySave()), 'onboarding');
  assert.equal(initialScreen({ drills: [{ at: 'bad-but-present' }] as any, srs: {} }), 'home');
  assert.equal(initialScreen({ drills: [], srs: { AS: {} as any } }), 'home');
});

test('redteam T11: imported progress never triggers onboarding, even if only drills exist', () => {
  const imported = { ...emptySave(), drills: [{ sequence: ['AS'] }] };
  assert.equal(isFresh(imported), false);
  assert.equal(initialScreen(imported), 'home');
});

test('redteam T11: unrelated imported fields do not redefine the specified fresh-save predicate', () => {
  const save = { ...emptySave(), images: { AS: 'custom image' }, locusStats: { 2: { tries: 4, misses: 1 } } };
  assert.equal(isFresh(save), true, 'freshness is defined by no drills and no SRS entries');
});

test('redteam T11: skip exits onboarding only and cannot route another screen into onboarding', () => {
  const screens: readonly Screen[] = ['home', 'train', 'drill', 'settings', 'shadowWalk', 'onboarding'];
  for (const screen of screens) {
    assert.equal(next(screen, 'skip'), screen === 'onboarding' ? 'home' : screen, `${screen} + skip`);
  }
});

test('redteam T11: clicking the welcome skip link exits without completing the drill or retaining key handlers', () => {
  const browser = browserHarness();
  let cleanup = () => {};
  let skips = 0;
  let completions = 0;
  try {
    const root = new FakeElement();
    cleanup = mountOnboarding(root as unknown as HTMLElement, stubView(), emptySave(), () => completions++, () => {
      skips++;
      cleanup();
    });
    const skip = root.findButton('I know the method');
    assert.ok(skip);
    skip.click();
    assert.equal(skips, 1);
    assert.equal(completions, 0);
    assert.equal(browser.windowHandlers.get('keydown')?.size ?? 0, 0);
  } finally {
    cleanup();
    browser.restore();
  }
});

test('redteam T11: Escape on welcome and during memorization exits cleanly without recording a result', () => {
  for (const escapeDuringMemorize of [false, true]) {
    const browser = browserHarness();
    let cleanup = () => {};
    let skips = 0;
    let completions = 0;
    try {
      const root = new FakeElement();
      cleanup = mountOnboarding(root as unknown as HTMLElement, stubView(), emptySave(), () => completions++, () => {
        skips++;
        cleanup();
      });
      if (escapeDuringMemorize) {
        const start = root.findButton('Watch three cards');
        assert.ok(start);
        start.click();
        assert.ok(root.findButton('Next [Space] →'), 'memorization phase mounts');
      }
      browser.fireKey('Escape');
      assert.equal(skips, 1);
      assert.equal(completions, 0);
      assert.equal(browser.windowHandlers.get('keydown')?.size ?? 0, 0);
      assert.equal(root.children.length, 0, 'unmount removes onboarding DOM');
    } finally {
      cleanup();
      browser.restore();
    }
  }
});

test('redteam T11: onboarding UI uses textContent, saves at most once in the result phase, and exposes one result action', async () => {
  const source = await readFile(new URL('../ui/onboarding.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.equal((source.match(/\bsave\(currentData\)/g) ?? []).length, 1);
  assert.match(source, /continueBtn\.textContent = 'Continue'/);
  assert.match(source, /You remembered \$\{correct\} of \$\{total\} in order/);
});
