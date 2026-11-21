import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECK } from '../deck.ts';
import { cardName, cardSvg } from './cardArt.ts';
import { cardFace } from './cardFace.ts';

function setupDocument(colorSafe: boolean): void {
  const classes = new Set(colorSafe ? ['color-safe'] : []);
  globalThis.document = {
    documentElement: { classList: { contains: (name: string) => classes.has(name) } },
    createElement: (tag: string) => {
      const el: any = {
        tagName: tag.toUpperCase(), className: '', attributes: {}, children: [],
        setAttribute(name: string, value: string) { this.attributes[name] = value; },
        getAttribute(name: string) { return this.attributes[name] ?? null; },
        append(child: unknown) { this.children.push(child); },
        set innerHTML(value: string) { this.children = [{ markup: value }]; },
        get innerHTML() { return this.children[0]?.markup ?? ''; },
        set textContent(value: string) { this._text = value; },
        get textContent() { return this._text ?? ''; },
      };
      return el;
    },
  } as unknown as Document;
}

test('cardFace renders authored SVG, accessible names, stable classes, and document theme for every card', () => {
  setupDocument(false);
  for (const id of DECK) {
    const face = cardFace(id);
    assert.equal(face.className, id.endsWith('H') || id.endsWith('D') ? 'card-face red' : 'card-face');
    assert.equal(face.getAttribute('role'), 'img');
    assert.equal(face.getAttribute('aria-label'), cardName(id));
    assert.equal(face.innerHTML, cardSvg(id, { theme: 'classic', width: 100 }));
    assert.equal(face.textContent, '');
  }
});

test('cardFace selects four-colour art when the root is color-safe', () => {
  setupDocument(true);
  for (const id of DECK) {
    const face = cardFace(id);
    assert.equal(face.innerHTML, cardSvg(id, { theme: 'four-colour', width: 100 }));
    if (id.endsWith('D')) assert.ok(face.innerHTML.includes('#1d4ed8'));
    if (id.endsWith('C')) assert.ok(face.innerHTML.includes('#15803d'));
  }
});
