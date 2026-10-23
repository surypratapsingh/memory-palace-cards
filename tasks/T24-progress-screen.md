# T24 - Progress screen: map, insights, achievements

- Build: AG | Verify: FB | Est. 2.5h | Wave 7 (start after T18, T19, T22 and U2-PICK) | Branch: `task/T24-progress-screen` | Worktree: `wt/T24`

## Goal
One calm screen that answers "how am I doing and what should I practise?": weak loci on the palace map, the cards you confuse, the cards you miss, your speed trend, and your achievements. Every fact leads to an action.

## Write scope
- `src/ui/progressScreen.ts`, `src/ui/progressScreen.css` (new), `src/ui/progressScreen-demo.ts` + `.html` (new)
- `src/router.ts`, `src/router.test.ts` (new screen `progress`), `src/main.ts` (mount it)
- `src/ui/home.ts`: one entry button or link to the screen, in the style the U2 winner set
- `docs/shots/T24-*.png`
- Read only: `src/ui/palaceMap.ts` (T18), `src/insights.ts` (T19), `src/achievements.ts` (T22), `src/living.ts`, `src/ui/sparkline.ts`

## Requirements
1. Sections, in this order, each hidden when it has nothing to say (no empty boxes):
   - Palace map (T18) with heat = shrunk locus miss rate (`shrunkMissRates` in `living.ts`), weak loci highlighted; clicking a weak locus says the tip from plan.md ("picture it bigger or stranger").
   - "Cards you mix up": the top confusions (T19) shown as card pairs with the kind in plain words ("order slip" for swap, "image slip" for substitution).
   - "Cards to train": weak cards (T19) with a button that opens the trainer.
   - "Speed": memorize seconds per card sparkline for the player's current level (T19), with "getting faster" only when `improving` is true.
   - Achievements (T22): earned ones first with date, then the next 3 unearned with progress.
2. Uses the visual language the U1 winner set (tokens, type scale, buttons). No new colours outside the tokens.
3. Keyboard: Esc goes back home; every control reachable by Tab with a visible focus ring.
4. A brand-new save shows one friendly line and a "Play your first drill" button instead of empty sections.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass (add one e2e test: open the screen from home and come back).
- [ ] Screenshots: fresh save, after 5 drills, after 30 drills (use the demo harness with fake saves), normal and colour-safe, at 1366x768 and 1920x1080.

## Questions
## Report

## Verify (for FB)
In `wt/T24`: `npm test`, `npm run build`, `npm run e2e`; paste counts.
1. Code review: no `innerHTML` with dynamic text; listeners and the map destroyed on unmount; numbers match the T19 functions for the same save.
2. Red-team `src/redteam/T24.test.ts`: at least 5 tests on the router and on the data the screen shows, for example a save with 1000 drills, a save whose drills have unknown card ids, Esc from the screen, the screen with sound on.
3. Rate it with `docs/design-rubric.md` (score only, no verdict effect unless a criterion scores 1, which is an S2).
Write "Verification" as TASKS.md says.
