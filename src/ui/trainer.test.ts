import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue, mountTrainer } from './trainer.ts';
import { DECK } from '../deck.ts';
import { emptySave } from '../store.ts';
import { newSrs, Rating } from '../srs.ts';
import type { CardId, SaveData } from '../types.ts';

test('buildQueue: empty save yields the first eight cards in deck order', () => {
  const queue = buildQueue(emptySave(), new Date('2026-01-01T00:00:00Z'));
  assert.deepEqual(queue, DECK.slice(0, 8));
});

test('buildQueue: due reviews precede up to eight unseen cards, oldest due first', () => {
  const data = emptySave();
  data.srs.AS = { ...newSrs(), due: new Date('2025-12-01T00:00:00.000Z') };
  data.srs['2S'] = { ...newSrs(), due: new Date('2025-11-01T00:00:00.000Z') };
  data.srs['3S'] = { ...newSrs(), due: new Date('2026-02-01T00:00:00.000Z') };
  assert.deepEqual(buildQueue(data, new Date('2026-01-01T00:00:00Z')), [
    '2S', 'AS', ...DECK.filter((card) => !['AS', '2S', '3S'].includes(card)).slice(0, 8),
  ]);
});

test('buildQueue: JSON date strings are accepted for due reviews', () => {
  const data = emptySave();
  data.srs.QH = { ...newSrs(), due: '2025-12-31T00:00:00.000Z' } as any;
  assert.equal(buildQueue(data, new Date('2026-01-01T00:00:00Z'))[0], 'QH');
});

test('buildQueue: non-due learned cards are excluded, but new cards still fill eight slots', () => {
  const data: SaveData = emptySave();
  data.srs.AS = { ...newSrs(), due: '2099-01-01T00:00:00.000Z' } as any;
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
    data.srs[card] = { ...newSrs(), due: new Date('2025-01-01T00:00:00.000Z') };
  }
  const queue = buildQueue(data, new Date('2026-01-01T00:00:00Z'));
  assert.equal(queue.length, 52);
  assert.equal(new Set(queue).size, 52);
  assert.ok(queue.every((card) => DECK.includes(card)));
});

class MockTrainerElement {
  className = '';
  textContent = '';
  type = '';
  value = '';
  placeholder = '';
  title = '';
  disabled = false;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  classList = {
    classes: new Set<string>(),
    add(...names: string[]) { for (const n of names) this.classes.add(n); },
    remove(...names: string[]) { for (const n of names) this.classes.delete(n); },
    contains(name: string) { return this.classes.has(name); },
  };
  children: MockTrainerElement[] = [];
  parentElement: MockTrainerElement | null = null;
  private listeners = new Map<string, Set<(e: any) => void>>();

