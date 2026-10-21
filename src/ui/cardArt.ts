import type { CardId, Rank, Suit } from '../types.ts';

export type CardTheme = 'classic' | 'four-colour';

export interface Pip {
  x: number;
  y: number;
  flipped: boolean;
}

export const CARD_W = 250;
export const CARD_H = 350;

// Exported bounds for test verification of pip field vs. corner index separation.
export const TOP_LEFT_INDEX_BOX = { x0: 6, y0: 10, x1: 52, y1: 96 } as const;
export const BOTTOM_RIGHT_INDEX_BOX = { x0: 198, y0: 254, x1: 244, y1: 340 } as const;
export const PIP_FIELD_BOX = { x0: 56, y0: 36, x1: 194, y1: 314 } as const;

// Each path is authored in a 100x100 coordinate box centred around (50, 50).
// Spade and club stems have a wide base (28-30 units) so they remain visible at 12 px.
export const SUIT_PATHS: Readonly<Record<Suit, string>> = {
  S: 'M 50 6 C 60 22 90 44 90 62 C 90 76 78 84 66 84 C 59 84 55 80 53 75 L 64 94 L 36 94 L 47 75 C 45 80 41 84 34 84 C 22 84 10 76 10 62 C 10 44 40 22 50 6 Z',
  H: 'M 50 90 C 44 82 10 58 10 34 C 10 17 23 8 36 8 C 44 8 48 13 50 20 C 52 13 56 8 64 8 C 77 8 90 17 90 34 C 90 58 56 82 50 90 Z',
  D: 'M 50 6 C 58 24 74 41 90 50 C 74 59 58 76 50 94 C 42 76 26 59 10 50 C 26 41 42 24 50 6 Z',
  C: 'M 50 8 C 63 8 72 17 72 29 C 72 36 68 42 62 45 C 67 43 72 42 77 42 C 88 42 94 50 94 61 C 94 72 85 80 73 80 C 64 80 57 75 54 69 L 65 94 L 35 94 L 46 69 C 43 75 36 80 27 80 C 15 80 6 72 6 61 C 6 50 12 42 23 42 C 28 42 33 43 38 45 C 32 42 28 36 28 29 C 28 17 37 8 50 8 Z',
};

const RANK_NAMES: Readonly<Record<Rank, string>> = {
  A: 'Ace',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  T: 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
};

const SUIT_NAMES: Readonly<Record<Suit, string>> = {
  S: 'spades',
  H: 'hearts',
  D: 'diamonds',
  C: 'clubs',
};

export function suitColour(suit: Suit, theme: CardTheme): string {
  if (theme === 'four-colour') {
    switch (suit) {
      case 'S':
        return '#111827';
      case 'H':
        return '#c81e1e';
      case 'D':
        return '#1d4ed8';
      case 'C':
        return '#15803d';
    }
  }
  return suit === 'H' || suit === 'D' ? '#c81e1e' : '#111827';
}

function parseCardId(id: CardId): { rank: Rank; suit: Suit } {
  return {
    rank: id[0] as Rank,
    suit: id[1] as Suit,
  };
}

export function cardName(id: CardId): string {
  const { rank, suit } = parseCardId(id);
  return `${RANK_NAMES[rank]} of ${SUIT_NAMES[suit]}`;
}

function pip(x: number, y: number): Pip {
  return { x, y, flipped: y > 175 };
}

