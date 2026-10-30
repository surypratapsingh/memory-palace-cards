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

## Verification (round 1)
Verdict: CHANGES
Evidence: `npm install` -> up to date, 0 vulnerabilities; `node --test src/redteam/T11.test.ts` -> pass 7, fail 0; `npm test` -> pass 304, fail 0; `npm run build` -> ok (0 TypeScript/build errors; Vite reports 647.77 kB JS chunk warning). Live dev app at `http://127.0.0.1:5183/` returned HTTP 200; onboarding welcome -> memorize -> recall -> result flow exercised with clean console/no app errors and all source modules HTTP 200. The local app produced a result after 38.2 s elapsed for a 3-card run; with a second measured fast run, after 4 primary controls plus selecting 3 cards, completion at 38 s (well under 90s). Outcome scored 1/3 due to verifier-selected wrong cards; result shows actual counts and saved one practice drill/streak. Supplied screenshots inspected: all four PNGs show the specified stages; the welcome screen has a primary action and secondary skip link, memorize has one primary action, recall shows the normal card grid, and results has one Continue action.
Acceptance:
- ✔ Fresh save routes to onboarding; imported saves with drills or SRS go to home (`src/router.ts`, `src/router.test.ts`, T11 red-team).
- ✔ Tested skip link and Escape on welcome; Escape in memorize; all route to Home without completing/saving, remove onboarding keyboard handlers (`src/ui/onboarding.ts`, live browser and red-team lifecycle test).
- ✘ Onboarding completion does not demonstrate the method: selecting three different cards always advances to success copy, even when none (or only one) match the dealt sequence. In live run sequence was `AH, AD, 6S`; answers `AH, AS, AC`; result correctly displayed “You remembered 1 of 3…” but this still marks the First Win / “Proved!” acceptance path as completed in the task's feature (see Finding 1).
- ✔ The onboarding UI constructs dynamic copy with `textContent`, and result has a single Continue button. Source audit and red-team assertion passed.
- ✔ Live observation: 38.2 seconds from starting the app timer through the recall screen after 4 actions (start, next, next, test recall) plus 3 card selections. This is below 90 seconds; the result was 1/3, not a verified perfect win (Finding 1).
- ✔ Continue saves the result/streak exactly once and routes to Home: browser localStorage contains one drill and streak count 1; after navigating home reload routes home; result button is singular.
- ✔ Four supplied screenshots reviewed: `docs/shots/T11-step1-welcome.png`, `T11-step2-memorize.png`, `T11-step3-recall.png`, `T11-step4-results.png`.
Findings:
1. [S2] `src/ui/onboarding.ts:showStep3/selectCard` and `showStep4` - first-win goal is not met by a normal new player's first exposure. The onboarding picks a random 3-card sequence (`deal(3, seed)`), shows it briefly, then exposes the standard 52-card picker with no selected sequence or usable recall feedback. Any distinct three guesses immediately reach Results; a wrong score still advances and after Continue saves a completed drill, causing `isFresh` to route future launches to Home. Verified live with sequence `AH, AD, 6S` and guesses `AH, AS, AC`: results report only 1/3; the alleged proof message is nevertheless shown. Make the first-win path reliably teach/reinforce the actual three cards or otherwise ensure the normal first run can reach the stated 3/3 result; preserve real scoring and test wrong answers as a separate path.
Attacks tried that failed: fresh vs drills-only vs SRS-only route matrix; imported images/locusStats vs strict freshness rule; skip click; Escape on welcome and memorize; malformed/prototype route inputs; repeat/wrong/duplicate card picker inputs; completed the live flow with wrong guesses and confirmed it still saves a drill/streak; source search for dynamic `innerHTML`; inspected result Continue count and all supplied screenshots.

1. Code review: onboarding only for a truly fresh save (an imported save with drills never sees it); result saved exactly once; skip path leaves no listeners; hints disappear at 3 drills; no `innerHTML` with dynamic text.
2. Red-team `src/redteam/T11.test.ts` on the router: fresh vs non-fresh boot, skip, Esc during onboarding.
3. Check the screenshots: is every step one obvious action? Report any step with more than one main button as S2.
Write "Verification" as TASKS.md says. The Lead plays it with a stopwatch at merge.

