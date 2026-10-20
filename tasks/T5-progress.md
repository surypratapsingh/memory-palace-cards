# T5 - Progress logic: ladder, streak, share text

- Builder: Haiku 5.5 | Verifier: Sonnet 5.5 | Wave 1 | Branch: `task/T5-progress` | Worktree: `../mp-T5`

## Goal
Pure functions (no DOM) that drive retention features: level unlocks, personal bests, streak with freezes, rank titles, share text.

## Write scope
- `src/progress.ts` (new)
- `src/progress.test.ts` (new)

`src/progress.ts` may import only `./types.ts` and `./deck.ts` (`LADDER`, `score`, `localDay`).

## Functions (exact signatures)
```ts
import type { DrillResult, Streak } from './types.ts';

/** Ladder index of a drill: LADDER.indexOf(d.sequence.length), or -1 if not a ladder size. */
export function levelOf(d: DrillResult): number;

/** A drill is perfect when score(d.sequence, d.answers).run === d.sequence.length. */
export function isPerfect(d: DrillResult): boolean;

/** Highest unlocked ladder index. Level 0 is always unlocked. Level k+1 unlocks after a perfect drill at level k. Max LADDER.length - 1. */
export function unlockedLevel(drills: readonly DrillResult[]): number;

/** For each level index, the perfect drill with the lowest memorizeMs. Levels without a perfect drill are absent. */
export function personalBests(drills: readonly DrillResult[]): Record<number, DrillResult>;

/** Whole days from day a to day b, both "YYYY-MM-DD". Use Date.UTC so DST cannot break it. dayDiff('2026-03-01','2026-03-02') === 1 */
export function dayDiff(a: string, b: string): number;

/**
 * Call when the daily goal is met (one finished drill) on local day `today`.
 * - lastDay === today: return unchanged.
 * - lastDay is yesterday: count + 1.
 * - missed days (gap - 1) <= freezes: use that many freezes, count + 1.
 * - otherwise (or lastDay === ''): count = 1.
 * Then lastDay = today. When the new count is a multiple of 7, freezes + 1 (max 2).
 * Never mutate the input.
 */
export function updateStreak(s: Streak, today: string): Streak;

/** Title for the highest level with a perfect drill (-1 = none). */
export function rankTitle(bestLevel: number): string;
// -1 'Newcomer', 0 'Novice', 1 'Apprentice', 2 'Journeyman', 3 'Adept', 4 'Expert', 5 'Master', 6 'Grandmaster', 7 'Palace Keeper'

/** Share text. Must never contain card names or symbols (no spoilers). */
export function shareText(d: DrillResult): string;
```

`shareText` format (lines joined with `\n`):
```
Memory Palace · Daily Deck 2026-10-20      (or "Memory Palace · Practice" when not daily; the date is d.seed)
13 cards · 12/13 · run 9 · 2:41            (correct/total, run from score(), memorizeMs as m:ss)
🟩🟩🟩🟩🟩🟩🟩🟩🟩🟥🟩🟩🟩                  (one square per card, 🟩 right, 🟥 wrong or skipped, max 13 per line)
```

## Tests (`src/progress.test.ts`, `node:test` + `node:assert/strict`, same style as `src/core.test.ts`)
Cover at least:
- unlockedLevel: empty -> 0; perfect level 0 -> 1; imperfect drills do not unlock; never above 7.
- personalBests picks the fastest perfect drill, ignores imperfect ones.
- dayDiff across a month end and across a DST change date (2026-03-29, 2026-10-25).
- updateStreak: same day unchanged; next day +1; gap of 2 days with 1 freeze continues and uses the freeze; gap of 3 with 1 freeze resets to 1; 7th day earns a freeze; freezes cap at 2; input not mutated.
- shareText: daily vs practice header, 52-card result has 4 square lines, time format `0:05` and `12:03`, no card ids or suit symbols in the text.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] All signatures exactly as above.

## Questions
## Report

## Verify (for the verifier)
In `../mp-T5`: run `npm test`. Then review `src/progress.ts` against this spec:
1. Each rule of `updateStreak`, especially the freeze math and the "multiple of 7" rule after a freeze.
2. Date handling: no `new Date('YYYY-MM-DD')` local/UTC mix-ups; `dayDiff` uses Date.UTC.
3. `shareText` never leaks card ids; square wrapping at 13.
4. Tests actually assert the edge cases listed, not just run them.
5. Think of 3 extra edge cases; if any fails, report it with a failing input.
Write "Verification" with PASS or CHANGES and numbered findings.
