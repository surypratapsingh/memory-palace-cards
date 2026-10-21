import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applySettings, GLIDE_OPTIONS, sanitizeSettings } from './settings.ts';
import type { Settings } from './types.ts';

const DEFAULTS: Settings = { glideMs: 600, sound: false, colorSafe: false, captions: true };

test('sanitizeSettings falls back for missing, null, arrays, and primitives', () => {
  for (const input of [undefined, null, [], 'settings', 4, true]) {
    assert.deepEqual(sanitizeSettings(input), DEFAULTS);
  }
});

test('sanitizeSettings repairs invalid values, preserves valid fields, and drops extras', () => {
  assert.deepEqual(sanitizeSettings({}), DEFAULTS);
  assert.deepEqual(sanitizeSettings({ glideMs: 450 }), DEFAULTS);
  assert.deepEqual(sanitizeSettings({ glideMs: '600' }), DEFAULTS);
  assert.deepEqual(sanitizeSettings({ glideMs: Number.NaN }), DEFAULTS);
  assert.deepEqual(sanitizeSettings({ glideMs: Number.POSITIVE_INFINITY }), DEFAULTS);
  assert.deepEqual(sanitizeSettings({ sound: 'yes' }), DEFAULTS);
  assert.deepEqual(sanitizeSettings({ glideMs: 300, sound: true, colorSafe: true, captions: false, extra: 1 }), {
    glideMs: 300, sound: true, colorSafe: true, captions: false,
  });
});

test('sanitizeSettings accepts each glide option and its default valid values', () => {
  assert.deepEqual(GLIDE_OPTIONS, [0, 300, 600, 1000]);
  for (const glideMs of GLIDE_OPTIONS) assert.equal(sanitizeSettings({ glideMs }).glideMs, glideMs);
  assert.deepEqual(sanitizeSettings({ glideMs: 1000, sound: false, colorSafe: false, captions: true }), { ...DEFAULTS, glideMs: 1000 });
});

test('sanitizeSettings uses own properties only and never mutates the input', () => {
  const source = Object.assign(Object.create({ glideMs: 0, sound: true }), {
    colorSafe: true,
    extra: 'ignored',
  });
  const snapshot = { colorSafe: source.colorSafe, extra: source.extra };
  assert.deepEqual(sanitizeSettings(source), { ...DEFAULTS, colorSafe: true });
  assert.deepEqual({ colorSafe: source.colorSafe, extra: source.extra }, snapshot);

  const jsonWithProto = JSON.parse('{"__proto__":{"sound":true},"glideMs":300}');
  assert.deepEqual(sanitizeSettings(jsonWithProto), { ...DEFAULTS, glideMs: 300 });
});

test('sanitizeSettings tolerates a throwing prototype getter', () => {
  const hostile = Object.create({ get sound() { throw new Error('getter should not be read'); } });
  Object.defineProperty(hostile, 'glideMs', { value: 0, enumerable: true });
  assert.deepEqual(sanitizeSettings(hostile), { ...DEFAULTS, glideMs: 0 });
});

test('applySettings toggles color-safe and reduce-motion with the current values', () => {
  const calls: [string, boolean][] = [];
  const root = { classList: { toggle: (name: string, enabled: boolean) => calls.push([name, enabled]) } };
  applySettings({ ...DEFAULTS, colorSafe: true, glideMs: 0 }, root);
  applySettings({ ...DEFAULTS, glideMs: 600 }, root);
  assert.deepEqual(calls, [['color-safe', true], ['reduce-motion', true], ['color-safe', false], ['reduce-motion', false]]);
});
