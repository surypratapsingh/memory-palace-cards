// Camera motion easing and angle interpolation.
// Spec: MATHS.md section 7.

/**
 * Standard cubic ease in-out curve on [0, 1].
 * Formula: t < 0.5 ? 4t³ : 1 - (-2t + 2)³ / 2.
 * Continuous C¹, slopes 0 at t=0 and t=1, slope 3 at t=0.5.
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/**
 * Linear interpolation between angles taking the shortest arc.
 * d = atan2(sin(b - a), cos(b - a)) in [-pi, pi].
 */
export function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}
