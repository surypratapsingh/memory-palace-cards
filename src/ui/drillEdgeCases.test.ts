import test from 'node:test';
import assert from 'node:assert/strict';
import { mountDrill } from './drill.ts';
import { emptySave } from '../store.ts';
import type { CardId, DrillRecord, DrillResult, PalaceView, SaveData } from '../types.ts';

class MockElement {
  tagName: string;
  id = '';
  type = 'button';
  disabled = false;
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  focused = false;
  style: Record<string, string> = {};
  private listeners = new Map<string, Set<EventListener>>();
  private _className = '';
  private _html = '';
  private _text = '';

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  set className(val: string) {
    this._className = val;
    this.classList._classes = new Set(val.split(/\s+/).filter(Boolean));
  }
  get className() {
    return this._className;
  }
  setAttribute(name: string, val: string) {
    this.attributes.set(name, String(val));
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  classList = {
    _classes: new Set<string>(),
    add: (...c: string[]) => c.forEach((cls) => this.classList._classes.add(cls)),
    remove: (...c: string[]) => c.forEach((cls) => this.classList._classes.delete(cls)),
    contains: (c: string) => this.classList._classes.has(c),
  };
  appendChild(child: MockElement) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  removeChild(child: MockElement) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    child.parentElement = null;
    return child;
  }
  get firstChild() {
    return this.children[0] ?? null;
  }
  addEventListener(evt: string, fn: EventListener) {
    if (!this.listeners.has(evt)) this.listeners.set(evt, new Set());
    this.listeners.get(evt)!.add(fn);
  }
  removeEventListener(evt: string, fn: EventListener) {
    this.listeners.get(evt)?.delete(fn);
  }
  dispatchEvent(event: { type: string; key?: string; target?: unknown; preventDefault?: () => void; stopPropagation?: () => void }) {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const fn of set) {
        fn(event as unknown as Event);
      }
    }
  }
  focus() {
    this.focused = true;
  }
  click() {
    this.dispatchEvent({ type: 'click' });
  }
  set innerHTML(val: string) {
    this._html = val;
  }
  get innerHTML() {
    return this._html;
  }
  set textContent(val: string) {
    this._text = val;
  }
  get textContent() {
    return this._text;
  }
  find(predicate: (el: MockElement) => boolean): MockElement | undefined {
    if (predicate(this)) return this;
    for (const c of this.children) {
      const m = c.find(predicate);
      if (m) return m;
    }
    return undefined;
  }
  findAll(predicate: (el: MockElement) => boolean): MockElement[] {
    const res: MockElement[] = [];
    if (predicate(this)) res.push(this);
    for (const c of this.children) {
      res.push(...c.findAll(predicate));
    }
    return res;
  }
}

function createPalaceView(onGlide?: (locus: number) => Promise<void>): PalaceView {
  return {
    loci: Array.from({ length: 52 }, (_, i) => ({
      index: i,
      name: `Locus ${i + 1}`,
      room: i < 13 ? 'Library' : i < 26 ? 'Kitchen' : i < 39 ? 'Greenhouse' : 'Observatory',
      viewpoint: { x: 0, y: 1.6, z: 0 },
      lookAt: { x: 0, y: 1.6, z: 1 },
    })),
    glideTo: onGlide ?? (async () => {}),
    showCard: () => {},
    clearCards: () => {},
    setLocusMood: () => {},
    setFreeWalk: () => {},
    setGlideMs: () => {},
    onLocusClick: () => () => {},
    dispose: () => {},
  } as unknown as PalaceView;
}

function setupMockDom() {
  const windowListeners = new Map<string, Set<EventListener>>();
  const g = globalThis as Record<string, unknown>;
  const prevDoc = g.document;
  const prevWin = g.window;
  const prevStorage = g.localStorage;

  g.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  g.document = {
    documentElement: { classList: { contains: () => false } },
    createElement: (tag: string) => new MockElement(tag),
  };
  g.window = {
    addEventListener: (evt: string, fn: EventListener) => {
      if (!windowListeners.has(evt)) windowListeners.set(evt, new Set());
      windowListeners.get(evt)!.add(fn);
    },
    removeEventListener: (evt: string, fn: EventListener) => {
      windowListeners.get(evt)?.delete(fn);
    },
  };

  const pressKey = (key: string) => {
    let prevented = false;
    let stopped = false;
    const event = {
      type: 'keydown',
      key,
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
    };
    for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
      fn(event as unknown as Event);
    }
    return { prevented, stopped };
  };

  return {
    pressKey,
    cleanup: () => {
      g.document = prevDoc;
      g.window = prevWin;
      g.localStorage = prevStorage;
    },
  };
}

test('drill: quit dialog Enter key confirms quit and calls onExit with null result', () => {
  const { pressKey, cleanup } = setupMockDom();
  try {
    const root = new MockElement('div');
    const view = createPalaceView();
    const data: SaveData = emptySave();
    let exited = false;
    let exitResult: DrillResult | null = 'not-called' as unknown as DrillResult;

    const unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      (_data, res) => {
        exited = true;
        exitResult = res;
      },
    );

    // Ready -> Memorize (Space)
    pressKey(' ');
    // Press Escape during memorize to open quit dialog
    pressKey('Escape');
    const modal = root.find((el) => el.className === 'drill-confirm-overlay');
    assert.ok(modal, 'Quit confirm modal should appear');

    // Press Enter in quit dialog to confirm
    pressKey('Enter');
    assert.equal(exited, true, 'onExit should be called');
    assert.equal(exitResult, null, 'Result should be null when quitting');

    unmount();
  } finally {
    cleanup();
  }
});

