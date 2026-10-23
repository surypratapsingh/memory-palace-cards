# T20 - Speed Cards rules and scoring

- Build: FB | Verify: AG | Est. 2h | Wave 7 (filler: may start any time FB has no other job) | Branch: `task/T20-speed` | Worktree: `wt/T20`

## Goal
Speed Cards, the classic memory-sports event: memorize one full shuffled deck as fast as you can, then recall it. This task writes the rules and scoring as pure functions; T25 (AG) builds the screen.

## Write scope
- `src/speed.ts`, `src/speed.test.ts` (new)
- `src/progress.ts` and `src/progress.test.ts`: keep Speed Cards drills (`mode: 'speed'`, contract C1 in `src/types.ts`) out of the ladder, the staircase and the ladder personal bests; give `shareText` a Speed Cards header
- `MATHS.md`: append section 13 "Speed Cards" only

## Requirements
1. **Research first.** Find the current Speed Cards rules of the World Memory Sports Council (WMSC) and the International Association of Memory (IAM): memorization time limit, recall time limit, how a deck with errors is scored, tie-breaks. Cite the rule documents (URL and date or version) in MATHS.md section 13 and in "Report". Where the two bodies differ, implement IAM-style scoring as the default and write the difference down. Do not guess a rule; if you cannot find it, write the question under "Questions".
2. `speedScore(result)`: from a `DrillResult` with `mode: 'speed'` and 52 cards, return `{ perfect, cards, seconds }` following the rules you found (for example: perfect deck scores its memorization time; otherwise cards correct up to the first error).
3. `compareSpeed(a, b)`: sort order for personal bests (a perfect deck always beats an imperfect one; then the rule's tie-break).
4. `speedBest(drills)`: the best Speed Cards result so far, or null.
5. Constants: `SPEED_MEMORIZE_LIMIT_MS`, `SPEED_RECALL_LIMIT_MS` from the rules.
6. `progress.ts`: `levelOf`, `unlockedLevel`, `recommendedLevel` and `personalBests` ignore speed drills; existing tests stay green; add tests that a speed drill does not change the recommended level.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] MATHS.md section 13 with sources; at least 10 tests in `speed.test.ts`.

## Questions
## Report

## Verify (for AG)
In `wt/T20`: `npm test`, `npm run build`, paste counts.
1. Open the cited sources and check every rule in section 13 against them (write what you checked).
2. Red-team `src/redteam/T20.test.ts`: at least 5 tests, for example a perfect deck with time 0, a deck with every answer null, an imperfect deck faster than a perfect one, a non-speed drill passed to `speedScore`, a speed drill mixed into the staircase input.
Write "Verification" as TASKS.md says.
