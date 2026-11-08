import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { emptySave } from '../store.ts';
import type { PalaceView } from '../types.ts';
import { LOCI } from '../data/palace.ts';
import { mountDrill } from './drill.ts';
import { mountOnboarding } from './onboarding.ts';
import { mountTrainer } from './trainer.ts';
import { mountShadowWalk } from './shadowWalk.ts';
import { play, ambience, stopAll } from '../sound.ts';

class FakeAudioNode {
  connect(t: unknown) { return t; }
  disconnect() {}
}

class FakeParam {
  value = 0;
  initial = 0;
  setValueAtTime(v: number) {
    this.value = v;
    this.initial = v;
    return this;
  }
  linearRampToValueAtTime(v: number) { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}

class FakeGain extends FakeAudioNode {
  gain = new FakeParam();
}

class FakeFilter extends FakeAudioNode {
  type = 'lowpass';
  frequency = new FakeParam();
  Q = new FakeParam();
}

class FakeSource extends FakeAudioNode {
  onended: (() => void) | null = null;
  buffer: unknown = null;
  durationSec = 0;
  start() {}
  stop() { if (this.onended) this.onended(); }
}

class FakeOsc extends FakeSource {
  type: OscillatorType = 'sine';
  frequency = new FakeParam();
  detune = new FakeParam();
}

class FakeAudioBuffer {
  duration = 0;
  constructor(length: number, sampleRate: number) {
    this.duration = length / sampleRate;
  }
  getChannelData() { return new Float32Array(100); }
}

class FakeAudioContext {
  static constructions = 0;
  static closeCalls = 0;
  static filters: FakeFilter[] = [];
  static oscillators: FakeOsc[] = [];
  static bufferSources: FakeSource[] = [];

  static reset() {
    FakeAudioContext.constructions = 0;
    FakeAudioContext.closeCalls = 0;
    FakeAudioContext.filters = [];
    FakeAudioContext.oscillators = [];
    FakeAudioContext.bufferSources = [];
  }

  currentTime = 0;
  sampleRate = 44100;
  state: AudioContextState = 'running';
  destination = new FakeAudioNode();

  constructor() {
    FakeAudioContext.constructions++;
  }

  createGain() { return new FakeGain(); }
  createBiquadFilter() {
    const f = new FakeFilter();
    FakeAudioContext.filters.push(f);
    return f;
  }
  createOscillator() {
    const osc = new FakeOsc();
    FakeAudioContext.oscillators.push(osc);
    return osc;
  }
  createBufferSource() {
    const src = new FakeSource();
    FakeAudioContext.bufferSources.push(src);
    return src;
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    return new FakeAudioBuffer(length, sampleRate);
  }
  async resume() { this.state = 'running'; }
  async close() {
    FakeAudioContext.closeCalls++;
    this.state = 'closed';
  }
}

// Minimal mock DOM for testing UI controllers in Node
class MockElement {
  className = '';
  textContent = '';
  type = '';
  disabled = false;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  classList = {
    classes: new Set<string>(),
    add(...names: string[]) { for (const n of names) this.classes.add(n); },
    remove(...names: string[]) { for (const n of names) this.classes.delete(n); },
    contains(name: string) { return this.classes.has(name); },
    toggle(name: string, force?: boolean) {
      if (force === true) { this.classes.add(name); return true; }
      if (force === false) { this.classes.delete(name); return false; }
      if (this.classes.has(name)) { this.classes.delete(name); return false; }
      this.classes.add(name);
      return true;
    },
  };
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  private listeners = new Map<string, Set<EventListener>>();

