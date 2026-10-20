# T8b - Living palace in the game

- Build: AG | Verify: FB | Est. 2h | Wave 4 (start after T7 and T8a are merged) | Branch: `task/T8b-living` | Worktree: `../mp-T8b`

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
- [ ] `npm test` and `npm run build` pass.
- [ ] Weak loci, ghosts, ghost warning and Shadow Walk all visible in the app. Screenshots of each.
- [ ] Unmount leaves no moods, cards, timers or listeners.

## Questions
## Report

## Verify (for FB)
In `../mp-T8b`: `npm test`, `npm run build`, paste counts.
1. Code review: every call of `living.ts` uses `now = new Date()` at call time (not a stale date from mount); the once-a-minute timer is cleared on unmount; moods set by T8b are reset; Shadow Walk turns free walk off on exit; no locus position or order changes anywhere.
2. Red-team `src/redteam/T8b.test.ts` on the new router moves (shadow walk from every screen, unknown events).
3. Check the screenshots against requirements 1-5.
Write "Verification" as TASKS.md says. The Lead plays it at merge.
