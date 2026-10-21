import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sparklinePath } from '../ui/sparkline.ts';

function points(path: string): [number, number][] {
  if (!path) return [];
  return path.replace(/^M /, '').split(' L ').map((point) => {
    const [x, y] = point.split(' ').map(Number);
    return [x, y] as [number, number];
  });
}

test('red-team: NaN and infinities never leak into SVG coordinates', () => {
  const path = sparklinePath([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY], 90, 30);
  assert.doesNotMatch(path, /NaN|Infinity/);
  assert.deepEqual(points(path), [[0, 30], [45, 30], [90, 30]]);
});

test('red-team: values beyond the unit interval clamp exactly to endpoint rows', () => {
  const path = sparklinePath([-1e300, 1e300], 80, 20);
  assert.deepEqual(points(path), [[0, 20], [80, 0]]);
});

test('red-team: one point stays centered with correct endpoints for value 0 and 1', () => {
  assert.equal(sparklinePath([0], 17, 9), 'M 8.5 9 L 8.5 9');
  assert.equal(sparklinePath([1], 17, 9), 'M 8.5 0 L 8.5 0');
});

test('red-team: zero width and zero height remain finite for multiple points', () => {
  assert.equal(sparklinePath([0, 0.5, 1], 0, 0), 'M 0 0 L 0 0 L 0 0');
  assert.equal(sparklinePath([0, 1], 100, 0), 'M 0 0 L 100 0');
});

test('red-team: negative or non-finite dimensions are safely normalized', () => {
  assert.equal(sparklinePath([0, 1], -20, 10), 'M 0 10 L 0 0');
  assert.equal(sparklinePath([0, 1], Number.NaN, Number.POSITIVE_INFINITY), 'M 0 0 L 0 0');
});

test('red-team: 1000 values keep point count and finite monotonic x coordinates', () => {
  const input = Array.from({ length: 1000 }, (_, index) => (index % 101) / 100);
  const output = points(sparklinePath(input, 500, 70));
  assert.equal(output.length, 1000);
  assert.equal(output[0][0], 0);
  assert.equal(output[999][0], 500);
  for (let index = 0; index < output.length; index++) {
    assert.ok(Number.isFinite(output[index][0]) && Number.isFinite(output[index][1]));
    if (index > 0) assert.ok(output[index][0] >= output[index - 1][0]);
  }
});

test('red-team: non-number runtime values normalize to finite coordinates', () => {
  const malformed = [null, '0.5', false] as unknown as number[];
  const output = points(sparklinePath(malformed, 60, 40));
  assert.equal(output.length, 3);
  assert.ok(output.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
});

test('red-team finding: sparse array holes should yield valid SVG path coordinates', () => {
  const sparse: number[] = [];
  sparse.length = 3;
  sparse[1] = 0.5;
  assert.deepEqual(points(sparklinePath(sparse, 60, 40)), [[0, 40], [30, 20], [60, 40]]);
});