### Lead fix (round 1; AG did not take its fix turn)
1. [S2] first win not reliable: **FIXED**. The result screen only says "★ Proved!" and "Memory champions use exactly this." for a perfect run. Otherwise it shows "Almost there", the real score and one tip, with "Try again" as the main action (Space/Enter; deals 3 new cards) and "Continue" as a secondary link (Esc). Every attempt is saved like any drill. Memorize HUD now names the card ("Locus 1 of 3: Velvet Armchair — A♣") and the image (AG's unfinished change, kept). Escape during a retry hands the saved attempt to `onComplete` instead of `onSkip`, so main's data matches storage. New test `src/ui/onboarding.test.ts` (perfect run, wrong run then retry, Escape after a saved attempt); the wrong-run test fails on the old code. `npm test` 307 pass, `npm run build` ok. Browser (fresh profile, 800x600): wrong run -> "Almost there" + Try again -> 3/3 -> "★ Proved!" -> Continue -> home with streak 1 and 2 drills saved; no console errors.

## Verification (round 2)
Verdict: PASS
Evidence: `npm install` -> up to date, 0 vulnerabilities; `node --test src/redteam/T11-round2.test.ts` -> "tests 5, pass 5, fail 0"; `npm test` -> "tests 312, pass 312, fail 0"; `npm run build` -> tsc clean, vite "built in 460ms" (648.17 kB chunk warning only); mutation check: with only `src/ui/onboarding.ts` reverted to `eea1215`, the Lead's new `src/ui/onboarding.test.ts` wrong-run test and 3 of the 5 round-2 tests fail, and `HEAD` makes them green; live dev app `http://127.0.0.1:5185/` in a fresh incognito profile, console shows only Vite HMR messages.
Acceptance:
- ✔ `npm test` and `npm run build` pass: "pass 312, fail 0", build exit 0.
- ✔ Fresh profile to the first result screen takes 4 key presses plus picking 3 cards (welcome Space, Memorize Next, Next, Test Recall, then 3 picks), well inside the 8-press budget. On-screen timers for the failed attempt read Memorize 0:24 and Recall 0:27 (≈51 s, inflated by agent tool latency between presses); round 1 measured 38.2 s live and the fix adds no mandatory step before the first result.
- ✔ Not shown again after the first drill: Continue -> `screen-home` with 🔥 1; reload -> `screen-home` with no `.onboarding-overlay`; the skip link reaches home with `drills.length` 0 and nothing saved (so a skipped player still gets onboarding next launch).
- ✔ Screenshots of each step exist and still match the current UI: `docs/shots/T11-step1-welcome.png` (one primary action + skip link), `T11-step2-memorize.png` (single Next action, caption + instruction), `T11-step3-recall.png` (normal 52-card picker), `T11-step4-results.png` (shows "★ Proved!", the exact 3-of-3 line, the stat row and a single Continue). A fresh PNG of the new "Almost there" branch could not be captured because the app window was not drawn ("a tab opened while the Freebuff window is minimized or covered is not drawn"); that screen is recorded below from DOM evidence instead.
- ✔ Round-1 [S2] fixed. Wrong run: title "Almost there", line "You remembered 0 of 3 in order. Try three new cards: see each image AT its object, big and strange.", stats 0 / 3, main action "Try again", secondary "Continue" — no "Memory champions" text and no "★ Proved!". Retry then perfect: title "★ Proved!", exact line "You remembered 3 of 3 in order. Memory champions use exactly this.", one primary button "Continue" and no "Try again". Live sequences: `7♥,8♠,8♣` answered `A♠,K♦,2♣` -> "Almost there"; retry `A♥,A♦,9♣` answered correctly -> "★ Proved!".
- ✔ Every attempt is saved exactly once: after the wrong run + retry, `memory-palace/v1` has `drills.length` 2 with distinct seeds (`p-1793349879819-yq9yoctn`, `p-1793349945969-cnsqtc0z`) and answers, `locusStats` tries 2 / misses 1 per locus, `streak.count` 1.
- ✔ Beginner hints remain gated on `drills.length < 3` in all four drill phases (`src/ui/drill.ts:190,294,555,783`) and the recall hint text is present on the live recall screen.
Findings:
(none — S1: 0, S2: 0, S3: 0)
Attacks tried that failed:
1. Imperfect run exits through the secondary Continue instead of retrying: one save, one completion, `skips` stays 0.
2. Retry then Continue: exactly two drills with distinct seeds and timestamps, one completion, no partial writes.
3. Double Space on the perfect result: one completion, one drill, streak 1 (the result listener is removed on first activation).
4. Listener stacking across welcome -> memorize -> recall -> result -> retry -> result: exactly one window `keydown` handler at every phase and zero after leaving.
5. Escape at the second result after two saved attempts: forwards the second sequence (not the first), keeps both drills and records no skip.
6. Perfect result always exposes exactly one button and the exact required sentence; the imperfect branch never contains "Memory champions".
7. Freshness predicate: a save with imported `images`/`locusStats` only still boots onboarding; any drill or SRS entry boots home (round-1 red-team, re-run green).
8. Skip link and Escape on welcome/memorize save nothing and leave no listeners (round-1 red-team, re-run green).
9. Mutation check: reverting only `src/ui/onboarding.ts` to `eea1215` turns the Lead's wrong-run test and round-2 attacks 1, 2 and 5 red; restoring `HEAD` turns them green.
