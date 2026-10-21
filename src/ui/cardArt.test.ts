import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECK, RANKS, SUITS } from '../deck.ts';
import type { CardId, Rank } from '../types.ts';
import {
  BOTTOM_RIGHT_INDEX_BOX,
  CARD_H,
  CARD_W,
  PIP_FIELD_BOX,
  SUIT_PATHS,
  TOP_LEFT_INDEX_BOX,
  cardBackSvg,
  cardName,
  cardSvg,
  pipLayout,
  suitColour,
} from './cardArt.ts';

const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
]);

function parseAndValidateXmlTags(svg: string): string[] {
  const tagRegex = /<\/?([a-zA-Z0-9:-]+)(\s[^>]*)?>/g;
  const stack: string[] = [];
  const seenElements: string[] = [];
  let rootCount = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(svg)) !== null) {
    const fullTag = match[0];
    const tagName = match[1]!;
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing = fullTag.endsWith('/>');

    if (stack.length === 0 && !isClosing) {
      rootCount++;
      assert.equal(tagName, 'svg', 'Root element must be <svg>');
    }

    if (isClosing) {
      assert.ok(stack.length > 0, `Unexpected closing tag </${tagName}>`);
      const top = stack.pop();
      assert.equal(top, tagName, `Mismatched closing tag </${tagName}> for <${top}>`);
    } else {
      seenElements.push(tagName);
      if (!isSelfClosing) {
        stack.push(tagName);
      }
    }
  }

  assert.equal(stack.length, 0, `Unclosed tags remaining: ${stack.join(', ')}`);
  assert.equal(rootCount, 1, `Expected exactly 1 root <svg>, found ${rootCount}`);
  return seenElements;
}

function boxesOverlap(
  a: { x0: number; y0: number; x1: number; y1: number },
  b: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
}

test('1. pipLayout returns the exact count for A, 2-10, and [] for J, Q, K', () => {
  assert.equal(pipLayout('A').length, 1);
  const numericRanks: readonly [Rank, number][] = [
    ['2', 2],
    ['3', 3],
    ['4', 4],
    ['5', 5],
    ['6', 6],
    ['7', 7],
    ['8', 8],
    ['9', 9],
    ['T', 10],
  ];
  for (const [rank, expected] of numericRanks) {
    assert.equal(pipLayout(rank).length, expected, `Rank ${rank} should have ${expected} pips`);
  }
  assert.deepStrictEqual(pipLayout('J'), []);
  assert.deepStrictEqual(pipLayout('Q'), []);
  assert.deepStrictEqual(pipLayout('K'), []);
});

test('2. pipLayout 180-degree symmetry holds for every rank except 7', () => {
  for (const rank of RANKS) {
    if (rank === '7') continue;
    const pips = pipLayout(rank);
    for (const p of pips) {
      const tx = CARD_W - p.x;
      const ty = CARD_H - p.y;
      if (p.x === 125 && p.y === 175) {
        assert.equal(p.flipped, false, 'Centre pip at (125, 175) must not be flipped');
        continue;
      }
      const expectedFlip = ty === 175 ? false : !p.flipped;
      const partner = pips.find(
        (q) => Math.abs(q.x - tx) < 1e-6 && Math.abs(q.y - ty) < 1e-6 && q.flipped === expectedFlip,
      );
      assert.ok(
        partner,
        `Rank ${rank} pip (${p.x}, ${p.y}, ${p.flipped}) missing 180° partner (${tx}, ${ty}, ${expectedFlip})`,
      );
    }
  }
});

test('3. pipLayout Rank 7 has its extra pip in the upper half only and 8/10/9 centre pips match spec', () => {
  const pips7 = pipLayout('7');
  const upper7 = pips7.filter((p) => p.y < 175);
  const lower7 = pips7.filter((p) => p.y > 175);
  assert.equal(upper7.length, 3);
  assert.equal(lower7.length, 2);

  for (const r of ['8', 'T'] as const) {
    const centrePips = pipLayout(r).filter((p) => p.x === 125);
    assert.equal(centrePips.length, 2);
    assert.ok(centrePips.some((p) => p.y < 175 && !p.flipped));
    assert.ok(centrePips.some((p) => p.y > 175 && p.flipped));
  }

  const centre9 = pipLayout('9').filter((p) => p.x === 125);
  assert.deepStrictEqual(centre9, [{ x: 125, y: 175, flipped: false }]);
});

test('4. flipped is true iff y > 175, and pips on y = 175 are never flipped', () => {
  for (const rank of RANKS) {
    for (const p of pipLayout(rank)) {
      if (p.y > 175) {
        assert.equal(p.flipped, true, `Pip at y=${p.y} on rank ${rank} must be flipped`);
      } else {
        assert.equal(p.flipped, false, `Pip at y=${p.y} on rank ${rank} must not be flipped`);
      }
    }
  }
});

