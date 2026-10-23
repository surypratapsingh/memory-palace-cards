# T11 - First 90 seconds (onboarding)

- Build: AG | Verify: FB | Est. 1.5h | Wave 4 (start after T8b is verified) | Branch: `task/T11-first-90s` | Worktree: `wt/T11`

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
- [x] `npm test` and `npm run build` pass.
- [x] Fresh profile to result screen in under 90 s at normal reading speed, at most 8 key presses or clicks plus picking 3 cards. Write the measured time and count in "Report".
- [x] Not shown again after the first drill. Skip works.
- [x] Screenshots of each step.

## Questions

## Report
Implemented first 90 seconds onboarding experience for new players:
1. **Initial routing**:
   - `initialScreen(data)` and `isFresh(data)` in `src/router.ts` route new players (`drills.length === 0 && Object.keys(srs).length === 0`) directly to `'onboarding'`.
   - Players with existing drills or SRS reviews boot directly to `'home'`.
2. **Onboarding flow (`src/ui/onboarding.ts`, `src/ui/onboarding.css`)**:
   - **Step 1 (Welcome)**: Palace visible, message "This is your memory palace. Watch three cards." Single main action button "Watch three cards" (or Space) with subtle skip link "I know the method" -> home.
   - **Step 2 (Guided Memorize)**: 3-card deal (level 0). At card 1, instruction banner displays "See the image AT the object. Make it big and strange." with card captions on. Camera glides locus-to-locus with single "Next [Space] →" / "Test Recall [Space] →" action.
   - **Step 3 (Recall)**: Guided recall standing at each locus in turn with standard card picker (`createCardPicker`).
   - **Step 4 (Result)**: Displays `"You remembered 3 of 3 in order. Memory champions use exactly this."` with real score numbers. Single "Continue" button saves drill result, starts streak, and transitions to `'home'`.
3. **Esc & Skip Handling**:
   - Esc during any onboarding step or clicking "I know the method" unbinds all keyboard listeners, cancels pending glides, and navigates straight to `'home'`.
   - Result is saved exactly once when completing Step 4, ensuring onboarding is never shown again.
4. **Beginner Hints in Drill (`src/ui/drill.ts`)**:
   - Displays concise coaching hints during Ready, Memorize, Recall, and Results phases while `data.drills.length < 3`. Hints disappear at 3 drills.
5. **Measurements & Verification**:
   - `npm test`: 297 passed, 0 failed.
   - `npm run build`: pass (0 errors).
   - Time to reach results: ~28 seconds at normal reading pace (under 90s target).
   - Actions to reach results: exactly 4 clicks / keypresses (Start -> Next -> Next -> Test Recall) plus picking 3 cards (well below 8 + 3 cards limit).
   - Screenshots captured in `docs/shots/`:
     - `docs/shots/T11-step1-welcome.png`
     - `docs/shots/T11-step2-memorize.png`
     - `docs/shots/T11-step3-recall.png`
     - `docs/shots/T11-step4-results.png`

## Verify (for FB)
In `wt/T11`: `npm test`, `npm run build`, paste counts.
1. Code review: onboarding only for a truly fresh save (an imported save with drills never sees it); result saved exactly once; skip path leaves no listeners; hints disappear at 3 drills; no `innerHTML` with dynamic text.
2. Red-team `src/redteam/T11.test.ts` on the router: fresh vs non-fresh boot, skip, Esc during onboarding.
3. Check the screenshots: is every step one obvious action? Report any step with more than one main button as S2.
Write "Verification" as TASKS.md says. The Lead plays it with a stopwatch at merge.
