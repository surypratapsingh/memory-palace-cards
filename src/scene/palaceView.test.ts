import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// createPalaceView needs WebGL, so node tests check the wiring in the source.
const palaceView = readFileSync(new URL('./palaceView.ts', import.meta.url), 'utf8');

test('palaceView creates a real free-walk controller', () => {
  assert.match(palaceView, /const freeWalk = createFreeWalk\(\);/);
  assert.doesNotMatch(palaceView, /const freeWalk\s*=\s*null/);
});
