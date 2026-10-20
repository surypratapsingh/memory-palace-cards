import test from 'node:test';
import assert from 'node:assert/strict';
import { sparklinePath } from './sparkline.ts';

test('sparklinePath: 0 values returns empty string', () => {
  assert.equal(sparklinePath([], 100, 40), '');
  assert.equal(sparklinePath([] as number[], 0, 0), '');
});

test('sparklinePath: 1 value returns dot at the middle', () => {
  // Value 0.5 with w=100, h=40: x = 50, y = 40 * (1 - 0.5) = 20
  const d = sparklinePath([0.5], 100, 40);
  assert.equal(d, 'M 50 20 L 50 20');

  // Value 1 with w=100, h=50: x = 50, y = 0
  assert.equal(sparklinePath([1], 100, 50), 'M 50 0 L 50 0');

  // Value 0 with w=100, h=50: x = 50, y = 50
  assert.equal(sparklinePath([0], 100, 50), 'M 50 50 L 50 50');
});

test('sparklinePath: 2 values connects start to end', () => {
  // Values [0, 1] with w=100, h=50
  // Index 0: x = 0, y = 50 (value 0 -> bottom)
  // Index 1: x = 100, y = 0 (value 1 -> top)
  const d = sparklinePath([0, 1], 100, 50);
  assert.equal(d, 'M 0 50 L 100 0');

  // Values [1, 0] with w=80, h=40
  assert.equal(sparklinePath([1, 0], 80, 40), 'M 0 0 L 80 40');
});

test('sparklinePath: 20 values evenly spaced across width', () => {
  const values = Array.from({ length: 20 }, (_, i) => i / 19);
  const w = 190;
  const h = 50;
  const d = sparklinePath(values, w, h);

  assert.ok(d.startsWith('M 0 50'));
  assert.ok(d.endsWith('L 190 0'));

  // Check segment count: M + 19 'L' commands = 20 points
  const points = d.replace(/^M /, '').split(' L ');
  assert.equal(points.length, 20);

  // Check even spacing: each x should be i * 10
  points.forEach((pt, i) => {
    const [x, y] = pt.split(' ').map(Number);
    assert.equal(x, i * 10);
    const expectedY = Number((h * (1 - i / 19)).toFixed(4));
    assert.equal(y, expectedY);
  });
});

test('sparklinePath: handles values 0 and 1 accurately', () => {
  const d = sparklinePath([0, 0.5, 1], 100, 40);
  // Value 0 -> y=40, Value 0.5 -> y=20, Value 1 -> y=0
  assert.equal(d, 'M 0 40 L 50 20 L 100 0');
});

test('sparklinePath: clamps values outside [0, 1] and never outputs NaN', () => {
  const d = sparklinePath([-0.5, 1.5, NaN, 0.8], 120, 60);
  assert.ok(!d.includes('NaN'), 'must never output NaN');

  const points = d.replace(/^M /, '').split(' L ');
  assert.equal(points.length, 4);

  // -0.5 clamped to 0 -> y = 60
  assert.equal(points[0], '0 60');
  // 1.5 clamped to 1 -> y = 0
  assert.equal(points[1], '40 0');
  // NaN clamped to 0 -> y = 60
  assert.equal(points[2], '80 60');
  // 0.8 -> y = 60 * 0.2 = 12
  assert.equal(points[3], '120 12');
});

test('sparklinePath: handles w = 0 and large dataset (1000 values)', () => {
  // w = 0
  const dZeroW = sparklinePath([0.2, 0.5, 0.8], 0, 50);
  assert.ok(!dZeroW.includes('NaN'));
  assert.equal(dZeroW, 'M 0 40 L 0 25 L 0 10');

  // 1000 values
  const large = Array.from({ length: 1000 }, () => 0.7);
  const dLarge = sparklinePath(large, 500, 100);
  assert.ok(!dLarge.includes('NaN'));
  const points = dLarge.replace(/^M /, '').split(' L ');
  assert.equal(points.length, 1000);
});
