# T5 - Progress logic: ladder, staircase, streak, share text

- Build: FB | Verify: AG | Est. 2h | Wave 1 | Branch: `task/T5-progress` | Worktree: `../mp-T5`

## Goal
Pure functions (no DOM) that drive retention: level unlocks, recommended difficulty, personal bests, streak with freezes, rank titles, share text. Maths in `MATHS.md` sections 2, 4 and 9.

## Write scope
- `src/progress.ts` (new)
- `src/progress.test.ts` (new)

`src/progress.ts` may import only `./types.ts` and `./deck.ts` (`LADDER`, `score`).

## Functions (exact signatures)
```ts
import type { DrillResult, Streak } from './types.ts';

/** Ladder index of a drill: LADDER.indexOf(d.sequence.length), or -1 if not a ladder size. */
export function levelOf(d: DrillResult): number;

/** A drill is perfect when score(d.sequence, d.answers).run === d.sequence.length. */
export function isPerfect(d: DrillResult): boolean;

/** Highest unlocked ladder index. Level 0 is always unlocked. Level k+1 unlocks after a perfect drill at level k. Max LADDER.length - 1. */
export function unlockedLevel(drills: readonly DrillResult[]): number;

/** Staircase state, MATHS.md section 4. */
export interface Stair { level: number; wins: number }
/** One staircase step. Drills at a level other than s.level return s unchanged. Never mutates s. */
export function stepLevel(s: Stair, levelPlayed: number, perfect: boolean): Stair;
/** Fold stepLevel from { level: 0, wins: 0 } over drills in array order (oldest first). Drills with levelOf -1 are skipped. Returns the level. */
export function recommendedLevel(drills: readonly DrillResult[]): number;

/** For each level index, the perfect drill with the lowest memorizeMs. Levels without a perfect drill are absent. */
export function personalBests(drills: readonly DrillResult[]): Record<number, DrillResult>;

/** Whole days from day a to day b, both "YYYY-MM-DD". MATHS.md section 9. dayDiff('2026-03-01','2026-03-02') === 1 */
export function dayDiff(a: string, b: string): number;

/** Call when the daily goal is met (one finished drill) on local day `today`. Rules in MATHS.md section 9. Never mutates s. */
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
13 cards · 12/13 · run 9 · 2:41            (correct/total, run from score(), memorizeMs as m:ss, seconds floored)
🟩🟩🟩🟩🟩🟩🟩🟩🟩🟥🟩🟩🟩                  (one square per card, 🟩 right, 🟥 wrong or skipped, max 13 per line)
```

## Tests (`src/progress.test.ts`)
- unlockedLevel: empty -> 0; perfect level 0 -> 1; imperfect drills do not unlock; never above 7; a perfect level-5 drill with nothing below still unlocks 6 (unlock is per level, not a chain).
- recommendedLevel: worked sequences by hand (2 perfects up, 1 miss down, floor 0, cap 7, other levels ignored).
- **Staircase simulation** exactly as in `MATHS.md` section 4 (use `stepLevel`, not 20000 calls of `recommendedLevel`).
- **Property test**: 500 random drill histories (fixed seed): `recommendedLevel(h) <= unlockedLevel(h)` for every prefix.
- personalBests picks the fastest perfect drill, ignores imperfect ones.
- dayDiff across a month end, a year end, a leap day (2028-02-28 -> 2028-03-01 = 2), and the DST dates 2026-03-29 and 2026-10-25.
- updateStreak: every rule in MATHS.md section 9, including `lastDay = ''`, clock moved back, freeze used then 7th day earns one, cap at 2, input not mutated.
- shareText: daily vs practice header, 52 cards = 4 square lines, time `0:05` and `12:03`, no card ids or suit symbols (check with a regex for `[AJQKT2-9][SHDC]` and `[♠♥♦♣]`).

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] All signatures exactly as above.

## Questions
## Report

## Verify (for AG)
In `../mp-T5`: `npm test`, `npm run build`, paste counts. Then:
1. Check each rule of `updateStreak` and `stepLevel` against `MATHS.md` line by line.
2. Date handling: no `new Date('YYYY-MM-DD')` mixed with local getters; `dayDiff` uses Date.UTC.
3. **Mutation check** (undo each with `git checkout -- src`): change `wins === 2` to `wins === 3`; change the freeze cap 2 to 3; drop the `g < 0` rule. Each must make a test fail.
4. Red-team `src/redteam/T5.test.ts`: at least 5 attacks, for example a drill with 0 cards, answers shorter than the sequence, `memorizeMs` of 59999 and 60000, `seed` that is not a date, streak across 3 years.
Write "Verification" as TASKS.md says.