const PIP_LAYOUTS: Readonly<Record<Rank, readonly Pip[]>> = {
  A: [pip(125, 175)],
  '2': [pip(125, 62), pip(125, 288)],
  '3': [pip(125, 62), pip(125, 175), pip(125, 288)],
  '4': [pip(82, 62), pip(168, 62), pip(82, 288), pip(168, 288)],
  '5': [pip(82, 62), pip(168, 62), pip(125, 175), pip(82, 288), pip(168, 288)],
  '6': [
    pip(82, 62),
    pip(168, 62),
    pip(82, 175),
    pip(168, 175),
    pip(82, 288),
    pip(168, 288),
  ],
  '7': [
    pip(82, 62),
    pip(168, 62),
    pip(125, 118),
    pip(82, 175),
    pip(168, 175),
    pip(82, 288),
    pip(168, 288),
  ],
  '8': [
    pip(82, 62),
    pip(168, 62),
    pip(125, 118),
    pip(82, 175),
    pip(168, 175),
    pip(125, 232),
    pip(82, 288),
    pip(168, 288),
  ],
  '9': [
    pip(82, 62),
    pip(168, 62),
    pip(82, 137),
    pip(168, 137),
    pip(125, 175),
    pip(82, 213),
    pip(168, 213),
    pip(82, 288),
    pip(168, 288),
  ],
  T: [
    pip(82, 62),
    pip(168, 62),
    pip(125, 100),
    pip(82, 137),
    pip(168, 137),
    pip(82, 213),
    pip(168, 213),
    pip(125, 250),
    pip(82, 288),
    pip(168, 288),
  ],
  J: [],
  Q: [],
  K: [],
};

export function pipLayout(rank: Rank): readonly Pip[] {
  return PIP_LAYOUTS[rank];
}

function renderSuitGlyph(
  suit: Suit,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  flipped = false,
): string {
  const scale = Number((size / 100).toFixed(4));
  const half = Number((size / 2).toFixed(2));
  const tx = Number((cx - half).toFixed(2));
  const ty = Number((cy - half).toFixed(2));
  const transform = flipped
    ? `translate(${cx} ${cy}) rotate(180) translate(-${half} -${half}) scale(${scale})`
    : `translate(${tx} ${ty}) scale(${scale})`;
  return `<path d="${SUIT_PATHS[suit]}" fill="${fill}" transform="${transform}"/>`;
}

function renderCornerIndices(rank: Rank, suit: Suit, colour: string): string {
  const label = rank === 'T' ? '10' : rank;
  const spacingAttr = rank === 'T' ? ' letter-spacing="-3"' : '';
  const singleCorner =
    `<text x="29" y="48" fill="${colour}" font-family="system-ui, sans-serif" font-weight="700" font-size="42" text-anchor="middle"${spacingAttr}>${label}</text>` +
    renderSuitGlyph(suit, 29, 73, 26, colour, false);
  return `<g>${singleCorner}</g><g transform="rotate(180 125 175)">${singleCorner}</g>`;
}

function renderAceOfSpades(colour: string): string {
  return (
    `<g>` +
    `<polygon points="125,68 188,175 125,282 62,175" fill="#fffdf8" stroke="#c9a227" stroke-width="2.5"/>` +
    `<polygon points="125,82 176,175 125,268 74,175" fill="none" stroke="#3b5b8c" stroke-width="1.5"/>` +
    `<circle cx="125" cy="175" r="56" fill="none" stroke="#c9a227" stroke-width="2"/>` +
    `<circle cx="125" cy="175" r="48" fill="none" stroke="#3b5b8c" stroke-width="1.2"/>` +
    `<circle cx="125" cy="68" r="4" fill="#c9a227"/>` +
    `<circle cx="125" cy="282" r="4" fill="#c9a227"/>` +
    `<circle cx="62" cy="175" r="4" fill="#c9a227"/>` +
    `<circle cx="188" cy="175" r="4" fill="#c9a227"/>` +
    renderSuitGlyph('S', 125, 175, 92, colour, false) +
    `<circle cx="125" cy="172" r="10" fill="#c9a227"/>` +
    renderSuitGlyph('S', 125, 172, 13, '#fffdf8', false) +
    `</g>`
  );
}