test('5. Every pip lies inside the pip field, and pip field does not overlap either corner index box', () => {
  assert.equal(boxesOverlap(PIP_FIELD_BOX, TOP_LEFT_INDEX_BOX), false);
  assert.equal(boxesOverlap(PIP_FIELD_BOX, BOTTOM_RIGHT_INDEX_BOX), false);

  const pipHalfSize = 17;
  for (const rank of RANKS) {
    for (const p of pipLayout(rank)) {
      assert.ok(p.x - pipHalfSize >= PIP_FIELD_BOX.x0, `Pip x=${p.x} encroaches left of pip field`);
      assert.ok(p.x + pipHalfSize <= PIP_FIELD_BOX.x1, `Pip x=${p.x} encroaches right of pip field`);
      assert.ok(p.y - pipHalfSize >= PIP_FIELD_BOX.y0, `Pip y=${p.y} encroaches above pip field`);
      assert.ok(p.y + pipHalfSize <= PIP_FIELD_BOX.y1, `Pip y=${p.y} encroaches below pip field`);
    }
  }
});

test('6. Every SVG is well-formed XML with a single root <svg> and only allowed element names', () => {
  for (const theme of ['classic', 'four-colour'] as const) {
    for (const id of DECK) {
      const svg = cardSvg(id, { theme });
      assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'));
      const elements = parseAndValidateXmlTags(svg);
      for (const el of elements) {
        assert.ok(ALLOWED_TAGS.has(el), `Disallowed SVG element <${el}> in ${id}`);
      }
    }
  }

  const backElements = parseAndValidateXmlTags(cardBackSvg());
  for (const el of backElements) {
    assert.ok(ALLOWED_TAGS.has(el), `Disallowed SVG element <${el}> in cardBackSvg`);
  }
});

test('7. No forbidden attributes or tags appear in any card or card back', () => {
  const allSvgs = [
    ...DECK.map((id) => cardSvg(id, { theme: 'classic' })),
    ...DECK.map((id) => cardSvg(id, { theme: 'four-colour' })),
    cardBackSvg(),
  ];

  const forbiddenPatterns = [
    /\bid\s*=/i,
    /<\s*script\b/i,
    /\bhref\s*=/i,
    /\bon[a-z]+\s*=/i,
    /<\s*style\b/i,
    /\bforeignObject\b/i,
    /<\s*defs\b/i,
    /<\s*use\b/i,
    /gradient/i,
  ];

  for (const svg of allSvgs) {
    for (const pattern of forbiddenPatterns) {
      assert.equal(pattern.test(svg), false, `Forbidden pattern ${pattern} matched in SVG`);
    }
  }
});

test('8. aria-label equals cardName(id) for all 52 cards and cardName formats names properly', () => {
  assert.equal(cardName('TS'), 'Ten of spades');
  assert.equal(cardName('QH'), 'Queen of hearts');
  assert.equal(cardName('AC'), 'Ace of clubs');
  assert.equal(cardName('2D'), 'Two of diamonds');

  for (const id of DECK) {
    const svg = cardSvg(id);
    const expected = `aria-label="${cardName(id)}"`;
    assert.ok(svg.includes(expected), `Missing ${expected} in ${id}`);
  }
});

test('9. Size limits: each card SVG <= 14 kB and all 52 together <= 450 kB', () => {
  for (const theme of ['classic', 'four-colour'] as const) {
    let totalBytes = 0;
    for (const id of DECK) {
      const bytes = Buffer.byteLength(cardSvg(id, { theme }), 'utf8');
      assert.ok(bytes <= 14_000, `Card ${id} (${theme}) is ${bytes} bytes (> 14 kB)`);
      totalBytes += bytes;
    }
    assert.ok(totalBytes <= 450_000, `Total deck (${theme}) is ${totalBytes} bytes (> 450 kB)`);
  }

  const backBytes = Buffer.byteLength(cardBackSvg(), 'utf8');
  assert.ok(backBytes <= 14_000, `Card back is ${backBytes} bytes (> 14 kB)`);
});

