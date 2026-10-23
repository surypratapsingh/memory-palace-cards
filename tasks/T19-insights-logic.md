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