  appendChild<T extends MockElement>(child: T): T {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild<T extends MockElement>(child: T): T {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  replaceChildren(...newChildren: MockElement[]) {
    this.children = [];
    for (const c of newChildren) this.appendChild(c);
  }

  get firstChild(): MockElement | null {
    return this.children[0] ?? null;
  }

  append(...items: (MockElement | string)[]) {
    for (const item of items) {
      if (typeof item === 'string') {
        const textNode = new MockElement();
        textNode.textContent = item;
        this.appendChild(textNode);
      } else {
        this.appendChild(item);
      }
    }
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  setAttribute(_k: string, _v: string) {}
  getAttribute(_k: string) { return null; }

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

  querySelector<T extends MockElement>(_sel: string): T | null {
    return null;
  }
}

class FakeHTMLElement extends MockElement {}
class FakeHTMLInputElement extends MockElement {
  value = '';
}
class FakeHTMLTextAreaElement extends MockElement {
  value = '';
}

function setupMockDom() {
  const windowListeners = new Map<string, Set<EventListener>>();
  const docListeners = new Map<string, Set<EventListener>>();

  const mockWindow = {
    addEventListener: (type: string, fn: EventListener) => {
      let set = windowListeners.get(type);
      if (!set) {
        set = new Set();
        windowListeners.set(type, set);
      }
      set.add(fn);
    },
    removeEventListener: (type: string, fn: EventListener) => {
      windowListeners.get(type)?.delete(fn);
    },
  };

  const mockDoc = {
    createElement: (_tag: string) => {
      if (_tag === 'input') return new FakeHTMLInputElement();
      if (_tag === 'textarea') return new FakeHTMLTextAreaElement();
      return new MockElement();
    },
    addEventListener: (type: string, fn: EventListener) => {
      let set = docListeners.get(type);
      if (!set) {
        set = new Set();
        docListeners.set(type, set);
      }
      set.add(fn);
    },
    removeEventListener: (type: string, fn: EventListener) => {
      docListeners.get(type)?.delete(fn);
    },
  };

  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, String(v)),
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
  };

  const originalWindow = (globalThis as any).window;
  const originalDoc = (globalThis as any).document;
  const originalAudio = (globalThis as any).AudioContext;
  const originalStorage = (globalThis as any).localStorage;
  const origHTMLElement = (globalThis as any).HTMLElement;
  const origHTMLInputElement = (globalThis as any).HTMLInputElement;
  const origHTMLTextAreaElement = (globalThis as any).HTMLTextAreaElement;

  (globalThis as any).window = mockWindow;
  (globalThis as any).document = mockDoc;
  (globalThis as any).AudioContext = FakeAudioContext;
  (globalThis as any).localStorage = mockStorage;
  (globalThis as any).HTMLElement = FakeHTMLElement;
  (globalThis as any).HTMLInputElement = FakeHTMLInputElement;
  (globalThis as any).HTMLTextAreaElement = FakeHTMLTextAreaElement;

  const pressKey = (key: string) => {
    const event = {
      key,
      preventDefault: () => {},
      stopPropagation: () => {},
      target: new MockElement(),
    } as unknown as KeyboardEvent;
    for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
      fn(event);
    }
    for (const fn of [...(docListeners.get('keydown') ?? [])]) {
      fn(event);
    }
  };

  const teardown = () => {
    stopAll();
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDoc;
    (globalThis as any).AudioContext = originalAudio;
    (globalThis as any).localStorage = originalStorage;
    (globalThis as any).HTMLElement = origHTMLElement;
    (globalThis as any).HTMLInputElement = origHTMLInputElement;
    (globalThis as any).HTMLTextAreaElement = origHTMLTextAreaElement;
  };

  return { pressKey, teardown };
}

function makeMockPalaceView(onLocusCallbackRef?: { cb?: (i: number) => void }): PalaceView {
  return {
    loci: LOCI.map((l) => ({ index: l.index, name: l.name, room: l.room })),
    glideTo: async () => {},
    showCard: () => {},
    clearCards: () => {},
    setLocusMood: () => {},
    setFreeWalk: () => {},
    setGlideMs: () => {},
    onLocusClick: (cb: (i: number) => void) => {
      if (onLocusCallbackRef) onLocusCallbackRef.cb = cb;
      return () => {};
    },
    dispose: () => {},
  } as unknown as PalaceView;
}

beforeEach(() => {
  FakeAudioContext.reset();
  stopAll();
});

afterEach(() => {
  stopAll();
});

test('1. AudioContext is NEVER constructed when sound setting is false', () => {
  const { teardown } = setupMockDom();
  try {
    play('flip', false);
    play('whoosh', false);
    play('correct', false);
    play('wrong', false);
    ambience('Library', false);
    ambience('Kitchen', false);
    ambience(null, false);
    stopAll();

    assert.equal(FakeAudioContext.constructions, 0, 'No AudioContext should be constructed with on=false');
  } finally {
    teardown();
  }
});

test('2. UI drill with sound = false generates 0 AudioContext constructions across phases', () => {
  const { pressKey, teardown } = setupMockDom();
  try {
    const data = emptySave();
    data.settings.sound = false;

    const root = new MockElement();
    const view = makeMockPalaceView();

    let exitCalled = false;
    const unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      () => { exitCalled = true; },
    );

    // Enter memorize (Space)
    pressKey(' ');
    // Advance cards (Space)
    pressKey(' ');
    pressKey(' ');
    // Done memorizing (Enter)
    pressKey('Enter');
    // Recall picker inputs (A, S)
    pressKey('A');
    pressKey('S');
    // Exit
    pressKey('Escape');
    unmount();

    assert.equal(FakeAudioContext.constructions, 0, 'Drill with sound: false must construct 0 AudioContexts');
  } finally {
    teardown();
  }
});

