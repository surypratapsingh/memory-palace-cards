# Q1 - Bug bash and cross-fix round

- AG and FB, 2h each | Wave 5 (after T9, T11, T13, T14, T15, T16 and T17 are verified; Lead 2026-10-23) | Branches: `qa/Q1-AG`, `qa/Q1-FB` | Worktrees: `wt/Q1-AG`, `wt/Q1-FB`
- When the search is done, commit `Q1-AG: search done, <n> bugs` (or `Q1-FB: ...`). FB also runs `npm run e2e` (T16) as part of its charter. After triage the Lead adds the fix rows above `R1` on the board; `R1` (Lead) is the v1.0 release.

## Goal
Find the bugs that single-task verification missed, estimate how many are still hidden (`MATHS.md` section 11), and fix them.

## Part 1: search (1h each, independently; do not read the other agent's list)

**AG: playtest charter** (browser, `npm run dev`):
1. Fresh profile, first 90 seconds, then 5 drills up the ladder.
2. A 52-card drill end to end, keyboard only.
3. Change the system date or time zone (DevTools > Sensors), cross midnight: Daily Deck and streak.
4. Import: an empty file, a 5 MB file, a save from an older version, a save with a hand-edited bad field.
5. Resize to 1280x720 and 2560x1440; CPU throttle 4x in DevTools: still playable?
6. Colour-safe mode, glide 0, sound on/off.
7. Rapid input: hold Right during memorize, mash keys during recall, double-click every button.

**FB: code-audit charter**:
1. `grep -rn "innerHTML\|outerHTML\|insertAdjacentHTML" src`: every hit safe?
2. Every `addEventListener`, `setInterval`, `setTimeout`, `requestAnimationFrame`, `setAnimationLoop`: removed or cleared on unmount?
3. Every `save(` call: can a result be saved twice or lost?
4. Every `new Date(` and date string: local vs UTC mistakes?
5. Every `JSON.parse`: guarded?
6. Run `npm test` 5 times: any flaky test?
7. Every formula against `MATHS.md`.

Write your bugs to `qa/<AG|FB>-bugs.md`, one per entry:
```
## AG-3 [S2] Daily Deck repeats yesterday's deck after midnight
Steps: ...
Expected: ...
Actual: ...
Evidence: docs/shots/Q1-AG-3.png or file:line
```
Commit on your `qa/` branch. End with: `Q1 search done: <n> bugs`.

## Part 2: the Lead triages
The Lead merges both lists, marks duplicates (same root cause), computes `N`, hidden bugs and the 25% rule (`MATHS.md` section 11), and writes fix tasks on the board: each bug goes to the agent who built that module, verified by the other.

### Triage of `qa/AG-bugs.md` (Lead, 2026-11-10, checked against main at 8694d58)
Q1-FB has not run yet, so there is no second list: no duplicates, no capture-recapture number `N`, and R1 stays open.

| Bug | Verdict | Reason (file:line on main) | Fix row |
|---|---|---|---|
| AG-1 [S1] | CONFIRMED | `src/drill-logic.ts:42-50` returns a new `SaveData` with no `journey`. | Q1-F1 |
| AG-2 [S1] | CONFIRMED | `src/store.ts:91` keeps `drills` as given. `levelOf` (`src/progress.ts:6`) reads `d.sequence.length` on `null` or `{}`. | Q1-F2 |
| AG-3 [S2] | CONFIRMED | `src/ui/home.ts:166` `d.at.startsWith(today)` compares a UTC ISO day with a local day. A daily drill has `seed === localDay`, so the seed check is enough. | Q1-F3 |
| AG-4 [S2] | REJECTED | `src/ui/drill.ts:619` (`updateStepView`) already calls `view.clearCards()` when the next step has no answer, so recall shows one card at a time by design. `skipCurrent` does the same. | - |
| AG-5 [S3] | REJECTED | `toMemorize` removes the keydown listener first (`drill.ts:233`), and `clearOverlay` detaches the Start button, so a real double click cannot reach it twice. Not reproducible with real input. | - |

Fix rows (packet = this file; one commit `<ID>: <summary>`; each with a test that fails before the fix):
- **Q1-F1** (FB builds, AG verifies). Write scope `src/drill-logic.ts`, `src/drill-logic.test.ts`. `applyResult` keeps `journey` (copy the object when present, leave it absent when absent). Test: a save with `journey` keeps it, deep-equal, after `applyResult`.
- **Q1-F2** (FB builds, AG verifies). Write scope `src/store.ts` (the Lead allows this one contract edit: `parse` drops a drill that is not an object, or has no string `at` and `seed`, or whose `sequence` or `answers` is not an array), `src/store.test.ts`. Test: a save with `null`, `{}` and a drill without `sequence` loads, keeps only the valid drills, and `unlockedLevel` does not throw.
- **Q1-F3** (AG builds, FB verifies). Write scope `src/ui/home.ts`, a test file next to it. The "done today" check uses `d.seed === today` only. Test: a daily drill with `seed` of yesterday and `at` of today (UTC) does not count as done today.

## Part 3: fix and verify (1h each)
Fix your assigned bugs in a `fix/<bug-id>` worktree. Every fix comes with a test that failed before it. The other agent verifies with the usual mesh rules.

## Acceptance
- [ ] Both bug lists committed.
- [ ] All S1 and S2 bugs fixed and verified, or accepted as known issues by the Lead.
- [ ] Capture-recapture numbers written in progress.md by the Lead.