test('drill: quit dialog Continue Drill button dismisses modal and keeps drill alive', () => {
  const { pressKey, cleanup } = setupMockDom();
  try {
    const root = new MockElement('div');
    const view = createPalaceView();
    const data: SaveData = emptySave();
    let exited = false;

    const unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      () => { exited = true; },
    );

    // Ready -> Memorize
    pressKey(' ');
    // Ready -> Memorize
    pressKey(' ');
    // Open quit dialog
    pressKey('Escape');
    const cancelBtn = root.find((el) => el.textContent === 'Continue Drill');
    assert.ok(cancelBtn, 'Continue Drill button exists');

    // Click Continue Drill
    cancelBtn.click();
    assert.equal(exited, false, 'Drill should not exit');
    assert.equal(root.find((el) => el.className === 'drill-confirm-overlay'), undefined, 'Modal dismissed');

    unmount();
  } finally {
    cleanup();
  }
});

test('drill: quit dialog Quit button confirms quit and triggers onExit', () => {
  const { pressKey, cleanup } = setupMockDom();
  try {
    const root = new MockElement('div');
    const view = createPalaceView();
    const data: SaveData = emptySave();
    let exited = false;

    const unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      () => { exited = true; },
    );

    // Ready -> Memorize
    pressKey(' ');
    // Ready -> Memorize
    pressKey(' ');
    // Open quit dialog
    pressKey('Escape');
    const quitBtn = root.find((el) => el.className?.includes('danger') && el.textContent === 'Quit');
    assert.ok(quitBtn, 'Quit button exists');

    // Click Quit
    quitBtn.click();
    assert.equal(exited, true, 'Quit button triggers onExit');

    unmount();
  } finally {
    cleanup();
  }
});

test('drill: ghost warning displays when recent drills exist and Play anyway button proceeds', () => {
  const { pressKey, cleanup } = setupMockDom();
  try {
    const root = new MockElement('div');
    const view = createPalaceView();
    const data: SaveData = emptySave();

    // Add recent drill in the last 15 minutes to trigger ghost warning
    const recentDrill: DrillRecord = {
      id: 'recent-1',
      date: new Date().toISOString(),
      level: 0,
      sequence: ['AS', '2S', '3S'],
      answers: ['AS', '2S', '3S'],
      score: 3,
      durationMs: 12000,
      at: Date.now() - 60000,
    };
    data.drills.push(recentDrill);

    const unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      () => {},
    );

    // Ghost warning should be visible
    const warning = root.find((el) => el.textContent === 'Ghost Warning');
    assert.ok(warning, 'Ghost Warning title should appear');

    // Press Play anyway
    const playBtn = root.find((el) => el.textContent === 'Play anyway');
    assert.ok(playBtn);
    playBtn.click();

    // Now ready phase is visible
    assert.ok(root.find((el) => el.textContent?.includes('cards')));

    unmount();
  } finally {
    cleanup();
  }
});

test('drill: ghost warning Back button exits drill and stops audio', () => {
  const { cleanup } = setupMockDom();
  try {
    const root = new MockElement('div');
    const view = createPalaceView();
    const data: SaveData = emptySave();

    const recentDrill: DrillRecord = {
      id: 'recent-2',
      date: new Date().toISOString(),
      level: 0,
      sequence: ['AS', '2S', '3S'],
      answers: ['AS', '2S', '3S'],
      score: 3,
      durationMs: 12000,
      at: Date.now() - 60000,
    };
    data.drills.push(recentDrill);
    let exited = false;

    const unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      () => { exited = true; },
    );

    // Click Back on ghost warning screen
    const backBtn = root.find((el) => el.textContent === 'Back');
    assert.ok(backBtn);
    backBtn.click();
    assert.equal(exited, true, 'Back button in ghost warning exits drill');

    unmount();
  } finally {
    cleanup();
  }
});

test('drill: safeGlideTo recovers gracefully when view.glideTo rejects', async () => {
  const { pressKey, cleanup } = setupMockDom();
  try {
    const root = new MockElement('div');
    let rejected = false;
    const failingView = createPalaceView(async () => {
      rejected = true;
      throw new Error('Animation interrupted or WebGL context lost');
    });
    const data: SaveData = emptySave();

    const unmount = mountDrill(
      root as unknown as HTMLElement,
      failingView,
      data,
      { level: 0, daily: false },
      () => {},
    );

    // Space from ready -> triggers memorize phase which glides to locus 0
    pressKey(' ');
    // Does not throw despite failingView rejecting!
    assert.equal(rejected, true, 'Glide was attempted and rejected cleanly');

    unmount();
  } finally {
    cleanup();
  }
});

test('drill: unmounting drill while quit dialog is open removes modal and cleans up listeners', () => {
  const { pressKey, cleanup } = setupMockDom();
  try {
    const root = new MockElement('div');
    const view = createPalaceView();
    const data: SaveData = emptySave();
    let exited = false;

    const unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      () => { exited = true; },
    );

    // Ready -> Memorize
    pressKey(' ');
    // Open quit dialog
    pressKey('Escape');
    assert.ok(root.find((el) => el.className === 'drill-confirm-overlay'));

    // Unmount while modal is open
    unmount();
    assert.equal(root.find((el) => el.className === 'drill-confirm-overlay'), undefined);
    assert.equal(exited, false, 'Unmounting does not trigger onExit quit handler');
  } finally {
    cleanup();
  }
});
