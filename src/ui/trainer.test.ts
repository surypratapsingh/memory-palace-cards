import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue, mountTrainer } from './trainer.ts';
import { DECK } from '../deck.ts';
import { emptySave, imageFor } from '../store.ts';
import { newSrs } from '../srs.ts';
import type { SaveData } from '../types.ts';

test('buildQueue: empty save yields the first eight cards in deck order', () => {
  const queue = buildQueue(emptySave(), new Date('2026-01-01T00:00:00Z'));
  assert.deepEqual(queue, DECK.slice(0, 8));
});

test('buildQueue: due reviews precede up to eight unseen cards, oldest due first', () => {
  const data = emptySave();
  data.srs.AS = { ...data.srs.AS, due: '2025-12-01T00:00:00.000Z' } as NonNullable<typeof data.srs.AS>;
  data.srs['2S'] = { ...data.srs.AS!, due: '2025-11-01T00:00:00.000Z' };
  data.srs['3S'] = { ...data.srs.AS, due: '2026-02-01T00:00:00.000Z' };
  assert.deepEqual(buildQueue(data, new Date('2026-01-01T00:00:00Z')), [
    '2S', 'AS', ...DECK.filter((card) => !['AS', '2S', '3S'].includes(card)).slice(0, 8),
  ]);
});

test('buildQueue: JSON date strings are accepted for due reviews', () => {
  const data = emptySave();
  data.srs.QH = { ...data.srs.QH, due: '2025-12-31T00:00:00.000Z' } as NonNullable<typeof data.srs.QH>;
  assert.equal(buildQueue(data, new Date('2026-01-01T00:00:00Z'))[0], 'QH');
});

test('buildQueue: non-due learned cards are excluded, but new cards still fill eight slots', () => {
  const data: SaveData = emptySave();
  data.srs.AS = { ...emptySave().srs.AS, due: '2099-01-01T00:00:00.000Z' } as NonNullable<typeof data.srs.AS>;
  const queue = buildQueue(data, new Date('2026-01-01T00:00:00Z'));
  assert.equal(queue.length, 8);
  assert.ok(!queue.includes('AS'));
  assert.deepEqual(queue, DECK.filter((card) => card !== 'AS').slice(0, 8));
});

test('buildQueue: malformed foreign SRS keys are ignored', () => {
  const data = emptySave();
  (data.srs as Record<string, unknown>).JOKER = { due: '2020-01-01T00:00:00.000Z' };
  assert.deepEqual(buildQueue(data, new Date('2026-01-01T00:00:00Z')), DECK.slice(0, 8));
});

test('buildQueue: queue never duplicates cards and all output IDs are in the deck', () => {
  const data = emptySave();
  for (const card of DECK) {
    data.srs[card] = { ...emptySave().srs.AS!, due: '2025-01-01T00:00:00.000Z' };
  }
  const queue = buildQueue(data, new Date('2026-01-01T00:00:00Z'));
  assert.equal(queue.length, 52);
  assert.equal(new Set(queue).size, 52);
  assert.ok(queue.every((card) => DECK.includes(card)));
});

// Minimal mock DOM for testing trainer UI component in Node
class MockElement {
  tagName: string;
  className = '';
  textContent = '';
  type = '';
  disabled = false;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  focused = false;
  value = '';
  title = '';
  placeholder = '';
  isContentEditable = false;

  private listeners = new Map<string, Set<EventListener>>();

  constructor(tagName = 'DIV') {
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(k: string, v: string) {
    this.attributes.set(k, String(v));
  }
  getAttribute(k: string): string | null {
    return this.attributes.get(k) ?? null;
  }

  classList = {
    _classes: new Set<string>(),
    add: (...names: string[]) => {
      for (const n of names) this.classList._classes.add(n);
      this.className = [...this.classList._classes].join(' ');
    },
    remove: (...names: string[]) => {
      for (const n of names) this.classList._classes.delete(n);
      this.className = [...this.classList._classes].join(' ');
    },
    contains: (n: string) => this.classList._classes.has(n) || this.className.split(/\s+/).includes(n),
  };

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
    for (const c of this.children) {
      c.parentElement = null;
    }
    this.children = [];
    for (const c of newChildren) {
      this.appendChild(c);
    }
  }

