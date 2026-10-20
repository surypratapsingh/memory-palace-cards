# T8a - Living-palace rules (pure maths)

- Build: FB | Verify: AG | Est. 1.5h | Wave 2 (no dependencies, can start any time) | Branch: `task/T8a-living-rules` | Worktree: `wt/T8a`

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
- [ ] `npm test` and `npm run build` pass.
- [ ] Signatures exactly as above. Every constant used, no magic numbers in function bodies.

## Questions
## Report

## Verify (for AG)
In `wt/T8a`: `npm test`, `npm run build`, paste counts.
1. Recompute both `MATHS.md` section 5 tables by hand or in a scratch script; compare with the code.
2. **Mutation check** (undo each with `git checkout -- src`): `PRIOR_K = 0` (no shrinkage); `>=` to `>` in the tries rule; half-life 2 to 3; latest drill = last array item. Each must make a test fail.
3. Red-team `src/redteam/T8a.test.ts`: at least 5 attacks, for example `misses > tries` in a hand-edited save, negative numbers, NaN, 10000 loci, a drill `at` in the future.
Write "Verification" as TASKS.md says.