  appendChild<T extends MockTrainerElement>(child: T): T {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild<T extends MockTrainerElement>(child: T): T {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  replaceChildren(...newChildren: MockTrainerElement[]) {
    this.children = [];
    for (const c of newChildren) this.appendChild(c);
  }

  get firstChild(): MockTrainerElement | null {
    return this.children[0] ?? null;
  }

  append(...items: (MockTrainerElement | string)[]) {
    for (const item of items) {
      if (typeof item === 'string') {
        const textNode = new MockTrainerElement();
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

  addEventListener(event: string, listener: (e: any) => void) {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
  }

  removeEventListener(event: string, listener: (e: any) => void) {
    this.listeners.get(event)?.delete(listener);
  }

  dispatchEvent(evt: { type: string; [k: string]: unknown }): boolean {
    const set = this.listeners.get(evt.type);
    if (set) {
      for (const fn of [...set]) {
        fn(evt);
      }
    }
    return true;
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  focus() {}

  querySelector<T extends MockTrainerElement = MockTrainerElement>(sel: string): T | null {
    const matches = (el: MockTrainerElement) => {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return el.className.split(/\s+/).includes(cls) || el.classList.contains(cls);
      }
      return false;
    };
    for (const c of this.children) {
      if (matches(c)) return c as unknown as T;
      const found = c.querySelector<T>(sel);
      if (found) return found;
    }
    return null;
  }

  find(text: string): MockTrainerElement | undefined {
    if (this.textContent === text) return this;
    for (const c of this.children) {
      const m = c.find(text);
      if (m) return m;
    }
  }
}

function withMockDom(fn: () => void | Promise<void>) {
  const g = globalThis as Record<string, unknown>;
  const oldDoc = g.document;
  const oldStorage = g.localStorage;
  const oldHtmlEl = g.HTMLElement;
  const oldInputEl = g.HTMLInputElement;
  const oldTextAreaEl = g.HTMLTextAreaElement;
  const docListeners = new Map<string, Set<(e: any) => void>>();

  class MockHtmlElement extends MockTrainerElement {}
  class MockHtmlInputElement extends MockHtmlElement {}
  class MockHtmlTextAreaElement extends MockHtmlElement {}

  g.HTMLElement = MockHtmlElement;
  g.HTMLInputElement = MockHtmlInputElement;
  g.HTMLTextAreaElement = MockHtmlTextAreaElement;

  g.localStorage = {
    setItem: () => {},
    getItem: () => null,
    removeItem: () => {},
    clear: () => {},
  };

  const doc = {
    createElement: (tag: string) => {
      if (tag === 'input') return new MockHtmlInputElement();
      if (tag === 'textarea') return new MockHtmlTextAreaElement();
      return new MockHtmlElement();
    },
    documentElement: { classList: { contains: () => false } },
    addEventListener: (t: string, f: (e: any) => void) => {
      let set = docListeners.get(t);
      if (!set) {
        set = new Set();
        docListeners.set(t, set);
      }
      set.add(f);
    },
    removeEventListener: (t: string, f: (e: any) => void) => {
      docListeners.get(t)?.delete(f);
    },
    dispatchEvent: (evt: any) => {
      const set = docListeners.get(evt.type);
      if (set) for (const f of [...set]) f(evt);
    },
  };
  g.document = doc;

  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.finally(() => {
        g.document = oldDoc;
        g.localStorage = oldStorage;
        g.HTMLElement = oldHtmlEl;
        g.HTMLInputElement = oldInputEl;
        g.HTMLTextAreaElement = oldTextAreaEl;
      });
    }
  } finally {
    if (!(fn() instanceof Promise)) {
      g.document = oldDoc;
      g.localStorage = oldStorage;
      g.HTMLElement = oldHtmlEl;
      g.HTMLInputElement = oldInputEl;
      g.HTMLTextAreaElement = oldTextAreaEl;
    }
  }
}

test('mountTrainer: learn screen completes and advances to review', () => {
  withMockDom(() => {
    const root = new MockTrainerElement() as unknown as HTMLElement;
    const data = emptySave();
    let exited = false;

    const unmount = mountTrainer(root, data, () => { exited = true; });
    const shell = (root as unknown as MockTrainerElement).children[0];
    assert.ok(shell);

    // Initial screen should be learn
    const input = shell.querySelector<MockTrainerElement>('.trainer-image-input');
    assert.ok(input);
    input.value = 'Custom Ace Image';
    input.dispatchEvent({ type: 'input' });
    assert.equal(data.images.AS, 'Custom Ace Image');

    // Click "Got it"
    const gotIt = shell.find('Got it');
    assert.ok(gotIt);
    gotIt.click();

    // SRS should now be initialized for AS
    assert.ok(data.srs.AS);

    unmount();
  });
});

test('mountTrainer: recall and reveal flow with rating and spacebar', () => {
  withMockDom(() => {
    const root = new MockTrainerElement() as unknown as HTMLElement;
    const data = emptySave();
    const s = newSrs();
    s.due = new Date('2020-01-01T00:00:00.000Z');
    data.srs.AS = s;

    let exitData: SaveData | null = null;
    const unmount = mountTrainer(root, data, (d) => { exitData = d; });
    const doc = globalThis.document as any;

    // Recall screen -> Space triggers reveal
    doc.dispatchEvent({ type: 'keydown', key: ' ', preventDefault() {} });

    const shell = (root as unknown as MockTrainerElement).children[0];
    const rateBtn = shell.find('Good (3)');
    assert.ok(rateBtn);
    // Rate with '3' via keyboard
    doc.dispatchEvent({ type: 'keydown', key: '3', preventDefault() {} });

    // Press Escape to exit
    doc.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {} });
    assert.ok(exitData);

    unmount();
  });
});

test('mountTrainer: reforge flow triggers when lapses >= 4 on Again', () => {
  withMockDom(() => {
    const root = new MockTrainerElement() as unknown as HTMLElement;
    const data = emptySave();
    const s = newSrs();
    s.state = 2 as any; // State.Review
    s.last_review = new Date('2020-01-01T00:00:00.000Z');
    s.due = new Date('2020-01-01T00:00:00.000Z');
    s.lapses = 3;
    data.srs.AS = s;

    const unmount = mountTrainer(root, data, () => {});
    const doc = globalThis.document as any;

    // Space to reveal
    doc.dispatchEvent({ type: 'keydown', key: ' ', preventDefault() {} });

    // Again rating ('1') brings lapses to 4 -> reforge screen
    doc.dispatchEvent({ type: 'keydown', key: '1', preventDefault() {} });

    const shell = (root as unknown as MockTrainerElement).children[0];
    const reforgeInput = shell.querySelector<MockTrainerElement>('.trainer-reforge-input');
    assert.ok(reforgeInput);
    reforgeInput.value = 'Stranger Ace';
    reforgeInput.dispatchEvent({ type: 'input' });

    // Enter to save reforge
    doc.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault() {} });
    assert.equal(data.images.AS, 'Stranger Ace');

    unmount();
  });
});

