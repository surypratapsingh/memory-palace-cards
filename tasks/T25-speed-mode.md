# T25 - Speed Cards mode

- Build: AG | Verify: FB | Est. 2.5h | Wave 7 (start after T20 and U3-PICK) | Branch: `task/T25-speed-mode` | Worktree: `wt/T25`

## Goal
Play Speed Cards (T20 rules) in the palace: one full deck, memorize as fast as you can, recall under the time limit, get a memory-sports score and a personal best.

## Write scope
- `src/ui/drill.ts`, `src/ui/drill.css`: a `speed` option (52 cards, its own HUD), in the structure the U3 winner set
- `src/ui/home.ts`: Speed Cards entry, shown once the player has a perfect 13-card drill (show it greyed with "Unlocks at a perfect 13" before that)
- `src/main.ts`, `src/router.ts`, `src/router.test.ts`: only if the mode needs its own route event
- `src/ui/speed-demo.ts` (optional harness), `docs/shots/T25-*.png`
- Read only: `src/speed.ts` (T20)

## Requirements
1. Memorize: 52 cards, glide forced to 0 (instant) whatever the setting; Right/Space next, Left back; a count-up timer and a thin progress bar; at `SPEED_MEMORIZE_LIMIT_MS` memorize ends by itself. A "Done" key (Enter) ends memorize early; the time stops at that key press.
2. Recall: the normal picker; a count-down to `SPEED_RECALL_LIMIT_MS`; at zero, recall ends and unanswered loci count as blank.
3. Result: `speedScore` (T20) in plain words ("Perfect deck in 3:12" or "31 cards before the first slip"), personal best from `speedBest`, and the usual locus review. The drill is saved with `mode: 'speed'` (contract C1) and counts for the streak like any drill.
4. Ghosts, weak-locus stats and the staircase work as `progress.ts` / `living.ts` say (T20 keeps speed drills out of the ladder).

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass; add one e2e test that plays a full speed deck by reading the HUD and checks a perfect score.
- [ ] Screenshots: locked entry, memorize HUD, recall with count-down, both result kinds.

## Questions
## Report

## Verify (for FB)
In `wt/T25`: `npm test`, `npm run build`, `npm run e2e`; paste counts.
1. Code review: timers cleared on every exit; the saved drill has `mode: 'speed'`, 52 cards, and the right `memorizeMs` (stops at Done); glide setting unchanged after the mode ends.
2. Red-team `src/redteam/T25.test.ts`: at least 5 tests, for example the memorize limit reached while a glide is running, Done pressed twice, Esc during recall saves nothing, a speed drill does not change the recommended level.
Write "Verification" as TASKS.md says.
