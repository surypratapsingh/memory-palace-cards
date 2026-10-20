# T7 - Integration: playable v1

- Builder: Sonnet 5.5 | Verifier: Opus 5.5 | Wave 3 (start after T2, T3, T4, T5, T6 are merged) | Branch: `task/T7-integrate` | Worktree: `../mp-T7`

## Goal
Wire all screens into one app at `index.html`.

## Write scope
- `src/main.ts`, `src/style.css` (add layout rules only), `index.html`

## Requirements
- Boot: `load()` once. Create one `PalaceView` (full window, behind a DOM overlay `#ui`). Keep it for the whole session.
- Routing: home <-> trainer <-> drill using the mount/unmount functions. Only one screen mounted at a time.
- Home: palace in guided mode at locus 0, slightly dimmed (CSS overlay is fine).
- After a drill with a result: `data.streak = updateStreak(data.streak, localDay())`, `save(data)`, show home.
- `replaceSave`: `save(next)`, reload data, remount home.
- Unmount the current screen before mounting the next. No leaked listeners.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Fresh browser profile: home shows the 3-card offer -> drill -> results -> home shows streak 1 and the ladder.
- [ ] Train card images -> back -> grid colours updated.
- [ ] Reload keeps everything. Export then import restores it.

## Questions
## Report

## Verify (for the verifier, Opus)
Full code review of main + all screens for leaks, data loss paths, and XSS. Play the full flow in a browser. Write "Verification".
