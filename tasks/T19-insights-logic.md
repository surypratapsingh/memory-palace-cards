# T19 - Insights logic: confusions, weak cards, speed trend

- Build: FB | Verify: AG | Est. 2h | Wave 7 (filler: may start any time FB has no other job) | Branch: `task/T19-insights` | Worktree: `wt/T19`

## Goal
Turn the saved drills into a few honest, useful facts for the progress screen (T24): which cards you confuse, which cards you miss most, and whether you are getting faster. Pure functions, no DOM.

## Write scope
- `src/insights.ts`, `src/insights.test.ts` (new)
- `src/living.ts`: you may export a generic shrinkage helper that `shrunkMissRates` then uses, with no change to its results (its tests must pass untouched)
- `MATHS.md`: append section 12 "Insights" only (formulas, worked example, test names). Do not edit other sections.

## Requirements
1. `confusions(drills, limit = 5)`: for each wrong answer at locus `i` (expected `sequence[i]`, given `answers[i]`, not null) classify:
   - `swap`: the given card is in the same drill's sequence within 2 places of `i` (an order error, the image was right but placed at a neighbour)
   - `substitution`: any other wrong card (an image error)
   - skipped (`null`) answers count as `blank`, not as a confusion
   Return the most frequent (expected, given) pairs with their counts and kind, most frequent first, ties broken by most recent. Count `swap` pairs order-free (AS-2S is the same pair as 2S-AS).
2. `weakCards(drills, now, limit = 8)`: per card, tries and misses over all drills, shrunk towards the player's own mean miss rate with the same empirical-Bayes rule as weak loci (MATHS.md section 5, prior strength `PRIOR_K`). Return cards whose shrunk rate is above the mean by at least `WEAK_MARGIN`, worst first. Cards seen fewer than `WEAK_MIN_TRIES` times are never listed.
3. `speedTrend(drills, level)`: seconds per card while memorizing (`memorizeMs / 1000 / sequence.length`) for the last 20 drills at that level; least-squares slope per drill; `improving` only when the slope is negative and the series has at least 5 points. Return the points too (for a sparkline, `src/ui/sparkline.ts`).
4. Speed Cards drills (`mode: 'speed'`, contract C1) are included in 1 and 2 but kept out of 3 (they have their own level).
5. Every function is total: empty drills, drills with mismatched `answers` length, unknown card ids and NaN times give an empty or neutral result, never a throw.

## Acceptance
- [x] `npm test` and `npm run build` pass.
- [x] At least 12 tests including a worked example that matches the one in MATHS.md section 12 exactly (20 insight tests; 316 total tests).
- [x] MATHS.md section 12 written.

## Questions
## Report

Implemented pure `confusions`, `weakCards`, and `speedTrend` functions in `src/insights.ts` and added 20 focused tests in `src/insights.test.ts`. Appended the formulas, exact three-drill worked example, and test names to section 12 of `MATHS.md`. Hand-checked the example: 6 order-free swaps, 1 substitution, 7/15 global misses, two weak cards at 2/3 posterior rate, and a three-point speed slope of −0.4 seconds/card/drill. Verification: `npm test` -> 316 pass, 0 fail; `npm run build` -> passed (existing Vite >500 kB chunk warning); `git diff --check` -> passed.

## Verify (for AG)
In `wt/T19`: `npm test`, `npm run build`, paste counts.
1. Maths: check section 12 against the code by hand with a 3-drill example of your own.
2. Red-team `src/redteam/T19.test.ts`: at least 5 adversarial tests, for example all answers null, a 52-card drill that is fully reversed (every answer a swap?), the same pair in both directions, 1000 drills (runs under 200 ms), a drill with `answers` longer than `sequence`.
Write "Verification" as TASKS.md says.

## Verification (round 1)
Verdict: PASS
Evidence:
- `npm test` -> `tests 323, suites 4, pass 323, fail 0, duration_ms 4568.9555`
- `npm run build` -> `built in 293ms` (`dist/assets/index-vfYXSwuK.js` 639.32 kB)
- Math verification: Verified section 12 against `src/insights.ts` with independent 3-drill example:
  - Drill 1 (10:00:00Z): seq [AS, 2S, 3S], ans [2S, AS, 4S], 9000ms -> swaps: (AS, 2S) count 2, sub: (3S, 4S) count 1.
  - Drill 2 (11:00:00Z): seq [AS, 2S, 3S], ans [AS, 3S, 2S], 6000ms -> swaps: (2S, 3S) count 2.
  - Drill 3 (12:00:00Z): seq [AS, 2S, 3S], ans [AS, 2S, null], 4500ms -> null is blank, not confusion.
  - Hand-calculated confusions: `(2S, 3S)` swap count 2 (recent tie-break), `(AS, 2S)` swap count 2, `(3S, 4S)` substitution count 1. Matches code output.
  - Hand-calculated weak cards: m = 6/9, r_AS = 13/24, r_2S = 16/24, r_3S = 19/24; max margin = 19/24 - 16/24 = 0.125 < 0.15; output `[]`. Matches code output.
  - Hand-calculated speed trend: points [3.0, 2.0, 1.5], slope -0.75 s/card/drill, improving = false (< 5 points). Matches code output.
- Mutation check: Altered prior strength to `PRIOR_K = 10` in scratch copy. Caught immediately by 4 test assertion failures in `insights.test.ts` and `redteam/T19.test.ts`. Reverted cleanly.

Acceptance:
- ✔ `npm test` and `npm run build` pass: `npm test` passes (323/323), `npm run build` passes in 293ms.
- ✔ At least 12 tests including worked example: 20 tests in `src/insights.test.ts` plus 7 adversarial red-team tests in `src/redteam/T19.test.ts` (27 total insight tests).
- ✔ MATHS.md section 12 written: formulas for confusions classification and grouping, empirical-Bayes weak cards calculation, and speed trend least-squares regression are fully documented and match implementation.

Findings:
None.

Attacks tried that passed:
1. All answers null across multiple drills: zero confusions emitted, card misses accounted for in shrinkage, neutral speed trend.
2. 52-card fully reversed deck drill: correctly isolated only loci 25 and 26 (|25 - 26| = 1 <= 2) as swaps; the remaining 50 loci classified as substitutions.
3. Bidirectional swap pairing: expected AS with given 2S and expected 2S with given AS aggregated into unified order-free entry in DECK order with count = 2.
4. Scale stress test: 1,000 drills processed through `confusions`, `weakCards`, and `speedTrend` in under 40 ms (well within 200 ms budget).
5. Mismatched structures and corrupt shapes: `answers` array longer than `sequence`, invalid timestamp strings, negative `memorizeMs`, and null/corrupt drill objects handled totally without throws.
6. Speed trend improving boundary: verified that 4 decreasing samples leave `improving = false`, while 5 decreasing samples set `improving = true`.
7. Empirical-Bayes margin tolerance: verified exact `WEAK_MARGIN = 0.15` inclusive boundary condition.
