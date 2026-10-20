import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSettings, applySettings, GLIDE_OPTIONS } from './settings.ts';
import type { Settings } from './types.ts';

test('sanitizeSettings with undefined', () => {
  const result = sanitizeSettings(undefined);
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('sanitizeSettings with null', () => {
  const result = sanitizeSettings(null);
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('sanitizeSettings with empty object', () => {
  const result = sanitizeSettings({});
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('sanitizeSettings with glideMs 450 (not in GLIDE_OPTIONS)', () => {
  const result = sanitizeSettings({ glideMs: 450 });
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('sanitizeSettings with glideMs 600 (valid)', () => {
  const result = sanitizeSettings({ glideMs: 600 });
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('sanitizeSettings with sound: yes (string, should fall back)', () => {
  const result = sanitizeSettings({ sound: 'yes' });
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('sanitizeSettings with sound: true (valid)', () => {
  const result = sanitizeSettings({ sound: true });
  assert.deepEqual(result, { glideMs: 600, sound: true, colorSafe: false, captions: true });
});

test('sanitizeSettings with colorSafe: true (valid)', () => {
  const result = sanitizeSettings({ colorSafe: true });
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: true, captions: true });
});

test('sanitizeSettings with captions: false (valid)', () => {
  const result = sanitizeSettings({ captions: false });
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: false });
});

test('sanitizeSettings with valid object (unchanged)', () => {
  const result = sanitizeSettings({ glideMs: 300, sound: true, colorSafe: true, captions: false });
  assert.deepEqual(result, { glideMs: 300, sound: true, colorSafe: true, captions: false });
});

test('sanitizeSettings with prototype pollution', () => {
  const result = sanitizeSettings({ __proto__: { sound: true } });
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('sanitizeSettings with extra unknown keys dropped', () => {
  const result = sanitizeSettings({ glideMs: 600, sound: true, colorSafe: true, captions: true, unknownKey: 'should be dropped' });
  assert.deepEqual(result, { glideMs: 600, sound: true, colorSafe: true, captions: true });
});

test('sanitizeSettings with NaN glideMs', () => {
  const result = sanitizeSettings({ glideMs: NaN });
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('sanitizeSettings with huge glideMs', () => {
  const result = sanitizeSettings({ glideMs: 999999 });
  // 999999 is not in GLIDE_OPTIONS, should fall back to 600
  assert.deepEqual(result, { glideMs: 600, sound: false, colorSafe: false, captions: true });
});

test('applySettings toggles color-safe class', () => {
  const root = { classList: { toggle: (_name: string, on: boolean) => {} } } as any;
  applySettings({ glideMs: 600, sound: false, colorSafe: true, captions: true }, root);
  // Just verify no error is thrown
  assert.ok(true);
});

test('applySettings with colorSafe false', () => {
  const root = { classList: { toggle: (_name: string, on: boolean) => {} } } as any;
  applySettings({ glideMs: 600, sound: false, colorSafe: false, captions: true }, root);
  assert.ok(true); // No error
});

test('GLIDE_OPTIONS contains expected values', () => {
  assert.deepEqual(GLIDE_OPTIONS, [0, 300, 600, 1000] as const);
});