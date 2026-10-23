# Q2 - Bug bash for v1.1

- AG and FB, 1h search each | Wave 7 (after T23, T24, T25, T26 and U5-PICK) | Branches: `qa/Q2-AG`, `qa/Q2-FB` | Worktrees: `wt/Q2-AG`, `wt/Q2-FB`

Same method as `tasks/Q1-bug-bash.md` (search independently, Lead triage with capture-recapture, `MATHS.md` section 11, then fix rows). Write bugs to `qa/<AG|FB>-bugs-Q2.md` with ids `AG2-1`, `FB2-1`, and so on. When done: commit `Q2-AG: search done, <n> bugs` (or `Q2-FB: ...`).

## AG: playtest charter
1. The redesigned screens (U1-U5) at 1280x720, 1366x768, 1920x1080 and 2560x1440; colour-safe; reduced motion; keyboard only.
2. Progress screen with a fresh save, 5 drills, and a 300-drill save (make one with the demo harness).
3. Speed Cards: a full deck, the memorize limit, the recall limit, Esc at every phase.
4. Journey trainer: a full session; quit early; next-day reviews (change the system date).
5. Offline: install the app, go offline, play every mode; then update the app while it is open.

## FB: code-audit charter
1. Every new screen since v1.0: listeners, timers and animation loops cleared on unmount.
2. `store.ts` round trip with every optional field (C1: `journey`, `mode`); an import from v1.0 (no new fields) still loads.
3. `insights.ts`, `speed.ts`, `journey.ts`, `achievements.ts` against MATHS.md sections 12-14.
4. Service worker: what is cached, what is never cached, what happens to an old cache.
5. Run `npm test` 5 times and `npm run e2e` 3 times: any flaky test?
6. Bundle budget and the leak test still green; write the numbers.

## Acceptance
- [ ] Both bug lists committed.
- [ ] All S1 and S2 bugs fixed and verified, or accepted as known issues by the Lead.
- [ ] Capture-recapture numbers written in progress.md by the Lead.
