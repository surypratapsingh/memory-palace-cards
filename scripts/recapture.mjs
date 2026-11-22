/** MATHS.md section 11: Chapman capture-recapture. n1, n2 = bugs each tester found, m = found by both. */
export function chapman(n1, n2, m) {
  const total = ((n1 + 1) * (n2 + 1)) / (m + 1) - 1;
  const found = n1 + n2 - m;
  const hidden = total - found;
  return { total, found, hidden, runAnotherRound: hidden >= 0.25 * found };
}
