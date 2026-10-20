# T7 - Integration: playable v1

- Build: FB | Verify: AG (browser playtest) + Lead (code review) | Est. 2.5h | Wave 3 (start after T2, T3, T4, T5, T6, T12 are verified) | Branch: `task/T7-integrate` | Worktree: `../mp-T7`

## Goal
Wire all screens into one app at `index.html`.

## Write scope
- `src/main.ts`, `index.html`, `src/style.css` (layout rules only, keep the tokens)
- `src/router.ts`, `src/router.test.ts` (new, pure screen state machine)

## Requirements
- Boot: `load()` once. On a fresh save (no drills, no srs, nothing in storage) set `settings.glideMs = 0` when `matchMedia('(prefers-reduced-motion: reduce)').matches`.
- After `load()` and after every import: `data.settings = sanitizeSettings(data.settings)` (T12).
- Apply settings at boot and after every change: `view.setGlideMs(data.settings.glideMs)`, `applySettings(data.settings)` from T12.
- One `PalaceView` (full window, behind a DOM overlay `#ui`) for the whole session.
- `src/router.ts`: `type Screen = 'home' | 'train' | 'drill' | 'settings'` and a pure `next(screen, event)` function. Test every allowed move and that an unknown move keeps the screen.
- Only one screen mounted at a time. Always unmount the current screen before mounting the next.
- Home: palace in guided mode at locus 0, slightly dimmed (CSS overlay is fine).
- After a drill with a result: `data.streak = updateStreak(data.streak, localDay())`, `save(data)`, show home.
- `replaceSave`: `save(next)`, reload data, re-apply settings, remount home.
- Storage write errors: `save()` never throws. Register `setSaveErrorHandler` from `src/store.ts` at boot to show a small banner "Progress could not be saved. Export a backup."

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Fresh browser profile: home shows the 3-card offer -> drill -> results -> home shows streak 1 and the ladder.
- [ ] Train card images -> back -> grid colours updated.
- [ ] Settings change glide speed and colour-safe mode, both kept after reload.
- [ ] Reload keeps everything. Export then import restores it.

## Questions
## Report

## Verify (AG playtest, then Lead code review)
In `../mp-T7`: `npm install`, `npm test`, `npm run build`, paste counts, `npm run dev`, open http://localhost:5173/ in a fresh profile (or clear site data).
1. Play the full first-run flow: 3 cards -> results -> home. Streak 1.
2. Train 8 card images. Back. Grid colours changed.
3. Play 13 cards with one deliberate mistake; that locus is weak during results; home sparkline updated.
4. Settings: glide 0, colour-safe on. Reload: both kept.
5. Export, clear site data, import: everything back.
6. Switch screens 20 times quickly (home -> train -> home -> drill -> Esc ...). Then in the console check `getEventListeners(window)` (Chrome) or count listeners: no growth. Note the JS heap before and after.
7. Red-team `src/redteam/T7.test.ts` on `router.ts`: unknown events, every screen x every event.
Write "Verification" as TASKS.md says. Then the Lead reviews all of `src/` for leaks, data-loss paths and XSS.
