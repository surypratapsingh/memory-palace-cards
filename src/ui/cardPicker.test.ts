import test from 'node:test';
import assert from 'node:assert/strict';
import { createCardPicker } from './cardPicker.ts';
import { DECK, RANKS, SUITS } from '../deck.ts';
import type { CardId } from '../types.ts';

class MockElement {
  tagName: string;
  private _className = '';
  set className(val: string) {
    this._className = val;
    this.classList._classes = new Set(val.split(/\s+/).filter(Boolean));
  }
  get className() {
    return this._className;
  }
  type = 'button';
  disabled = false;
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  focused = false;
  private listeners = new Map<string, Set<EventListener>>();
  private _html = '';
  private _text = '';

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
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
  dispatchEvent(event: { type: string; key?: string; target?: unknown; preventDefault?: () => void }) {
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
}

function setupDOM() {
  const g = globalThis as Record<string, unknown>;
  const prevDoc = g.document;
  g.document = {
    documentElement: {
      classList: {
        contains: () => false,
      },
    },
    createElement: (tag: string) => new MockElement(tag),
  };
  return () => {
    g.document = prevDoc;
  };
}

test('cardPicker: has accessible group roles and labels for picker and suit rows', () => {
  const cleanup = setupDOM();
  try {
    const picker = createCardPicker({
      usedCards: new Set(),
      onPick: () => {},
    });

    assert.equal(picker.element.getAttribute('role'), 'group');
    assert.equal(picker.element.getAttribute('aria-label'), 'Card picker');
    assert.equal(picker.element.children.length, 4);

    const suitNames = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
    for (let i = 0; i < 4; i++) {
      const row = picker.element.children[i];
      assert.equal(row.getAttribute('role'), 'group');
      assert.equal(row.getAttribute('aria-label'), suitNames[i]);
      assert.equal(row.children.length, 13);
    }

    picker.destroy();
  } finally {
    cleanup();
  }
});

test('cardPicker: keyboard arrow navigation navigates ranks, suits, Home, and End', () => {
  const cleanup = setupDOM();
  try {
    const picked: CardId[] = [];
    const picker = createCardPicker({
      usedCards: new Set(),
      onPick: (c) => picked.push(c),
    });

    const getBtn = (cardId: CardId): MockElement => {
      for (const row of picker.element.children) {
        for (const btn of row.children) {
          if (btn.dataset.card === cardId) return btn;
        }
      }
      throw new Error(`Card ${cardId} not found`);
    };

    const resetFocus = () => {
      for (const cardId of DECK) {
        getBtn(cardId).focused = false;
      }
    };

    const container = picker.element as unknown as MockElement;

    // ArrowRight from AS -> 2S
    resetFocus();
    getBtn('AS').focus();
    let prevented = false;
    container.dispatchEvent({
      type: 'keydown',
      key: 'ArrowRight',
      target: getBtn('AS'),
      preventDefault: () => { prevented = true; },
    });
    assert.ok(prevented);
    assert.equal(getBtn('2S').focused, true);

    // ArrowLeft from 2S -> AS
    resetFocus();
    getBtn('2S').focus();
    prevented = false;
    container.dispatchEvent({
      type: 'keydown',
      key: 'ArrowLeft',
      target: getBtn('2S'),
      preventDefault: () => { prevented = true; },
    });
    assert.ok(prevented);
    assert.equal(getBtn('AS').focused, true);

    // ArrowLeft wrap around from AS -> KS
    resetFocus();
    getBtn('AS').focus();
    prevented = false;
    container.dispatchEvent({
      type: 'keydown',
      key: 'ArrowLeft',
      target: getBtn('AS'),
      preventDefault: () => { prevented = true; },
    });
    assert.ok(prevented);
    assert.equal(getBtn('KS').focused, true);

    // ArrowDown from AS -> AH
    resetFocus();
    getBtn('AS').focus();
    prevented = false;
    container.dispatchEvent({
      type: 'keydown',
      key: 'ArrowDown',
      target: getBtn('AS'),
      preventDefault: () => { prevented = true; },
    });
    assert.ok(prevented);
    assert.equal(getBtn('AH').focused, true);

    // ArrowUp from AS -> AC (wrap around to Clubs)
    resetFocus();
    getBtn('AS').focus();
    prevented = false;
    container.dispatchEvent({
      type: 'keydown',
      key: 'ArrowUp',
      target: getBtn('AS'),
      preventDefault: () => { prevented = true; },
    });
    assert.ok(prevented);
    assert.equal(getBtn('AC').focused, true);

    // End key jumps to KS
    resetFocus();
    getBtn('5S').focus();
    prevented = false;
    container.dispatchEvent({
      type: 'keydown',
      key: 'End',
      target: getBtn('5S'),
      preventDefault: () => { prevented = true; },
    });
    assert.ok(prevented);
    assert.equal(getBtn('KS').focused, true);

    // Home key jumps to AS
    resetFocus();
    getBtn('KS').focus();
    prevented = false;
    container.dispatchEvent({
      type: 'keydown',
      key: 'Home',
      target: getBtn('KS'),
      preventDefault: () => { prevented = true; },
    });
    assert.ok(prevented);
    assert.equal(getBtn('AS').focused, true);

    // Non-navigation key does not prevent default or alter focus
    resetFocus();
    getBtn('AS').focus();
    prevented = false;
    container.dispatchEvent({
      type: 'keydown',
      key: 'Tab',
      target: getBtn('AS'),
      preventDefault: () => { prevented = true; },
    });
    assert.equal(prevented, false);

    picker.destroy();
  } finally {
    cleanup();
  }
});

test('cardPicker: onPick called when clicking unused card, ignored when disabled', () => {
  const cleanup = setupDOM();
  try {
    const picked: CardId[] = [];
    const used = new Set<CardId>(['AS']);
    const picker = createCardPicker({
      usedCards: used,
      onPick: (c) => picked.push(c),
    });

    const getBtn = (cardId: CardId): MockElement => {
      for (const row of picker.element.children) {
        for (const btn of row.children) {
          if (btn.dataset.card === cardId) return btn;
        }
      }
      throw new Error(`Card ${cardId} not found`);
    };

    getBtn('AS').click();
    assert.deepEqual(picked, [], 'Disabled card click must not trigger onPick');

    getBtn('KH').click();
    assert.deepEqual(picked, ['KH'], 'Enabled card click triggers onPick');

    picker.destroy();
  } finally {
    cleanup();
  }
});