function renderCourtHalf(rank: 'J' | 'Q' | 'K', suit: Suit, colour: string): string {
  const gold = '#c9a227';
  const blue = '#3b5b8c';
  const skin = '#fde68a';
  const dark = '#1f2937';

  // Suit emblem positioned near the figure inside the panel.
  const suitBadge =
    `<circle cx="76" cy="62" r="16" fill="#fffdf8" stroke="${gold}" stroke-width="1.5"/>` +
    renderSuitGlyph(suit, 76, 62, 22, colour, false);

  // Royal shoulders/torso terminating cleanly at y = 175.
  const torso =
    `<path d="M 74 175 L 82 126 C 84 116 96 112 125 112 C 154 112 166 116 168 126 L 176 175 Z" fill="${colour}"/>` +
    `<polygon points="103,112 125,175 147,112" fill="${blue}"/>` +
    `<polygon points="115,112 125,152 135,112" fill="${gold}"/>` +
    `<line x1="82" y1="126" x2="108" y2="175" stroke="${gold}" stroke-width="2.5"/>` +
    `<line x1="168" y1="126" x2="142" y2="175" stroke="${gold}" stroke-width="2.5"/>` +
    `<rect x="116" y="102" width="18" height="14" rx="4" fill="${skin}"/>`;

  if (rank === 'K') {
    // King: 5-pointed crown, full beard, and royal scepter.
    const scepter =
      `<line x1="170" y1="74" x2="156" y2="173" stroke="${gold}" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="170" cy="70" r="8" fill="${gold}" stroke="${dark}" stroke-width="1.2"/>` +
      `<polygon points="170,63 175,70 170,77 165,70" fill="${colour}"/>` +
      `<circle cx="160" cy="146" r="6" fill="${skin}"/>`;

    const headAndBeard =
      `<ellipse cx="125" cy="90" rx="20" ry="22" fill="${skin}"/>` +
      `<path d="M 105 88 C 105 112 115 122 125 122 C 135 122 145 112 145 88 L 141 96 L 125 99 L 109 96 Z" fill="${dark}"/>` +
      `<path d="M 114 96 Q 125 92 136 96 Q 125 102 114 96 Z" fill="${gold}"/>` +
      `<circle cx="117" cy="84" r="2.2" fill="${dark}"/>` +
      `<circle cx="133" cy="84" r="2.2" fill="${dark}"/>` +
      `<line x1="113" y1="79" x2="121" y2="80" stroke="${dark}" stroke-width="2"/>` +
      `<line x1="129" y1="80" x2="137" y2="79" stroke="${dark}" stroke-width="2"/>`;

    const crown5Point =
      `<polygon points="101,72 96,46 111,60 113,42 121,58 125,38 129,58 137,42 139,60 154,46 149,72" fill="${gold}" stroke="${dark}" stroke-width="1.2"/>` +
      `<rect x="101" y="68" width="48" height="6" rx="2" fill="${blue}"/>` +
      `<circle cx="96" cy="45" r="2.5" fill="${colour}"/>` +
      `<circle cx="113" cy="41" r="2.5" fill="${colour}"/>` +
      `<circle cx="125" cy="37" r="3" fill="${colour}"/>` +
      `<circle cx="137" cy="41" r="2.5" fill="${colour}"/>` +
      `<circle cx="154" cy="45" r="2.5" fill="${colour}"/>`;

    return `<g>${suitBadge}${torso}${scepter}${headAndBeard}${crown5Point}</g>`;
  }

  if (rank === 'Q') {
    // Queen: rounded crown with jewels, and a flower held in hand.
    const flower =
      `<path d="M 168 88 Q 164 130 156 172" fill="none" stroke="${blue}" stroke-width="3" stroke-linecap="round"/>` +
      `<ellipse cx="171" cy="118" rx="7" ry="3.5" transform="rotate(-28 171 118)" fill="${blue}"/>` +
      `<circle cx="168" cy="76" r="6" fill="${colour}"/>` +
      `<circle cx="161" cy="83" r="6" fill="${colour}"/>` +
      `<circle cx="175" cy="83" r="6" fill="${colour}"/>` +
      `<circle cx="164" cy="90" r="6" fill="${colour}"/>` +
      `<circle cx="172" cy="90" r="6" fill="${colour}"/>` +
      `<circle cx="168" cy="84" r="4.5" fill="${gold}"/>` +
      `<circle cx="160" cy="146" r="5.5" fill="${skin}"/>`;

    const hairAndFace =
      `<path d="M 101 114 C 99 88 105 68 125 68 C 145 68 151 88 149 114 Z" fill="${dark}"/>` +
      `<ellipse cx="125" cy="91" rx="17" ry="19" fill="${skin}"/>` +
      `<circle cx="118" cy="87" r="2" fill="${dark}"/>` +
      `<circle cx="132" cy="87" r="2" fill="${dark}"/>` +
      `<path d="M 120 99 Q 125 103 130 99" fill="none" stroke="${colour}" stroke-width="2.2" stroke-linecap="round"/>`;

    const roundedCrown =
      `<path d="M 103 72 C 101 50 114 40 125 40 C 136 40 149 50 147 72 Z" fill="${gold}" stroke="${dark}" stroke-width="1.2"/>` +
      `<path d="M 111 72 C 111 54 118 45 125 45 C 132 45 139 54 139 72" fill="none" stroke="${blue}" stroke-width="1.5"/>` +
      `<rect x="103" y="68" width="44" height="6" rx="3" fill="${blue}"/>` +
      `<polygon points="125,48 130,55 125,62 120,55" fill="${colour}"/>` +
      `<circle cx="112" cy="58" r="3.2" fill="${colour}"/>` +
      `<circle cx="138" cy="58" r="3.2" fill="${colour}"/>` +
      `<circle cx="125" cy="39" r="3.5" fill="${gold}"/>`;

    return `<g>${suitBadge}${torso}${flower}${hairAndFace}${roundedCrown}</g>`;
  }

  // Jack: cap with a feather, younger clean-shaven face, and halberd pike.
  const halberd =
    `<line x1="170" y1="54" x2="158" y2="173" stroke="${dark}" stroke-width="3.2" stroke-linecap="round"/>` +
    `<polygon points="170,42 177,60 170,56 163,60" fill="${gold}"/>` +
    `<polygon points="168,60 185,68 166,78" fill="${colour}"/>` +
    `<circle cx="161" cy="146" r="5.5" fill="${skin}"/>`;

  const youngFace =
    `<ellipse cx="125" cy="91" rx="17" ry="18" fill="${skin}"/>` +
    `<circle cx="118" cy="88" r="2.1" fill="${dark}"/>` +
    `<circle cx="132" cy="88" r="2.1" fill="${dark}"/>` +
    `<path d="M 120 99 Q 125 102 130 98" fill="none" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/>`;

  const capWithFeather =
    `<path d="M 98 75 C 98 54 114 48 132 50 C 146 52 152 62 148 75 Z" fill="${colour}" stroke="${dark}" stroke-width="1.2"/>` +
    `<path d="M 96 73 Q 125 65 152 74 Q 125 80 96 73 Z" fill="${blue}"/>` +
    `<path d="M 136 66 C 146 44 160 35 172 37 C 163 47 154 60 142 70 Z" fill="${gold}"/>` +
    `<circle cx="138" cy="68" r="3.5" fill="${gold}"/>`;

  return `<g>${suitBadge}${torso}${halberd}${youngFace}${capWithFeather}</g>`;
}

