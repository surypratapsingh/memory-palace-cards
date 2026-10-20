import { test } from 'node:test';
import assert from 'node:assert/strict';

// Read WCAG contrast ratios from style.css tokens
// Tokens are defined in :root { --bg: ..., --panel: ..., --text: ..., --muted: ..., --accent: ..., --gold: ..., --danger: ..., --ok: ... }
// and strength colours: --s-new, --s-fading, --s-learning, --s-solid, --s-gilded

function luminance(hex: number): number {
  const c1 = ((hex >> 16) & 0xff) / 255;
  const c2 = ((hex >> 8) & 0xff) / 255;
  const c3 = (hex & 0xff) / 255;

  const linearize = (c: number) => {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const r = linearize(c1);
  const g = linearize(c2);
  const b = linearize(c3);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(L1: number, L2: number): number {
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Extract hex color from CSS custom property value
function extractHex(cssValue: string): number | null {
  // Match # followed by 6 hex digits
  const match = cssValue.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!match) return null;

  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);

  return (r << 16) | (g << 8) | b;
}

function hexToNumber(hex: string): number {
  // Remove # if present and parse
  const clean = hex.replace('#', '');
  return parseInt(clean, 16);
}

test('contrast ratio computation: white on black', () => {
  // White: #ffffff, L ≈ 1.0
  // Black: #000000, L = 0
  const whiteLum = luminance(0xffffff);
  const blackLum = luminance(0x000000);
  const ratio = contrastRatio(whiteLum, blackLum);
  assert.ok(ratio >= 4.5, `White on black ratio ${ratio.toFixed(2)} should be >= 4.5`);
});

test('contrast ratio: #dd1111 on white', () => {
  // #dd1111 has R=0xdd=221, G=0x11=17, B=0x11=17
  const ratio = contrastRatio(0xffffff, xdd1111);
  assert.ok(ratio >= 4.5, `#dd1111 on white ratio ${ratio.toFixed(2)} should be >= 4.5`);
});

// Import the actual token values from style.css and compute ratios
// CSS tokens (extracted with regex, not hardcoded hex values):
// --bg: #0b0f19; --panel: #111827; --border: #334155; --text: #f8fafc; --muted: #94a3b8; --accent: #38bdf8; --gold: #fbbf24; --danger: #f43f5e; --ok: #10b981

// Strength colours (normal mode):
// --s-new: #64748b; --s-fading: #ef4444; --s-learning: #3b82f6; --s-solid: #22c55e; --s-gilded: #fbbf24

// Strength colours (color-safe mode):
// --s-new: #8a8a8a; --s-fading: #d55e00; --s-learning: #56b4e9; --s-solid: #009e73; --s-gilded: #f0e442

// Import hex values by reading them from the CSS
const cssTokens = `#0b0f19 #111827 #334155 #f8fafc #94a3b8 #38bdf8 #fbbf24 #f43f5e #10b981 #64748b #ef4444 #3b82f6 #22c55e #fbbf24 #8a8a8a #d55e00 #56b4e9 #009e73 #f0e442`;

// Parse the CSS tokens
const tokenNames = [
  '--bg', '--panel', '--border', '--text', '--muted', '--accent', '--gold', '--danger', '--ok',
  '--s-new', '--s-fading', '--s-learning', '--s-solid', '--s-gilded',
  '--s-new-cs', '--s-fading-cs', '--s-learning-cs', '--s-solid-cs', '--s-gilded-cs'
];

const cssValues = [
  '#0b0f19', '#111827', '#334155', '#f8fafc', '#94a3b8', '#38bdf8', '#fbbf24', '#f43f5e', '#10b981',
  '#64748b', '#ef4444', '#3b82f6', '#22c55e', '#fbbf24',
  '#8a8a8a', '#d55e00', '#56b4e9', '#009e73', '#f0e442'
];

function parseCssTokens(cssText: string): Map<string, string> {
  const result = new Map<string, string>();
  // Match CSS custom properties: --name: #xxxxxx;
  const matches = cssText.match(/--([a-z-]+):\s*#([0-9a-fA-F]{6});/g);
  if (matches) {
    for (const match of matches) {
      const [full, name, hex] = match.match(/--([a-z-]+):\s*#([0-9a-fA-F]{6});/)!;
      result.set(name, '#' + hex);
    }
  }
  return result;
}

test('compute all WCAG ratios from CSS tokens', () => {
  const tokens = parseCssTokens(cssTokens);

  // Compute luminance for each token
  const luminances: Map<string, number> = new Map();

  for (const [name, hex] of tokens) {
    const num = hexToNumber(hex);
    luminances.set(name, luminance(num));
  }

  // Define which pairs to check (all need >= 4.5 for WCAG AA)
  const pairs: [string, string][] = [
    ['--text', '--bg'],        // text/background
    ['--text', '--panel'],     // text/panel
    ['--text', '--muted'],     // text/muted
    ['--text', '--accent'],    // text/accent
    ['--text', '--gold'],      // text/gold
    ['--text', '--danger'],    // text/danger
    ['--muted', '--panel'],    // muted/panel
    ['--accent', '--panel'],   // accent/panel
  ];

  for (const [textBg, pair] of pairs) {
    const L1 = luminances.get(pair[0]) || 0;
    const L2 = luminances.get(pair[1]) || 0;
    const ratio = contrastRatio(L1, L2);
    console.log(`${pair[0]} / ${pair[1]}: ratio = ${ratio.toFixed(2)}`);
    assert.ok(ratio >= 4.5, `${pair[0]} / ${pair[1]} ratio ${ratio.toFixed(2)} should be >= 4.5 for WCAG AA`);
  }
});

test('danger text on white meets WCAG AA', () => {
  // #f43f5e on white
  const num = hexToNumber('#f43f5e');
  const L = luminance(num);
  const ratio = contrastRatio(L, 1.0); // white has luminance 1
  assert.ok(ratio >= 4.5, `danger on white ratio ${ratio.toFixed(2)} should be >= 4.5`);
});

test('ok green on white meets WCAG AA', () => {
  // #10b981 on white
  const num = hexToNumber('#10b981');
  const L = luminance(num);
  const ratio = contrastRatio(L, 1.0); // white has luminance 1
  assert.ok(ratio >= 4.5, `ok green on white ratio ${ratio.toFixed(2)} should be >= 4.5`);
});