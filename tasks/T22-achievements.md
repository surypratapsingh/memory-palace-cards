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
Build round 0 (FB, commit "T22: fix round 0").

- `src/achievements.ts`: `achievements(save, now)` returns 17 badges, earned or not, in earning order: first drill; perfect at 3, 5, 8, 13, 20, 26, 39, 52 (one per ladder level); 7-day and 30-day streak; all 52 cards at learning or better; 13 cards gilded; whole journey at learning or better; Speed Cards perfect deck, under 5 minutes, under 2 minutes. The list is 17, not about 15, because the ladder has 8 levels and the Speed Cards rules have 3 badges.
- Derived only from `SaveData`. `earnedAt` is the `at` of the first drill that earned the badge (save array is oldest first); absent for streaks, card and journey badges.
- Progress is capped at the total. Negative or NaN values count as 0.
- Ids are stable: `first-drill`, `perfect-<cards>`, `streak-7`, `streak-30`, `cards-learning`, `cards-gilded`, `journey-learning`, `speed-perfect`, `speed-under-5`, `speed-under-2`.

Checks in `wt/T22`:
- `src/achievements.test.ts`: acceptance (empty save: all unearned, progress within totals) plus one earned and one not-earned test per badge. 36 tests.
- `src/redteam/T22.test.ts`: 8 red-team tests (future-dated drill, streak 1e9, perfect 52 with `daily: true`, unique ids, `earnedAt` always a drill timestamp, NaN and negative streak, short speed deck, corrupt srs entry).
- `npm test`: 497 pass, 0 fail. `npm run build`: OK.

Choices:
- Strength "at least learning" means learning, solid or gilded; `fading` and `new` do not count.
- A card or journey badge has no `earnedAt`, because no single drill earns it.

## Verify (for AG)
In `wt/T22`: `npm test`, `npm run build`, paste counts.
1. Red-team `src/redteam/T22.test.ts`: at least 5 tests, for example a drill dated in the future, a streak count of 1e9, a perfect 52 with `daily: true`, duplicate badge ids, `earnedAt` always one of the drill timestamps.
Write "Verification" as TASKS.md says.


## Verification (round 1)
Verdict: PASS
Evidence: npm test -> "pass 502, fail 0"; npm run build -> ok; 13 redteam tests pass.
Acceptance:
- [✔] npm test (502 pass, 0 fail) and npm run build (ok) pass; tests cover earned and unearned state for all 17 badges.
- [✔] achievements(emptySave(), now) returns all badges unearned, none with progress over its total.
Findings:
None (S1: 0, S2: 0, S3: 0).
Attacks tried that failed:
1. Future-dated drill: kept as-is, attaches exact ISO string as earnedAt, does not earn unearned levels.
2. Huge streak count (1e9): progress clamped to target (7/7, 30/30), never overflows total.
3. Daily drill flag: perfect 52 with daily: true correctly earns perfect-52 badge.
4. Badge ID collision: all 17 badge IDs are distinct.
5. Timestamp provenance: earnedAt always originates from a drill in the save.
6. Corrupt streak (NaN, negative): gracefully handled, progress floors to 0, earned=false.
7. Corrupt srs entry: null srs entry does not throw, counts as new.
8. Spec plain titles check: verified zero exclamation marks across all 17 badge titles.
9. Earliest timestamp check: earnedAt matches earliest chronological drill that earned the milestone.
10. Speed Cards boundary: 300 s limit correctly handles perfect vs under-5 vs under-2 thresholds.
