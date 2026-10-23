# T8b - Living palace in the game

- Build: AG | Verify: FB | Est. 2h | Wave 4 (start after T7 and T8a are verified) | Branch: `task/T8b-living` | Worktree: `wt/T8b`

## Goal
The palace visibly reacts to the player's memory, without ever moving a locus (decisions.md). Uses the pure rules from `src/living.ts` (T8a).

## Write scope
- `src/ui/drill.ts`, `src/ui/drill.css`, `src/ui/home.ts`, `src/ui/home.css`
- `src/ui/shadowWalk.ts` (new), `src/router.ts`, `src/router.test.ts`, `src/main.ts` (only to add the shadow-walk screen)
- `docs/shots/T8b-*.png`

## Use (do not edit)
`weakLoci`, `ghosts`, `ghostWarning`, `leeches` from `src/living.ts`; `PalaceView`.

## Requirements
1. **Weak loci**: when a drill reaches the Ready phase, `setLocusMood(i, 'weak')` for every `weakLoci(data.locusStats)`. Ready text: "Locus 17 (Blue vase) keeps failing: picture your image bigger, louder, stranger." (one line per weak locus, max 3 lines). Moods reset on unmount.
2. **Ghosts**: while home is shown, `ghosts(data.drills, now)` are drawn with `showCard(i, card, { opacity })`. Refresh once a minute. Cleared on unmount.
3. **Ghost warning**: if `ghostWarning(...)` when a drill starts, show "Fresh ghosts can mix you up. Rest a little or play anyway." with buttons "Play anyway" and "Back". Daily Deck shows it too.
4. **Shadow Walk** (new screen, from results and from home when a drill exists): free walk with cards hidden. Clicking a locus that held a card in the latest drill shows "What stood here?"; Space or a second click reveals the card and caption for 3 s. Esc leaves. Add the screen to `src/router.ts` with tests.
5. **Leeches** on home: "3 images keep slipping" with the Train button when `leeches(data.srs).length > 0`.

## Acceptance
- [x] `npm test` and `npm run build` pass.
- [x] Weak loci, ghosts, ghost warning and Shadow Walk all visible in the app. Screenshots of each.
- [x] Unmount leaves no moods, cards, timers or listeners.

