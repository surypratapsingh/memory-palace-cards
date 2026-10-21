import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easeInOutCubic, lerpAngle } from './ease.ts';

test('easeInOutCubic: endpoint and midpoint values', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(0.5), 0.5);
  assert.equal(easeInOutCubic(1), 1);
});

test('easeInOutCubic: strictly monotone on [0, 1]', () => {
  let prev = -1;
  for (let i = 0; i <= 1000; i++) {
    const t = i / 1000;
    const v = easeInOutCubic(t);
    assert.ok(v >= prev, `Monotonicity violated at t=${t}: ${v} < ${prev}`);
    prev = v;
  }
});

test('easeInOutCubic: point symmetric e(1 - t) = 1 - e(t)', () => {
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const left = easeInOutCubic(1 - t);
    const right = 1 - easeInOutCubic(t);
    assert.ok(
      Math.abs(left - right) < 1e-9,
      `Symmetry violated at t=${t}: ${left} vs ${right}`,
    );
  }
});

test('easeInOutCubic: slopes with finite differences h = 1e-6', () => {
  const h = 1e-6;

  // Slope at t = 0 is 0
  const slope0 = (easeInOutCubic(h) - easeInOutCubic(0)) / h;
  assert.ok(
    Math.abs(slope0 - 0) < 1e-4,
    `Slope at t=0 should be 0, got ${slope0}`,
  );

  // Slope at t = 1 is 0
  const slope1 = (easeInOutCubic(1) - easeInOutCubic(1 - h)) / h;
  assert.ok(
    Math.abs(slope1 - 0) < 1e-4,
    `Slope at t=1 should be 0, got ${slope1}`,
  );

  // Slope at t = 0.5 from left is 3
  const slopeHalfLeft = (easeInOutCubic(0.5) - easeInOutCubic(0.5 - h)) / h;
  assert.ok(
    Math.abs(slopeHalfLeft - 3) < 1e-4,
    `Slope at t=0.5 left should be 3, got ${slopeHalfLeft}`,
  );

  // Slope at t = 0.5 from right is 3
  const slopeHalfRight = (easeInOutCubic(0.5 + h) - easeInOutCubic(0.5)) / h;
  assert.ok(
    Math.abs(slopeHalfRight - 3) < 1e-4,
    `Slope at t=0.5 right should be 3, got ${slopeHalfRight}`,
  );
});

test('lerpAngle: turns through shortest arc (170 deg to -170 deg)', () => {
  const degToRad = (deg: number) => (deg * Math.PI) / 180;
  const a = degToRad(170);
  const b = degToRad(-170);

  // At t=0, angle is 170 deg
  assert.ok(Math.abs(lerpAngle(a, b, 0) - a) < 1e-9);

  // At t=0.5, midpoint is 180 deg
  const mid = lerpAngle(a, b, 0.5);
  assert.ok(Math.abs(mid - Math.PI) < 1e-9);

  // At t=1, angle is 190 deg (= -170 deg modulo 2pi)
  const end = lerpAngle(a, b, 1.0);
  const diff = Math.atan2(Math.sin(end - b), Math.cos(end - b));
  assert.ok(Math.abs(diff) < 1e-9);
});

test('lerpAngle: adversarial inputs and boundary conditions', () => {
  // a = b
  assert.equal(lerpAngle(1.23, 1.23, 0.4), 1.23);

  // t = 0 and t = 1
  assert.equal(lerpAngle(0.5, 2.5, 0), 0.5);
  const end = lerpAngle(0.5, 2.5, 1);
  assert.ok(Math.abs(end - 2.5) < 1e-9);

  // |b - a| = Math.PI
  const halfPi = lerpAngle(0, Math.PI, 0.5);
  assert.ok(Math.abs(halfPi - Math.PI / 2) < 1e-9);

  // Angles beyond +/- 2pi
  const largeA = 5 * Math.PI; // Equivalent to pi
  const largeB = 5 * Math.PI + 0.2;
  const lerped = lerpAngle(largeA, largeB, 0.5);
  assert.ok(Math.abs(lerped - (largeA + 0.1)) < 1e-9);
});
