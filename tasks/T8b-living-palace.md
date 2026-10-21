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

## Verify (for FB)
In `wt/T8b`: `npm test`, `npm run build`, paste counts.
1. Code review: every call of `living.ts` uses `now = new Date()` at call time (not a stale date from mount); the once-a-minute timer is cleared on unmount; moods set by T8b are reset; Shadow Walk turns free walk off on exit; no locus position or order changes anywhere.
2. Red-team `src/redteam/T8b.test.ts` on the new router moves (shadow walk from every screen, unknown events).
3. Check the screenshots against requirements 1-5.
Write "Verification" as TASKS.md says. The Lead plays it at merge.
