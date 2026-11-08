# T22 - Achievements logic

- Build: FB | Verify: AG | Est. 1.5h | Wave 7 (filler: starts after T20 and T21 are verified) | Branch: `task/T22-achievements` | Worktree: `wt/T22`

## Goal
A short list of milestones that mark real skill, derived from the save, so the player sees how far they have come. No stored state, no streak guilt, no paid anything (plan.md, Retention).

## Write scope
- `src/achievements.ts`, `src/achievements.test.ts` (new)
- Read only: `src/progress.ts`, `src/srs.ts`, `src/living.ts`, `src/speed.ts` (T20), `src/journey.ts` (T21). `mesh next` merges T20 and T21 into your branch.

## Requirements
1. `achievements(save, now)`: returns every badge, earned or not:
   `{ id, title, detail, earned: boolean, earnedAt?: string, progress?: [done: number, of: number] }`.
2. Derived only from `SaveData` (drills, srs, streak, journey). `earnedAt` is the `at` of the drill that earned it, when there is one.
3. About 15 badges that mark skill, for example: first drill; perfect drill at each ladder level 3, 5, 8, 13, 20, 26, 39, 52; 7-day and 30-day streak; all 52 card images at least `learning`; 13 card images `gilded`; the whole journey (T21) at least `learning`; Speed Cards: a perfect deck, under 5 minutes, under 2 minutes. Titles short and plain, no exclamation marks.
4. Stable ids (they may be stored by a later feature). Order: in the order a player usually earns them.

## Acceptance
- [ ] `npm test` and `npm run build` pass; a test per badge (earned and not earned).
- [ ] `achievements(emptySave(), now)` returns all badges unearned, none with progress over its total.

## Questions
BLOCKED: dependency merge `git merge task/T20-speed` conflicts in MATHS.md (T19 added section 12 and T20 added section 13 at the same place, both appended after section 11). `git merge task/T21-journey` conflicts the same way. Lead: merge T19, T20, T21 into main (resolve MATHS.md there, keep sections 12 and 13 and the T21 section), then mesh can give T22 a clean base. Not resolved here because MATHS.md is Lead-owned.
## Report

## Verify (for AG)
In `wt/T22`: `npm test`, `npm run build`, paste counts.
1. Red-team `src/redteam/T22.test.ts`: at least 5 tests, for example a drill dated in the future, a streak count of 1e9, a perfect 52 with `daily: true`, duplicate badge ids, `earnedAt` always one of the drill timestamps.
Write "Verification" as TASKS.md says.