test('3. UI onboarding with sound = false generates 0 AudioContext constructions across steps', () => {
  const { pressKey, teardown } = setupMockDom();
  try {
    const data = emptySave();
    data.settings.sound = false;

    const root = new MockElement();
    const view = makeMockPalaceView();

    let completed = false;
    const unmount = mountOnboarding(
      root as unknown as HTMLElement,
      view,
      data,
      () => { completed = true; },
      () => {},
    );

    // Step 1 -> Step 2
    pressKey(' ');
    // 3 cards memorize
    pressKey(' ');
    pressKey(' ');
    pressKey(' ');
    // Step 3 recall: 3 cards
    for (let i = 0; i < 3; i++) {
      pressKey('A');
      pressKey('S');
    }
    // Result
    pressKey(' ');
    unmount();

    assert.equal(FakeAudioContext.constructions, 0, 'Onboarding with sound: false must construct 0 AudioContexts');
  } finally {
    teardown();
  }
});

test('4. UI trainer with sound = false generates 0 AudioContext constructions', () => {
  const { pressKey, teardown } = setupMockDom();
  try {
    const data = emptySave();
    data.settings.sound = false;
    data.srs.AS = {
      due: '2020-01-01T00:00:00Z',
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 1,
      lapses: 0,
      state: 2,
      last_review: '2020-01-01T00:00:00Z',
    };

    const root = new MockElement();
    let exited = false;
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => { exited = true; });

    // In recall: press Space to reveal
    pressKey(' ');
    // Rate 3 (Good)
    pressKey('3');
    // Exit (Escape)
    pressKey('Escape');
    unmount();

    assert.equal(FakeAudioContext.constructions, 0, 'Trainer with sound: false must construct 0 AudioContexts');
  } finally {
    teardown();
  }
});

test('5. UI shadowWalk with sound = false generates 0 AudioContext constructions', () => {
  const { pressKey, teardown } = setupMockDom();
  try {
    const data = emptySave();
    data.settings.sound = false;

    const locusClickRef: { cb?: (i: number) => void } = {};
    const view = makeMockPalaceView(locusClickRef);
    const root = new MockElement();

    const unmount = mountShadowWalk(root as unknown as HTMLElement, view, data, () => {});

    // Click multiple loci
    locusClickRef.cb?.(0);
    locusClickRef.cb?.(15);
    pressKey('Escape');
    unmount();

    assert.equal(FakeAudioContext.constructions, 0, 'Shadow walk with sound: false must construct 0 AudioContexts');
  } finally {
    teardown();
  }
});

test('6. Drill memorize plays whoosh when crossing door boundary (locus 12 -> 13) but not within room', () => {
  const { pressKey, teardown } = setupMockDom();
  let unmount: (() => void) | null = null;
  try {
    const data = emptySave();
    data.settings.sound = true;

    const root = new MockElement();
    const view = makeMockPalaceView();

    // Start Level 4 (20 cards: spans Library 0..12 and Kitchen 13..19)
    unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 4, daily: false },
      () => {},
    );

    // Ready -> Start memorize (Locus 0 in Library)
    pressKey(' ');

    // Flip filter has Q=1.4; whoosh filter has Q=2.2
    const hasFlip = () => FakeAudioContext.filters.some((f) => Math.abs(f.Q.initial - 1.4) < 0.01);
    const hasWhoosh = () => FakeAudioContext.filters.some((f) => Math.abs(f.Q.initial - 2.2) < 0.01);

    assert.ok(hasFlip(), 'Locus 0 must play flip');
    assert.ok(!hasWhoosh(), 'No whoosh on first card');

    // Advance within Library (step 1 to 12)
    for (let i = 1; i <= 12; i++) {
      pressKey('ArrowRight');
    }
    assert.ok(!hasWhoosh(), 'No whoosh within same room (Library loci 0..12)');

    // Advance from locus 12 (Library) to locus 13 (Kitchen) -> crosses door!
    pressKey('ArrowRight');
    assert.ok(hasWhoosh(), 'Must play whoosh when crossing door from Library to Kitchen');
  } finally {
    unmount?.();
    teardown();
  }
});

