import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSettings, applySettings, GLIDE_OPTIONS } from '../settings.ts';
import type { Settings } from '../types.ts';

const DEFAULTS: Settings = {
  glideMs: 600,
  sound: false,
  colorSafe: false,
  captions: true,
};

test('redteam: sanitizeSettings rejects arrays and non-plain objects', () => {
  const badInputs = [
    [0, 300, 600, 1000],
    ['glideMs', 600],
    new Date(),
    new Uint8Array([1, 2, 3]),
    /glideMs=600/,
    () => ({ glideMs: 0 }),
    true,
    false,
    '{"glideMs": 300}',
    12345,
    Symbol('settings'),
  ];

  for (const input of badInputs) {
    const result = sanitizeSettings(input);
    assert.deepEqual(result, DEFAULTS, `Expected defaults for input ${String(input)}`);
  }
});

test('redteam: sanitizeSettings ignores prototype-inherited properties and __proto__ injection', () => {
  // Prototype inheritance: none of these are own properties
  const proto = { glideMs: 0, sound: true, colorSafe: true, captions: false };
  const inherited = Object.create(proto);
  assert.deepEqual(sanitizeSettings(inherited), DEFAULTS);

  // Partial own properties: only own properties should be read
  inherited.glideMs = 300;
  const partial = sanitizeSettings(inherited);
  assert.equal(partial.glideMs, 300);
  assert.equal(partial.sound, DEFAULTS.sound);
  assert.equal(partial.colorSafe, DEFAULTS.colorSafe);
  assert.equal(partial.captions, DEFAULTS.captions);

  // Prototype pollution attempt via JSON parsing
  const polluted = JSON.parse('{"__proto__":{"sound":true,"glideMs":0},"colorSafe":true}');
  const safe = sanitizeSettings(polluted);
  assert.equal(safe.colorSafe, true);
  assert.equal(safe.sound, false);
  assert.equal(safe.glideMs, 600);
});

test('redteam: sanitizeSettings rejects huge numbers, floats, NaN, and negative glideMs', () => {
  const invalidGlide = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER,
    1e20,
    -600,
    -1,
    450,
    300.0001,
    599,
    1001,
    '600',
    '0',
    null,
    undefined,
  ];

  for (const val of invalidGlide) {
    const res = sanitizeSettings({ glideMs: val });
    assert.equal(res.glideMs, DEFAULTS.glideMs, `Expected default glideMs for ${String(val)}`);
  }

  // Exactly valid GLIDE_OPTIONS must be preserved
  for (const opt of GLIDE_OPTIONS) {
    const res = sanitizeSettings({ glideMs: opt });
    assert.equal(res.glideMs, opt);
  }
});

test('redteam: sanitizeSettings strips unexpected/malicious extra keys and never mutates input', () => {
  const hostileInput = Object.freeze({
    glideMs: 300,
    sound: true,
    colorSafe: false,
    captions: false,
    isAdmin: true,
    authToken: 'secret_12345',
    maliciousScript: '<script>alert("xss")</script>',
    extraNested: { foo: 'bar' },
  });

  const cleaned = sanitizeSettings(hostileInput);

  // Verify only the 4 contract keys exist
  assert.deepEqual(Object.keys(cleaned).sort(), ['captions', 'colorSafe', 'glideMs', 'sound']);
  assert.equal(cleaned.glideMs, 300);
  assert.equal(cleaned.sound, true);
  assert.equal(cleaned.colorSafe, false);
  assert.equal(cleaned.captions, false);

  // Verify input was not mutated
  assert.notEqual(cleaned, hostileInput);
  assert.ok(!('isAdmin' in cleaned));
  assert.ok(!('authToken' in cleaned));
  assert.ok(!('maliciousScript' in cleaned));
});

test('redteam: sanitizeSettings resists type coercion on boolean options', () => {
  const coercionAttacks = [
    // Truthy non-booleans must not become true
    { sound: 'true', colorSafe: 1, captions: 'yes' },
    { sound: {}, colorSafe: [], captions: () => true },
    { sound: '1', colorSafe: 'on', captions: 123 },
    // Falsy non-booleans must not override default captions (true) with false
    { sound: 0, colorSafe: '', captions: 0 },
    { sound: null, colorSafe: undefined, captions: null },
    { sound: Number.NaN, colorSafe: false, captions: '' },
  ];

  for (const attack of coercionAttacks) {
    const res = sanitizeSettings(attack);
    assert.equal(typeof res.sound, 'boolean');
    assert.equal(typeof res.colorSafe, 'boolean');
    assert.equal(typeof res.captions, 'boolean');
  }

  // Check specific fallback behavior
  const falsyCaptions = sanitizeSettings({ captions: 0, sound: 1 });
  assert.equal(falsyCaptions.captions, DEFAULTS.captions); // 0 is not boolean, falls back to true
  assert.equal(falsyCaptions.sound, DEFAULTS.sound); // 1 is not boolean, falls back to false
});

test('redteam: applySettings correctly controls root classList without leaking or throwing', () => {
  const classes = new Set<string>();
  const fakeRoot = {
    classList: {
      toggle(name: string, on: boolean) {
        if (on) classes.add(name);
        else classes.delete(name);
      },
    },
  };

  applySettings({ ...DEFAULTS, colorSafe: true }, fakeRoot);
  assert.ok(classes.has('color-safe'));

  applySettings({ ...DEFAULTS, colorSafe: false }, fakeRoot);
  assert.ok(!classes.has('color-safe'));

  // Idempotent calls
  applySettings({ ...DEFAULTS, colorSafe: true }, fakeRoot);
  applySettings({ ...DEFAULTS, colorSafe: true }, fakeRoot);
  assert.ok(classes.has('color-safe'));
});