function renderCourtCardBody(rank: 'J' | 'Q' | 'K', suit: Suit, colour: string): string {
  const half = renderCourtHalf(rank, suit, colour);
  return (
    `<g>` +
    `<rect x="56" y="30" width="138" height="290" rx="8" ry="8" fill="#f7f3e8" stroke="#c9a227" stroke-width="2"/>` +
    `<rect x="60" y="34" width="130" height="282" rx="6" ry="6" fill="none" stroke="#3b5b8c" stroke-width="1"/>` +
    half +
    `<g transform="rotate(180 125 175)">${half}</g>` +
    `<line x1="56" y1="175" x2="194" y2="175" stroke="#c9a227" stroke-width="2"/>` +
    `<polygon points="125,170 130,175 125,180 120,175" fill="#3b5b8c" stroke="#c9a227" stroke-width="1"/>` +
    `</g>`
  );
}

export function cardSvg(
  id: CardId,
  opts?: { theme?: CardTheme; width?: number },
): string {
  const theme: CardTheme = opts?.theme ?? 'classic';
  const width = opts?.width ?? CARD_W;
  const height = Math.round(width * 1.4 * 1000) / 1000;
  const { rank, suit } = parseCardId(id);
  const colour = suitColour(suit, theme);
  const label = cardName(id);

  let centreContent = '';
  if (rank === 'J' || rank === 'Q' || rank === 'K') {
    centreContent = renderCourtCardBody(rank, suit, colour);
  } else if (id === 'AS') {
    centreContent = renderAceOfSpades(colour);
  } else if (rank === 'A') {
    centreContent = renderSuitGlyph(suit, 125, 175, 80, colour, false);
  } else {
    const pips = pipLayout(rank);
    centreContent = pips
      .map((p) => renderSuitGlyph(suit, p.x, p.y, 34, colour, p.flipped))
      .join('');
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" width="${width}" height="${height}" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<rect x="0.75" y="0.75" width="248.5" height="348.5" rx="14" ry="14" fill="#fffdf8" stroke="#d6d3d1" stroke-width="1.5"/>` +
    renderCornerIndices(rank, suit, colour) +
    `<g>${centreContent}</g>` +
    `</svg>`
  );
}