test('mountTrainer: overview screen opens on tile click and continues', () => {
  withMockDom(() => {
    const root = new MockTrainerElement() as unknown as HTMLElement;
    const data = emptySave();

    const unmount = mountTrainer(root, data, () => {});
    const shell = (root as unknown as MockTrainerElement).children[0];

    const tile = shell.querySelector<MockTrainerElement>('.trainer-tile');
    assert.ok(tile);
    tile.click();

    // Now on overview screen
    const continueBtn = shell.find('Continue');
    assert.ok(continueBtn);
    continueBtn.click();

    unmount();
  });
});

test('mountTrainer: empty queue renders session complete and back button', () => {
  withMockDom(() => {
    const root = new MockTrainerElement() as unknown as HTMLElement;
    const data = emptySave();
    // Mark all 52 cards as learned and due far in future
    for (const c of DECK) {
      const s = newSrs();
      s.due = new Date('2099-01-01T00:00:00.000Z');
      data.srs[c] = s;
    }

    let exited = false;
    const unmount = mountTrainer(root, data, () => { exited = true; });
    const shell = (root as unknown as MockTrainerElement).children[0];

    const backBtn = shell.find('Back');
    assert.ok(backBtn);
    backBtn.click();
    assert.equal(exited, true);

    unmount();
  });
});

test('mountTrainer: pressing Enter while editing input completes learn', () => {
  withMockDom(() => {
    const root = new MockTrainerElement() as unknown as HTMLElement;
    const data = emptySave();
    const unmount = mountTrainer(root, data, () => {});
    const shell = (root as unknown as MockTrainerElement).children[0];
    const input = shell.querySelector<MockTrainerElement>('.trainer-image-input');
    assert.ok(input);
    const doc = globalThis.document as any;
    doc.dispatchEvent({ type: 'keydown', key: 'Enter', target: input, preventDefault() {} });
    assert.ok(data.srs.AS);
    unmount();
  });
});
