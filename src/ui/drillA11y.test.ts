import test from 'node:test';
import assert from 'node:assert/strict';
import { mountDrill } from './drill.ts';
import { emptySave } from '../store.ts';
import type { CardId, DrillResult, PalaceView, SaveData } from '../types.ts';

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

function createPalaceView(): PalaceView {
  return {
    loci: Array.from({ length: 52 }, (_, i) => ({
      index: i,
      name: `Locus ${i + 1}`,
      room: i < 13 ? 'Library' : i < 26 ? 'Kitchen' : i < 39 ? 'Greenhouse' : 'Observatory',
      viewpoint: { x: 0, y: 1.6, z: 0 },
      lookAt: { x: 0, y: 1.6, z: 1 },
    })),
    glideTo: async () => {},
    showCard: () => {},
    clearCards: () => {},
    setLocusMood: () => {},
    setFreeWalk: () => {},
    setGlideMs: () => {},
    onLocusClick: () => () => {},
    dispose: () => {},
  } as unknown as PalaceView;
}

test('drill: quit confirmation modal has role="dialog", aria-modal="true", and aria-labelledby', () => {
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

    // In ready screen, press Space to start memorizing
    for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
      fn({
        type: 'keydown',
        key: ' ',
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as Event);
    }

    // In memorize screen, press Escape to trigger quit modal
    for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
      fn({
        type: 'keydown',
        key: 'Escape',
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as Event);
    }

    const modal = root.find((el) => el.classList.contains('drill-confirm-overlay'));
    assert.ok(modal, 'Modal overlay should be displayed');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(modal.getAttribute('aria-labelledby'), 'quit-dialog-title');

    const title = root.find((el) => el.id === 'quit-dialog-title');
    assert.ok(title, 'Title element matching aria-labelledby should exist');
    assert.equal(title.textContent, 'Quit Drill?');

    const buttons = modal.findAll((el) => el.tagName === 'BUTTON');
    const cancelBtn = buttons.find((b) => b.textContent === 'Continue Drill');
    const quitBtn = buttons.find((b) => b.textContent === 'Quit');
    assert.ok(cancelBtn, 'Continue Drill button should exist');
    assert.ok(quitBtn, 'Quit button should exist');
    assert.equal(cancelBtn.getAttribute('aria-keyshortcuts'), 'Escape');
    assert.equal(quitBtn.getAttribute('aria-keyshortcuts'), 'Enter');

    // Press Escape to cancel modal
    for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
      fn({
        type: 'keydown',
        key: 'Escape',
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as Event);
    }

    assert.equal(root.find((el) => el.classList.contains('drill-confirm-overlay')), undefined);
    assert.equal(exited, false, 'Escape should dismiss quit dialog without quitting');

    // Check memorize buttons aria-keyshortcuts
    const allBtns = root.findAll((el) => el.tagName === 'BUTTON');
    const prevBtn = allBtns.find((b) => b.textContent?.includes('Prev'));
    const nextBtn = allBtns.find((b) => b.textContent?.includes('Next') || b.textContent?.includes('Done'));
    const captionBtn = allBtns.find((b) => b.textContent?.includes('Captions'));
    const quitDrillBtn = allBtns.find((b) => b.textContent?.includes('Quit [Esc]'));

    assert.ok(prevBtn);
    assert.ok(nextBtn);
    assert.ok(captionBtn);
    assert.ok(quitDrillBtn);
    assert.equal(prevBtn.getAttribute('aria-keyshortcuts'), 'ArrowLeft');
    assert.equal(nextBtn.getAttribute('aria-keyshortcuts'), 'Space ArrowRight Enter');
    assert.equal(captionBtn.getAttribute('aria-keyshortcuts'), 'h H');
    assert.equal(quitDrillBtn.getAttribute('aria-keyshortcuts'), 'Escape');

    unmount();
  } finally {
    g.document = prevDoc;
    g.window = prevWin;
    g.localStorage = prevStorage;
  }
});

test('drill: results screen exposes aria-keyshortcuts and triggers shadow walk on S key', () => {
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

  try {
    const root = new MockElement('div');
    const view = createPalaceView();
    const data: SaveData = emptySave();
    let shadowWalkTriggered = false;

    const unmount = mountDrill(
      root as unknown as HTMLElement,
      view,
      data,
      { level: 0, daily: false },
      () => {},
      () => { shadowWalkTriggered = true; },
    );

    // 1. Ready -> Memorize (Space)
    for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
      fn({ type: 'keydown', key: ' ', preventDefault: () => {}, stopPropagation: () => {} } as unknown as Event);
    }

    // 2. Memorize 3 cards -> Finish memorize (Enter on last card)
    // Level 0 has 3 cards (LADDER[0] = 3)
    for (let step = 0; step < 3; step++) {
      for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
        fn({ type: 'keydown', key: 'Enter', preventDefault: () => {}, stopPropagation: () => {} } as unknown as Event);
      }
    }

    // 3. Now in Recall phase: check recall buttons aria-keyshortcuts
    const recallBtns = root.findAll((el) => el.tagName === 'BUTTON');
    const skipBtn = recallBtns.find((b) => b.textContent?.includes('Skip [-]'));
    const backBtn = recallBtns.find((b) => b.textContent?.includes('Back [⌫]'));
    assert.ok(skipBtn, 'Skip button should exist in recall');
    assert.ok(backBtn, 'Back button should exist in recall');
    assert.equal(skipBtn.getAttribute('aria-keyshortcuts'), '-');
    assert.equal(backBtn.getAttribute('aria-keyshortcuts'), 'Backspace');

    // Skip all 3 cards in recall to reach results phase
    for (let step = 0; step < 3; step++) {
      for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
        fn({ type: 'keydown', key: '-', preventDefault: () => {}, stopPropagation: () => {} } as unknown as Event);
      }
    }

    // 4. Now in Results phase
    const resultBtns = root.findAll((el) => el.tagName === 'BUTTON');
    const exitBtn = resultBtns.find((b) => b.textContent?.includes('Back to Palace'));
    const shadowBtn = resultBtns.find((b) => b.textContent?.includes('Shadow Walk'));
    const againBtn = resultBtns.find((b) => b.textContent?.includes('Play Again'));

    assert.ok(exitBtn, 'Exit button in results');
    assert.ok(shadowBtn, 'Shadow Walk button in results');
    assert.ok(againBtn, 'Play Again button in results');

    assert.equal(exitBtn.getAttribute('aria-keyshortcuts'), 'Escape');
    assert.equal(shadowBtn.getAttribute('aria-keyshortcuts'), 's S');
    assert.equal(againBtn.getAttribute('aria-keyshortcuts'), 'Space Enter');

    // Press 's' to trigger shadow walk
    for (const fn of [...(windowListeners.get('keydown') ?? [])]) {
      fn({ type: 'keydown', key: 's', preventDefault: () => {}, stopPropagation: () => {} } as unknown as Event);
    }

    assert.equal(shadowWalkTriggered, true, 'Pressing s in results triggers onShadowWalk');

    unmount();
  } finally {
    g.document = prevDoc;
    g.window = prevWin;
    g.localStorage = prevStorage;
  }
});