test('7. Drill recall never leaks answers during picking, and results play correct/wrong cue', () => {
  const { pressKey, teardown } = setupMockDom();
  let unmount: (() => void) | null = null;
  try {
    const data = emptySave();
    data.settings.sound = true;

    const root = new MockElement();
    const view = makeMockPalaceView();

    // Level 0: 3 cards
    unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      () => {},
    );

    // Start memorize
    pressKey(' ');
    // Card 1 -> 2 -> 3 -> Done
    pressKey(' ');
    pressKey(' ');
    pressKey('Enter'); // Done memorizing, enters Recall

    // Clear oscillators generated during memorize/ambience
    FakeAudioContext.oscillators = [];

    // Correct cue uses 523.25 Hz sine, wrong cue uses 311.13 Hz triangle
    const isCueOsc = (osc: FakeOsc) =>
      Math.abs(osc.frequency.initial - 523.25) < 1 || Math.abs(osc.frequency.initial - 311.13) < 1;

    // In Recall: enter answers
    pressKey('A');
    pressKey('S');
    // Must NOT play correct or wrong while picking
    assert.equal(FakeAudioContext.oscillators.filter(isCueOsc).length, 0, 'No answer leak during recall picking');

    pressKey('2');
    pressKey('H');
    assert.equal(FakeAudioContext.oscillators.filter(isCueOsc).length, 0, 'No answer leak during recall picking');

    // Final card finishes recall and reveals Results screen
    pressKey('3');
    pressKey('D');

    // On results reveal, exactly one result cue (correct or wrong) must be played (which creates 2 tone oscillators)
    const resultOscs = FakeAudioContext.oscillators.filter(isCueOsc);
    assert.ok(resultOscs.length >= 1, 'Result cue must be played on results screen reveal');
  } finally {
    unmount?.();
    teardown();
  }
});

test('8. stopAll is called on drill exit', () => {
  const { pressKey, teardown } = setupMockDom();
  try {
    const data = emptySave();
    data.settings.sound = true;
    const view = makeMockPalaceView();

    const root = new MockElement();
    const unmount = mountDrill(root as unknown as HTMLElement, view, data, { level: 0, daily: false }, () => {});
    ambience('Library', true); // start audio
    const closeCountBefore = FakeAudioContext.closeCalls;
    pressKey('Escape'); // Exit from ready
    assert.ok(FakeAudioContext.closeCalls >= closeCountBefore + 1, 'Drill exit must call stopAll()');
    unmount();
  } finally {
    teardown();
  }
});

test('9. stopAll is called on shadowWalk exit', () => {
  const { pressKey, teardown } = setupMockDom();
  try {
    const data = emptySave();
    data.settings.sound = true;
    const view = makeMockPalaceView();

    const root = new MockElement();
    const unmount = mountShadowWalk(root as unknown as HTMLElement, view, data, () => {});
    ambience('Library', true); // start audio
    const closeCountBefore = FakeAudioContext.closeCalls;
    pressKey('Escape');
    assert.ok(FakeAudioContext.closeCalls >= closeCountBefore + 1, 'Shadow walk exit must call stopAll()');
    unmount();
  } finally {
    teardown();
  }
});

test('10. stopAll is called on trainer exit', () => {
  const { pressKey, teardown } = setupMockDom();
  try {
    const data = emptySave();
    data.settings.sound = true;

    const root = new MockElement();
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => {});
    play('flip', true); // start audio
    const closeCountBefore = FakeAudioContext.closeCalls;
    pressKey('Escape');
    assert.ok(FakeAudioContext.closeCalls >= closeCountBefore + 1, 'Trainer exit must call stopAll()');
    unmount();
  } finally {
    teardown();
  }
});

test('11. stopAll is called on onboarding leave', () => {
  const { pressKey, teardown } = setupMockDom();
  try {
    const data = emptySave();
    data.settings.sound = true;
    const view = makeMockPalaceView();

    const root = new MockElement();
    const unmount = mountOnboarding(root as unknown as HTMLElement, view, data, () => {}, () => {});
    ambience('Library', true); // start audio
    const closeCountBefore = FakeAudioContext.closeCalls;
    pressKey('Escape');
    assert.ok(FakeAudioContext.closeCalls >= closeCountBefore + 1, 'Onboarding exit must call stopAll()');
    unmount();
  } finally {
    teardown();
  }
});