test('10. Theme colours: classic vs four-colour suit palettes match specification', () => {
  assert.equal(suitColour('S', 'classic'), '#111827');
  assert.equal(suitColour('C', 'classic'), '#111827');
  assert.equal(suitColour('H', 'classic'), '#c81e1e');
  assert.equal(suitColour('D', 'classic'), '#c81e1e');

  assert.equal(suitColour('S', 'four-colour'), '#111827');
  assert.equal(suitColour('H', 'four-colour'), '#c81e1e');
  assert.equal(suitColour('D', 'four-colour'), '#1d4ed8');
  assert.equal(suitColour('C', 'four-colour'), '#15803d');

  for (const rank of RANKS) {
    const dFour = cardSvg(`${rank}D` as CardId, { theme: 'four-colour' });
    const cFour = cardSvg(`${rank}C` as CardId, { theme: 'four-colour' });
    assert.ok(dFour.includes('#1d4ed8'), `${rank}D four-colour must include #1d4ed8`);
    assert.ok(cFour.includes('#15803d'), `${rank}C four-colour must include #15803d`);

    const hClassic = cardSvg(`${rank}H` as CardId, { theme: 'classic' });
    const dClassic = cardSvg(`${rank}D` as CardId, { theme: 'classic' });
    const cClassic = cardSvg(`${rank}C` as CardId, { theme: 'classic' });
    assert.ok(hClassic.includes('#c81e1e'), `${rank}H classic must include #c81e1e`);
    assert.ok(dClassic.includes('#c81e1e'), `${rank}D classic must include #c81e1e`);
    assert.equal(cClassic.includes('#15803d'), false, `${rank}C classic must never contain #15803d`);
  }
});

test('11. Determinism and uniqueness: identical inputs yield identical output, all 52 cards differ', () => {
  const seenClassic = new Set<string>();
  const seenFourColour = new Set<string>();

  for (const id of DECK) {
    const a = cardSvg(id, { theme: 'classic', width: 120 });
    const b = cardSvg(id, { theme: 'classic', width: 120 });
    assert.equal(a, b);
    seenClassic.add(a);
    seenFourColour.add(cardSvg(id, { theme: 'four-colour' }));
  }

  assert.equal(seenClassic.size, 52);
  assert.equal(seenFourColour.size, 52);
  assert.equal(cardBackSvg({ width: 90 }), cardBackSvg({ width: 90 }));
});

test('12. Width option sets width and height = width * 1.4 accurately', () => {
  const c60 = cardSvg('QH', { width: 60 });
  assert.ok(c60.includes('width="60"'));
  assert.ok(c60.includes('height="84"'));
  assert.ok(c60.includes('viewBox="0 0 250 350"'));

  const b60 = cardBackSvg({ width: 60 });
  assert.ok(b60.includes('width="60"'));
  assert.ok(b60.includes('height="84"'));

  const cDefault = cardSvg('AS');
  assert.ok(cDefault.includes('width="250"'));
  assert.ok(cDefault.includes('height="350"'));
});

test('13. SUIT_PATHS use only valid SVG path commands and numbers within 0..100', () => {
  const validCmd = /^[MLHVCSQTAZ]$/i;
  for (const suit of SUITS) {
    const d = SUIT_PATHS[suit];
    assert.ok(d.length > 20, `SUIT_PATHS[${suit}] should not be empty`);
    const tokens = d.trim().split(/[\s,]+/);
    for (const token of tokens) {
      if (validCmd.test(token)) continue;
      const num = Number(token);
      assert.ok(Number.isFinite(num), `Invalid path token "${token}" in SUIT_PATHS[${suit}]`);
      assert.ok(num >= 0 && num <= 100, `Coordinate ${num} out of 0..100 box in SUIT_PATHS[${suit}]`);
    }
  }
});

test('14. Corner indices use system-ui bold middle-anchored text at least 16% of card width tall', () => {
  for (const id of DECK) {
    const svg = cardSvg(id);
    assert.ok(svg.includes('font-family="system-ui, sans-serif"'));
    assert.ok(svg.includes('font-weight="700"'));
    assert.ok(svg.includes('text-anchor="middle"'));
    const fontMatch = /font-size="(\d+(?:\.\d+)?)"/.exec(svg);
    assert.ok(fontMatch, `Missing font-size on ${id}`);
    const fontSize = Number(fontMatch[1]);
    assert.ok(fontSize >= CARD_W * 0.16, `Font size ${fontSize} is less than 16% of CARD_W`);
  }
});

test('15. Card back and court cards include required palette, borders, and 180-degree symmetry', () => {
  const back = cardBackSvg();
  assert.ok(back.includes('#111827'));
  assert.ok(back.includes('#38bdf8'));
  assert.ok(back.includes('#c9a227'));
  assert.ok(back.includes('stroke-width="8"'));
  assert.ok(back.includes('transform="rotate(180 125 175)"'));

  for (const rank of ['J', 'Q', 'K'] as const) {
    for (const suit of SUITS) {
      const court = cardSvg(`${rank}${suit}` as CardId);
      assert.ok(court.includes('#c9a227'), `Court card ${rank}${suit} missing gold accent`);
      assert.ok(court.includes('#3b5b8c'), `Court card ${rank}${suit} missing muted blue accent`);
      assert.ok(court.includes('transform="rotate(180 125 175)"'));
    }
  }
});