  append(...items: (MockElement | string)[]) {
    for (const item of items) {
      if (typeof item === 'string') {
        const textNode = new MockElement('SPAN');
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

  dispatchEvent(event: { type: string; key?: string; target?: unknown; preventDefault?: () => void }): boolean {
    const ev = { ...event, target: event.target ?? this };
    const set = this.listeners.get(event.type);
    if (set) {
      for (const fn of [...set]) fn(ev as unknown as Event);
    }
    return true;
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  focus() {
    this.focused = true;
  }

  set innerHTML(_val: string) {}
  get innerHTML() { return ''; }

  querySelector<T extends MockElement>(selector: string): T | null {
    const match = (el: MockElement): boolean => {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if (el.className.split(/\s+/).includes(cls)) return true;
      }
      if (el.tagName.toLowerCase() === selector.toLowerCase()) return true;
      return false;
    };

    for (const child of this.children) {
      if (match(child)) return child as unknown as T;
      const found = child.querySelector<T>(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll<T extends MockElement>(selector: string): T[] {
    const results: T[] = [];
    const match = (el: MockElement): boolean => {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if (el.className.split(/\s+/).includes(cls)) return true;
      }
      if (el.tagName.toLowerCase() === selector.toLowerCase()) return true;
      return false;
    };

    const traverse = (el: MockElement) => {
      for (const child of el.children) {
        if (match(child)) results.push(child as unknown as T);
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  find(predicate: (el: MockElement) => boolean): MockElement | undefined {
    if (predicate(this)) return this;
    for (const child of this.children) {
      const found = child.find(predicate);
      if (found) return found;
    }
    return undefined;
  }

  findByText(text: string): MockElement | undefined {
    return this.find((el) => el.textContent === text || el.textContent.includes(text));
  }
}

class MockInputElement extends MockElement {
  constructor() {
    super('INPUT');
  }
}

class MockTextAreaElement extends MockElement {
  constructor() {
    super('TEXTAREA');
  }
}

function setupDOM() {
  const docListeners = new Map<string, Set<EventListener>>();
  const g = globalThis as Record<string, unknown>;
  const prevDoc = g.document;
  const prevWin = g.window;
  const prevStorage = g.localStorage;
  const prevHTMLElement = g.HTMLElement;
  const prevHTMLInputElement = g.HTMLInputElement;
  const prevHTMLTextAreaElement = g.HTMLTextAreaElement;

  const storageMap = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, String(v)),
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
  };

  g.HTMLElement = MockElement;
  g.HTMLInputElement = MockInputElement;
  g.HTMLTextAreaElement = MockTextAreaElement;

  g.document = {
    documentElement: {
      classList: {
        contains: () => false,
      },
    },
    createElement: (tag: string) => {
      if (tag.toLowerCase() === 'input') return new MockInputElement();
      if (tag.toLowerCase() === 'textarea') return new MockTextAreaElement();
      return new MockElement(tag);
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

  const pressKey = (key: string, target?: unknown) => {
    let defaultPrevented = false;
    const event = {
      type: 'keydown',
      key,
      target: target ?? g.document,
      preventDefault: () => { defaultPrevented = true; },
      stopPropagation: () => {},
    };
    for (const fn of [...(docListeners.get('keydown') ?? [])]) {
      fn(event as unknown as Event);
    }
    return { defaultPrevented };
  };

  return {
    pressKey,
    cleanup: () => {
      g.document = prevDoc;
      g.window = prevWin;
      g.localStorage = prevStorage;
      g.HTMLElement = prevHTMLElement;
      g.HTMLInputElement = prevHTMLInputElement;
      g.HTMLTextAreaElement = prevHTMLTextAreaElement;
    },
  };
}

test('mountTrainer: initial render in learn mode displays overview, progress, card face, and input', () => {
  const { cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    let exited = false;
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => { exited = true; });

    const shell = root.querySelector('.trainer');
    assert.ok(shell, 'trainer shell should be mounted');
    assert.equal(shell.getAttribute('aria-label'), 'Card image trainer');

    const overview = root.querySelector('.trainer-overview');
    assert.ok(overview, 'overview navigation exists');
    assert.equal(overview.getAttribute('aria-label'), 'Card progress overview');
    assert.equal(overview.children.length, 52, '52 card tiles in overview');
    assert.equal(overview.children[0].dataset.strength, 'new');

    const progress = root.querySelector('.trainer-progress');
    assert.ok(progress, 'progress indicator exists');
    assert.equal(progress.textContent, '8 left');

    const heading = root.findByText('Learn this image');
    assert.ok(heading, 'Learn this image heading exists');

    const input = root.querySelector<MockInputElement>('.trainer-image-input');
    assert.ok(input, 'input for custom image exists');
    assert.equal(input.value, imageFor(data, 'AS'));

    // Editing input updates data.images and saves
    input.value = 'Astronaut Suit';
    input.dispatchEvent({ type: 'input' });
    assert.equal(data.images['AS'], 'Astronaut Suit');

    unmount();
    assert.equal(root.children.length, 0, 'unmount removes trainer shell');
  } finally {
    cleanup();
  }
});

test('mountTrainer: learning flow with Got it button, Enter key, and Space key advances queue', () => {
  const { pressKey, cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    let exited = false;
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => { exited = true; });

    // Card 1: AS. Click "Got it"
    const gotItBtn = root.findByText('Got it');
    assert.ok(gotItBtn, 'Got it button exists');
    gotItBtn.click();
    assert.ok(data.srs['AS'], 'AS is now learned');

    // Card 2: 2S. Press Enter in the input
    const input2S = root.querySelector<MockInputElement>('.trainer-image-input');
    assert.ok(input2S);
    pressKey('Enter', input2S);
    assert.ok(data.srs['2S'], '2S is now learned');

    // Card 3: 3S. Press Space outside input
    pressKey(' ');
    assert.ok(data.srs['3S'], '3S is now learned');

    unmount();
  } finally {
    cleanup();
  }
});

test('mountTrainer: review flow (recall -> reveal -> rate) updates SRS and completes session', () => {
  const { pressKey, cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    // Mark all other cards as learned in future so queue only has AS
    for (const card of DECK) {
      data.srs[card] = { ...newSrs(), due: '2099-01-01T00:00:00.000Z' };
    }
    data.srs['AS'] = { ...newSrs(), due: '2020-01-01T00:00:00.000Z' };
    let exitedData: SaveData | null = null;
    const unmount = mountTrainer(root as unknown as HTMLElement, data, (d) => { exitedData = d; });

    // Starts in recall screen because AS is due
    assert.ok(root.findByText('Recall the image, then press Space to reveal.'));

    // Press Space to reveal
    pressKey(' ');
    assert.ok(root.findByText('Again (1)'));
    assert.ok(root.findByText('Hard (2)'));
    assert.ok(root.findByText('Good (3)'));
    assert.ok(root.findByText('Easy (4)'));

    // Rating buttons have aria-keyshortcuts
    const goodBtn = root.findByText('Good (3)');
    assert.ok(goodBtn);
    assert.equal(goodBtn.getAttribute('aria-keyshortcuts'), '3');

    // Click Good (3)
    goodBtn.click();
    assert.ok(new Date(data.srs['AS'].due).getTime() > Date.now());

    // With queue now empty, screen transitions to session complete
    assert.ok(root.findByText('Session complete'));
    const backBtn = root.findByText('Back');
    assert.ok(backBtn);
    backBtn.click();
    assert.ok(exitedData);

    unmount();
  } finally {
    cleanup();
  }
});

test('mountTrainer: rating Again increments againCount and requeues card', () => {
  const { pressKey, cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    for (const card of DECK) {
      data.srs[card] = { ...newSrs(), due: '2099-01-01T00:00:00.000Z' };
    }
    data.srs['AS'] = { ...newSrs(), due: '2020-01-01T00:00:00.000Z', lapses: 0 };
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => {});

    // Recall -> Space -> Reveal
    pressKey(' ');
    // Rate Again (key '1')
    pressKey('1');

    // The card is requeued! Check progress text shows 1 left
    const progress = root.querySelector('.trainer-progress');
    assert.ok(progress);
    assert.equal(progress.textContent, '1 left');

    // Recall again -> Space -> Reveal -> Rate Good
    pressKey(' ');
    pressKey('3');

    // Session completes and displays summary with Again 1
    assert.ok(root.findByText('Session complete'));
    assert.ok(root.findByText('Reviewed 2 · Again 1 · New learned 0'));

    unmount();
  } finally {
    cleanup();
  }
});

test('mountTrainer: reveal key 4 rates Easy and completes the card', () => {
  const { pressKey, cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    for (const card of DECK) {
      data.srs[card] = { ...newSrs(), due: '2099-01-01T00:00:00.000Z' };
    }
    data.srs['AS'] = { ...newSrs(), due: '2020-01-01T00:00:00.000Z' };
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => {});

    pressKey(' ');
    // Key '4' is the Easy shortcut. Without it the screen stays on reveal.
    pressKey('4');

    assert.ok(root.findByText('Session complete'));
    assert.ok(root.findByText('Reviewed 1 · Again 0 · New learned 0'));
    assert.ok(new Date(data.srs['AS'].due).getTime() > Date.now());

    unmount();
  } finally {
    cleanup();
  }
});

test('mountTrainer: Again rating with lapses >= 4 triggers reforge screen and image saving via button and Enter key', () => {
  const { pressKey, cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    // Card with lapses >= 4
    data.srs['AS'] = { ...newSrs(), due: '2020-01-01T00:00:00.000Z', lapses: 4 };
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => {});

    // Recall -> Reveal -> Again
    pressKey(' ');
    pressKey('1');

    // Screen should now be 'reforge'
    assert.ok(root.findByText("This image isn't sticking. Make it stranger:"));
    const reforgeInput = root.querySelector<MockInputElement>('.trainer-reforge-input');
    assert.ok(reforgeInput, 'reforge input exists');
    assert.ok(reforgeInput.focused, 'reforge input is focused');

    // Enter new image and save via Enter key
    reforgeInput.value = 'Alien with Sparklers';
    reforgeInput.dispatchEvent({ type: 'input' });

    pressKey('Enter');
    assert.equal(data.images['AS'], 'Alien with Sparklers', 'new image persisted via Enter key');

    unmount();
  } finally {
    cleanup();
  }
});

test('mountTrainer: overview card click opens card detail and Continue restores screen', () => {
  const { cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => {});

    // Currently on learn screen for AS
    assert.ok(root.findByText('Learn this image'));

    // Find overview tile for 'KH' and click it
    const overview = root.querySelector('.trainer-overview');
    assert.ok(overview);
    const tileKH = overview.children.find((c) => c.textContent === 'KH');
    assert.ok(tileKH);
    tileKH.click();

    // Now in overview screen
    assert.ok(root.findByText('Card image'));
    assert.ok(root.findByText(imageFor(data, 'KH')));

    // Click Continue to return
    const continueBtn = root.findByText('Continue');
    assert.ok(continueBtn);
    continueBtn.click();

    // Restores learn screen
    assert.ok(root.findByText('Learn this image'));

    unmount();
  } finally {
    cleanup();
  }
});

test('mountTrainer: pressing Escape exits trainer and calls onExit', () => {
  const { pressKey, cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    let exited = false;
    mountTrainer(root as unknown as HTMLElement, data, () => { exited = true; });

    assert.equal(exited, false);
    const res = pressKey('Escape');
    assert.equal(res.defaultPrevented, true);
    assert.equal(exited, true, 'Escape key should trigger onExit');
    assert.equal(root.children.length, 0, 'trainer shell removed on exit');
  } finally {
    cleanup();
  }
});

test('mountTrainer: empty queue immediately renders session complete', () => {
  const { cleanup } = setupDOM();
  try {
    const root = new MockElement('DIV');
    const data = emptySave();
    // Fill all cards as learned in future
    for (const card of DECK) {
      data.srs[card] = { ...newSrs(), due: '2099-01-01T00:00:00.000Z' };
    }
    let exited = false;
    const unmount = mountTrainer(root as unknown as HTMLElement, data, () => { exited = true; });

    assert.ok(root.findByText('Session complete'));
    const backBtn = root.findByText('Back');
    assert.ok(backBtn);
    backBtn.click();
    assert.equal(exited, true);

    unmount();
  } finally {
    cleanup();
  }
});