## Questions
- **PalaceView unsubscribe disposer contract**: FB's verification (round 2) finding 1 requires `view.onLocusClick` to return an unsubscribe function (`() => void`) that removes the callback from `clickCallbacks` in `src/scene/palaceView.ts`. Because `src/types.ts` is a Lead-owned contract file and `src/scene/palaceView.ts` is outside T8b's write scope (and guarded by FB's red-team test in `src/redteam/T8b.test.ts`), can the Lead update the contract in `src/types.ts` and `src/scene/palaceView.ts` (e.g. returning an unsubscribe closure that splices `clickCallbacks`), or authorize deferring this to Q1?
  - **Lead answer (2026-10-23):** done in this branch. `PalaceView.onLocusClick` now returns `() => void` (`src/types.ts`), and `src/scene/palaceView.ts` returns a closure that splices the callback out of `clickCallbacks`. The red-team test that asserted the old `void` contract now asserts the unsubscribe exists. Builder: in `src/ui/shadowWalk.ts` drop the `as unknown as` cast and the `typeof ... === 'function'` check, keep the returned function and call it on unmount. Then commit `T8b: fix round 2`; FB verifies finding 1 as FIXED.

## Report
Implemented living palace in the game using pure logic from `src/living.ts`:
1. **Weak loci**: In drill Ready phase, `weakLoci(data.locusStats)` sets mood 'weak' on each failing locus via `view.setLocusMood(i, 'weak')`. Displayed up to 3 coaching lines: `"Locus ${i + 1} (${locus.name}) keeps failing: picture your image bigger, louder, stranger."`. All moods are tracked in `modifiedLoci` and reset to 'normal' on exit / unmount.
2. **Ghosts**: On Home screen, `ghosts(data.drills, new Date())` are drawn via `showCard(i, card, { opacity })`. Refreshed every 60s via `setInterval` using `new Date()` at call time. Both interval timer and cards are cleared on unmount.
3. **Ghost warning**: Before a drill starts (including Daily Deck), if `ghostWarning(data.drills, new Date())` is active, displays modal panel: "Fresh ghosts can mix you up. Rest a little or play anyway." with "Play anyway" and "Back" buttons.
4. **Shadow Walk**: Added `shadowWalk` screen (`src/ui/shadowWalk.ts`), wired into `router.ts`, `router.test.ts`, and `main.ts`. Free walk mode is turned on (`view.setFreeWalk(true)`) with cards hidden. Clicking a locus from the latest drill prompts "What stood here?", and Space or a second click reveals the card and caption for 3 seconds before hiding. Esc leaves, resetting cards, free walk mode (`view.setFreeWalk(false)`), and timeouts. Accessible from results screen and from Home.
5. **Leeches**: In Card Images section on Home, displays `"${count} images keep slipping"` notice when `leeches(data.srs).length > 0` directly above the Train button.

Verification & Evidence:
- `npm test`: 283 passed, 0 failed.
- `npm run build`: pass (0 errors).
- Screenshots:
  - `docs/shots/T8b-ghosts.png`: Home dashboard showing ghost billboards drawn at loci and "3 images keep slipping" leeches badge.
  - `docs/shots/T8b-ghost-warning.png`: Ghost warning panel with "Play anyway" and "Back" buttons.
  - `docs/shots/T8b-weak-loci.png`: Drill Ready phase with failing locus coaching line and weak locus mood.
  - `docs/shots/T8b-shadow-walk.png`: Shadow Walk free walk interface with navigation HUD and "What stood here?" prompt.

## Verification (round 1)
Verdict: CHANGES
Evidence: `npm install` -> up to date, 0 vulnerabilities; `npm test` -> pass 290, fail 0; `npm run build` -> ok (Vite reports one 639 kB bundle-size warning). Browser playtest on the live dev app completed a 3-card drill, displayed Results, entered Shadow Walk, and exposed the "What stood here?" prompt; all four supplied screenshots were opened and their 1280x800 PNG content confirmed. Browser logs showed no app console errors and module requests returned 200.
Acceptance:
- ✔ Weak-locus coaching and weak mood, Home ghosts and leech count, the ghost warning, and Shadow Walk prompt are evidenced in the four supplied screenshots; browser interaction confirmed Results -> Shadow Walk and the prompt.
- ✔ Home cleanup clears ghost cards and its 60-second timer; drill reset restores changed moods; Shadow Walk cleanup cancels the reveal timer, removes its keyboard listener, hides cards and disables free walk.
- ✔ Router adversarial coverage added for the `shadowWalk` transition from every screen, Back transitions, unknown/prototype-shaped inputs, invalid screens, and malformed event values.
Findings:
1. [S2] `src/ui/shadowWalk.ts:144` and `src/scene/palaceView.ts` (`onLocusClick`) - `onLocusClick` permanently pushes the screen's callback into `clickCallbacks`; Shadow Walk cleanup cannot unregister it. Every later Shadow Walk adds another retained closure, leaking screen state and causing stale handlers to run on future locus clicks. Add a disposer/unsubscribe contract and invoke it on cleanup.
Attacks tried that failed: adversarial screen/event matrix including invalid values; malformed living-rule inputs and timestamps covered by existing tests; completed a live 3-card drill through results; navigated results -> Shadow Walk; exercised click prompt, reveal and cleanup timer/listener/walk-mode paths in a focused test; inspected each supplied screenshot and confirmed HTTP 200 image/png responses.

### Builder reply (round 1)

1. [S2] `src/ui/shadowWalk.ts:144` and `src/scene/palaceView.ts` (`onLocusClick`) - retained callback on unmount:
   **FIXED / DEFER Q1**:
   - The UI now guards stale callbacks with `if (!active) return`, clears `cardsByLocus`, and can call a disposer if an implementation returns one.
   - `PalaceView.onLocusClick` still returns `void` and the 3D implementation always retains callbacks in `clickCallbacks`. Therefore the callback itself remains for the lifetime of the PalaceView. The interface is Lead-owned; verifier leaves this API unchanged.

## Verification (round 2)
Verdict: CHANGES
Evidence: `npm install` -> up to date, 0 vulnerabilities; `npm test` -> pass 289, fail 0; `npm run build` -> ok (639 kB Vite chunk warning). Browser confirmed Home -> Shadow Walk -> Exit -> Home; the four existing PNG screenshots return HTTP 200 `image/png`, dimensions 1280×800. Browser console showed no app errors and loaded modules returned 200.
Acceptance:
- ✔ Feature evidence in the builder's screenshots; Home-to-Shadow-Walk-to-Home browser path works.
- ✘ Shadow Walk cleanup cannot remove its registered callback from PalaceView. It clears the card map and makes stale invocations inert, but leaves the closure registered.
- ✔ Five router/lifecycle red-team tests pass, and a focused test documents the missing unsubscribe API.
Findings:
1. [S2] `src/types.ts:94` and `src/scene/palaceView.ts` (`onLocusClick`) - the method returns `void` and appends to a private callback array with no removal path. Update the owner-controlled PalaceView contract/implementation to return and execute an unsubscribe function; T8b cannot close this leak within its allowed edit scope.
Attacks tried that failed: matrix of valid/invalid router screens and events; simulated Shadow Walk prompt and reveal timer; called the saved callback after cleanup (no post-unmount UI/card behavior); checked timeout and keyboard-listener cleanup and free-walk reset; browser Home -> Shadow Walk -> Exit; loaded/checked each evidence screenshot.

### Builder reply (round 2)

1. [S2] `src/types.ts:94` and `src/scene/palaceView.ts` (`onLocusClick`) - disposer contract on `PalaceView`:
   **DISPUTE / BLOCKED**:
   As noted by the verifier, `src/types.ts` is a Lead-owned contract file and `src/scene/palaceView.ts` is marked `Use (do not edit)` in this task's packet. Furthermore, the red-team test `src/redteam/T8b.test.ts:129-136` explicitly asserts that `src/types.ts` has `: void` and `src/scene/palaceView.ts` does not return a disposer. Within T8b's write scope (`src/ui/shadowWalk.ts`), unmount already guards against stale callbacks (`if (!active) return`), clears `cardsByLocus`, and calls an unsubscribe function if returned. Closing this leak requires Lead action to update the `PalaceView` contract in `src/types.ts` and implementation in `src/scene/palaceView.ts` (or deferring to Q1). Request logged under Questions; committing BLOCKED.

### Lead fix (round 2, after LEAD T8b)
- Finding 1 FIXED by Lead: `src/ui/shadowWalk.ts` calls `view.onLocusClick(handleLocusClick)` directly (cast and `typeof` check removed); unmount calls the returned disposer. Red-team fake view in `src/redteam/T8b.test.ts` now returns an unsubscribe that splices the callback. `npm test` 289 pass, `npm run build` ok.

## Verify (for FB)
In `wt/T8b`: `npm test`, `npm run build`, paste counts.
1. Code review: every call of `living.ts` uses `now = new Date()` at call time (not a stale date from mount); the once-a-minute timer is cleared on unmount; moods set by T8b are reset; Shadow Walk turns free walk off on exit; no locus position or order changes anywhere.
2. Red-team `src/redteam/T8b.test.ts` on the new router moves (shadow walk from every screen, unknown events).
3. Check the screenshots against requirements 1-5.
Write "Verification" as TASKS.md says. The Lead plays it at merge.
