# T8a - Living-palace rules (pure maths)

- Build: FB | Verify: AG | Est. 1.5h | Wave 2 (no dependencies, can start any time) | Branch: `task/T8a-living-rules` | Worktree: `../mp-T8a`

## Goal
The rules that make the palace react to the player's memory, as pure tested functions. T8b (AG) wires them into the game later. Maths in `MATHS.md` sections 5 and 6.

## Write scope
- `src/living.ts`, `src/living.test.ts` (new)

`src/living.ts` may import only `./types.ts`.

## Functions (exact signatures)
```ts
import type { CardId, DrillResult, SaveData, SrsState } from './types.ts';

export const PRIOR_K = 5;
export const WEAK_MARGIN = 0.15;
export const WEAK_MIN_TRIES = 3;
export const WEAK_MAX = 5;
/** Posterior miss rate per locus, MATHS.md section 5. Keys are numbers even when locusStats keys are strings. Empty map when there are no tries. */
export function shrunkMissRates(stats: SaveData['locusStats']): Map<number, number>;
/** Weak locus indexes, MATHS.md section 5: at most WEAK_MAX, highest rate first, ties by lower index. */
export function weakLoci(stats: SaveData['locusStats']): number[];

export const GHOST_START = 0.35;
export const GHOST_HALF_LIFE_H = 2;
export const GHOST_MIN = 0.05;
export const GHOST_WARN = 0.15;
/** MATHS.md section 6. Returns 0 below GHOST_MIN and for an invalid date. */
export function ghostOpacity(drillAt: string, now: Date): number;
/** Ghosts of the latest drill (largest `at`, not the last array item): one per locus with the memorized card. Empty when opacity is 0. */
export function ghosts(drills: readonly DrillResult[], now: Date): { index: number; card: CardId; opacity: number }[];
/** True when the latest drill's ghost opacity is at least GHOST_WARN. */
export function ghostWarning(drills: readonly DrillResult[], now: Date): boolean;

/** Card images that keep failing: lapses >= 4. Sorted by lapses descending, then DECK order. */
export function leeches(srs: SaveData['srs']): CardId[];
```

## Tests (`src/living.test.ts`)
- Both worked examples in `MATHS.md` section 5, exact to 1e-9.
- `weakLoci` with no stats, one locus, all loci equal, more than 5 candidates (returns 5), a tie, string keys after `JSON.parse(JSON.stringify(...))`, `tries_i = 2` with 2 misses (never weak), `m + 0.15 > 1` (no weak loci).
- `ghostOpacity` at h = 0, 2, 4 (0.35, 0.175, 0.0875), just before and after 2.445 h and 5.615 h, negative h (= 0.35), `'not a date'` (= 0).
- `ghosts`: picks the latest by `at` when the array is out of order; `ghostWarning` true at 2.4 h, false at 2.5 h.
- `leeches`: order and the lapses >= 4 boundary.

## Acceptance
- [x] `npm test` and `npm run build` pass.
- [x] Signatures exactly as above. Every constant used, no magic numbers in function bodies.

## Questions
- None.

## Report
- Implemented empirical-Bayes miss-rate shrinkage and weak-locus selection, ghost fade/warning helpers, latest-drill ghost extraction, and leech ordering.
- Defensive input handling excludes malformed locus stats, invalid timestamps and non-deck SRS keys; no dependencies added.
- `npm test`: 24 passed, 0 failed. `npm run build`: passed. `git diff --check`: passed.
- Tests cover both MATHS.md worked examples to 1e-9, weak-locus thresholds/ranking/tie/cap/string keys and invalid data, ghost fade/warn/hide/future/invalid dates and latest drill, plus leech boundary and order.
- Scope: only `src/living.ts` and `src/living.test.ts` are changed. `npm install` modified lockfile root metadata, which was restored.

## Builder Verification
Verdict: Awaiting AG cross-verification.
Evidence: `npm test` -> pass 24, fail 0; `npm run build` -> ok; `git diff --check` -> ok.
Acceptance:
- ✔ Tests/build pass (24/24; Vite build ok).
- ✔ Public constants and function signatures match packet; all formula constants are named.
- ✔ MATHS.md weak-locus formula/tolerance and ghost fade equations are tested.

Findings: None known; awaiting AG independent red-team verification.

## Verify (for AG)
In `../mp-T8a`: `npm test`, `npm run build`, paste counts.
1. Recompute both `MATHS.md` section 5 tables by hand or in a scratch script; compare with the code.
2. **Mutation check** (undo each with `git checkout -- src`): `PRIOR_K = 0` (no shrinkage); `>=` to `>` in the tries rule; half-life 2 to 3; latest drill = last array item. Each must make a test fail.
3. Red-team `src/redteam/T8a.test.ts`: at least 5 attacks, for example `misses > tries` in a hand-edited save, negative numbers, NaN, 10000 loci, a drill `at` in the future.
Write "Verification" as TASKS.md says.

## Verification (round 1)
Verdict: PASS
Evidence: npm test -> "pass 30, fail 0"; npm run build -> ok (built in 78ms); red-team: src/redteam/T8a.test.ts
Acceptance:
- ✔ `npm test` and `npm run build` pass: npm test passes (pass 30, fail 0); npm run build (tsc && vite build) succeeds cleanly with 0 errors
- ✔ Signatures exactly as above. Every constant used, no magic numbers in function bodies: PRIOR_K (5), WEAK_MARGIN (0.15), WEAK_MIN_TRIES (3), WEAK_MAX (5), GHOST_START (0.35), GHOST_HALF_LIFE_H (2), GHOST_MIN (0.05), GHOST_WARN (0.15) and all functions exported with exact signatures from src/living.ts
Findings: none

Attacks tried that failed:
1. Malformed and corrupted locus stats: misses > tries (corrupted hand-edited save), negative numbers (tries: -10), NaN, Infinity, -Infinity, float tries (10.5), and invalid keys (badKey, -2, 01, 3.14) are safely ignored without poisoning global miss rate m or posterior shrinkage calculation
2. Exact boundary condition for sample threshold: locus with tries === 3 and 3 misses correctly recognized as weak locus (tries >= WEAK_MIN_TRIES), whereas tries === 2 is excluded
3. High-scale stress test (10,000 loci): processed in <20ms, returns at most WEAK_MAX = 5, and ties are strictly resolved in ascending numeric order (not lexicographic string order)
4. Ghost opacity clock skew, future dates, and invalid timestamps: drill timestamp in future (h < 0) clamps to h = 0 returning exact GHOST_START = 0.35; invalid date strings ('invalid', '2026-99-99', '', 'not a date') and invalid Date objects return 0 opacity, empty ghosts array, and false warning
5. Leeches corrupt states and strict DECK order tie-breaking: non-finite lapses, negative lapses, non-deck card keys ('JOKER', '10S', '') ignored; lapses >= 4 boundary enforced; ties with identical lapse counts broken strictly by 52-card DECK order across all suits and ranks
6. High global miss rate invariance: when player has 95% miss rate across palace, no locus can exceed m + 0.15 > 1.0; weakLoci returns [] safely without false positives

Mutation checks:
- Mutant 1 (PRIOR_K = 0): KILLED (3 tests failed in living.test.ts)
- Mutant 2 (tries > WEAK_MIN_TRIES instead of >=): KILLED (redteam test for tries === 3 failed)
- Mutant 3 (GHOST_HALF_LIFE_H = 3 instead of 2): KILLED (5 tests failed in living.test.ts)
- Mutant 4 (latestDrill returns last array item): KILLED (ghosts test with unordered drills failed)
