# T11 - First 90 seconds (onboarding)

- Build: AG | Verify: FB | Est. 1.5h | Wave 4 (start after T8b is merged) | Branch: `task/T11-first-90s` | Worktree: `../mp-T11`

## Goal
A new player proves the method works on them within 90 seconds, with no setup and no reading wall (plan.md, Retention 1).

## Write scope
- `src/ui/onboarding.ts`, `src/ui/onboarding.css` (new)
- `src/main.ts`, `src/router.ts`, `src/router.test.ts` (route fresh players to onboarding)
- `src/ui/drill.ts` (beginner hints only)
- `docs/shots/T11-*.png`

## Flow (fresh save: no drills, no srs)
1. Palace visible, one line: "This is your memory palace. Watch three cards." Space or a button to start. No other choices.
2. Guided memorize of 3 cards (level 0, practice) with captions on. Before card 1, one line: "See the image AT the object. Make it big and strange."
3. Recall the 3 cards with the normal picker.
4. Result line: "You remembered 3 of 3 in order. Memory champions use exactly this." (real numbers). One button: "Continue" -> home. The drill result is saved like any drill, so the streak starts.
- Skip link "I know the method" on step 1 goes straight to home.
- Beginner hints in the drill while `data.drills.length < 3`: one hint per phase, for example "Recall: walk the route in your mind, the cards are still there."

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Fresh profile to result screen in under 90 s at normal reading speed, at most 8 key presses or clicks plus picking 3 cards. Write the measured time and count in "Report".
- [ ] Not shown again after the first drill. Skip works.
- [ ] Screenshots of each step.

## Questions
## Report

## Verify (for FB)
In `../mp-T11`: `npm test`, `npm run build`, paste counts.
1. Code review: onboarding only for a truly fresh save (an imported save with drills never sees it); result saved exactly once; skip path leaves no listeners; hints disappear at 3 drills; no `innerHTML` with dynamic text.
2. Red-team `src/redteam/T11.test.ts` on the router: fresh vs non-fresh boot, skip, Esc during onboarding.
3. Check the screenshots: is every step one obvious action? Report any step with more than one main button as S2.
Write "Verification" as TASKS.md says. The Lead plays it with a stopwatch at merge.