export function cardBackSvg(opts?: { width?: number }): string {
  const width = opts?.width ?? CARD_W;
  const height = Math.round(width * 1.4 * 1000) / 1000;

  // Symmetric half-ornament rotated 180° around (125, 175) guarantees exact 180° invariance.
  const symmetricHalf =
    `<polygon points="125,28 214,175 198,175 125,52 52,175 36,175" fill="#38bdf8" fill-opacity="0.15"/>` +
    `<polyline points="42,175 125,38 208,175" fill="none" stroke="#c9a227" stroke-width="2"/>` +
    `<polyline points="62,175 125,68 188,175" fill="none" stroke="#38bdf8" stroke-width="1.5"/>` +
    `<polygon points="125,78 140,115 125,105 110,115" fill="#c9a227"/>` +
    `<circle cx="32" cy="32" r="8" fill="none" stroke="#c9a227" stroke-width="2"/>` +
    `<circle cx="218" cy="32" r="8" fill="none" stroke="#c9a227" stroke-width="2"/>` +
    `<circle cx="32" cy="32" r="3" fill="#38bdf8"/>` +
    `<circle cx="218" cy="32" r="3" fill="#38bdf8"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Card back" width="${width}" height="${height}" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<rect x="0.75" y="0.75" width="248.5" height="348.5" rx="14" ry="14" fill="#ffffff" stroke="#d6d3d1" stroke-width="1.5"/>` +
    `<rect x="4" y="4" width="242" height="342" rx="11" ry="11" fill="#111827" stroke="#ffffff" stroke-width="8"/>` +
    `<rect x="16" y="16" width="218" height="318" rx="6" ry="6" fill="none" stroke="#c9a227" stroke-width="2"/>` +
    `<rect x="22" y="22" width="206" height="306" rx="4" ry="4" fill="none" stroke="#38bdf8" stroke-width="1.2"/>` +
    `<g>${symmetricHalf}</g>` +
    `<g transform="rotate(180 125 175)">${symmetricHalf}</g>` +
    `<circle cx="125" cy="175" r="38" fill="#111827" stroke="#c9a227" stroke-width="2.5"/>` +
    `<circle cx="125" cy="175" r="28" fill="none" stroke="#38bdf8" stroke-width="1.5"/>` +
    `<polygon points="125,132 135,165 168,175 135,185 125,218 115,185 82,175 115,165" fill="#c9a227"/>` +
    `<polygon points="125,148 131,169 152,175 131,181 125,202 119,181 98,175 119,169" fill="#38bdf8"/>` +
    `<circle cx="125" cy="175" r="6" fill="#111827" stroke="#c9a227" stroke-width="2"/>` +
    `</svg>`
  );
}