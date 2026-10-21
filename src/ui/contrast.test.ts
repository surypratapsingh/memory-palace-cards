import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

function token(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`--${escaped}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert.ok(match, `CSS token --${name} must be defined as a six-digit hex colour`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('required CSS token pairs meet WCAG AA contrast', () => {
  const pairs = [
    ['text', 'bg'],
    ['text', 'panel'],
    ['muted', 'panel'],
    ['accent', 'panel'],
    ['danger', 'panel'],
  ] as const;
  for (const [foreground, background] of pairs) {
    const ratio = contrast(token(foreground), token(background));
    assert.ok(ratio >= 4.5, `--${foreground} on --${background} has contrast ${ratio.toFixed(2)}, expected >= 4.5`);
  }
});

test('#dd1111 on white meets WCAG AA contrast', () => {
  assert.ok(contrast('#dd1111', '#ffffff') >= 4.5);
});
