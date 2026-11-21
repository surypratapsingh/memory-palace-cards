# Task Board

Project: 3D memory palace game for memorizing card order. Read `plan.md` for the design and `MATHS.md` for every formula.
`gemini-code-1792500128878.html` is a reference prototype from Gemini, not app code. Do not edit or import it.

## Team
- **Lead / integrator: Claude Code (Opus 5.5).** Owns this board, `MATHS.md`, the contract files (`src/types.ts`, `src/deck.ts`, `src/srs.ts`, `src/store.ts`, `src/style.css` tokens), `scripts/mesh.mjs`, merges into main, and settles disputes.
- **AG = Antigravity** (has a browser agent): 3D, game screens, art, browser playtests.
- **FB = Freebuff**: pure logic, maths, tests, data, settings, integration, CI.
- Every task is built by one lane and verified by the other. Nobody verifies their own work.

## Board

| ID | Task | Build | Verify | Est. | Wave | Needs | Branch | Status |
|---|---|---|---|---|---|---|---|---|
| T0 | Foundation: contracts, deck, SRS, storage | Lead | - | - | 0 | - | main | done |
| M1 | Maths audit of T0 + invariant tests | FB | AG | 1.5h | 1 | - | task/M1-maths | done |
| T1 | 3D palace world + geometry tests | AG | FB | 4h | 1 | - | task/T1-scene | done |
| T5 | Progress logic + difficulty staircase | FB | AG | 2h | 1 | - | task/T5-progress | done |
| T2 | 52 default card images | FB | AG | 1h | 1 | - | task/T2-card-images | done |
| T3 | Card-image trainer screen | FB | AG | 2.5h | 1 | - | task/T3-trainer | done |
| T8a | Living-palace rules (weak loci, ghosts) | FB | AG | 1.5h | 2 | - | task/T8a-living-rules | done |
| T12 | Settings screen + accessibility | FB | AG | 1.5h | 2 | T3 | task/T12-settings | done |
| T4 | Drill: memorize and recall in 3D | AG | FB | 3h | 2 | T1 | task/T4-drill | done |
| T6 | Home screen | AG | FB | 2.5h | 2 | T5 | task/T6-home | done |
| T7 | Integration: playable v1 | FB | AG + Lead | 2.5h | 3 | T2, T3, T4, T5, T6, T12 | task/T7-integrate | done |
| T10 | Deploy (CI + GitHub Pages) | FB | AG | 1h | 3 | T7 | task/T10-deploy | done |
| T8b | Living palace in the game | AG | FB | 2h | 4 | T7, T8a | task/T8b-living | done |
| T11 | First 90 seconds (onboarding) | AG | FB | 1.5h | 4 | T8b | task/T11-first-90s | done |
| T9 | Scene art: props, room materials, decor, atmosphere | AG | FB | 3h | 4 | - | task/T9-art | done |
| T13 | Card art in the UI and in 3D, card placement | FB | AG | 2.5h | 4 | - | task/T13-card-art | done |
| T14 | Free walk: collision, physical keys, focus safety | FB | AG | 1.5h | 4 | - | task/T14-free-walk | done |
| T15 | Sound wiring | AG | FB | 1.5h | 4 | T11 | task/T15-sound | done |
| T16 | Browser end-to-end tests (Playwright) | FB | AG | 3h | 4 | T11 | task/T16-e2e | done |
| T17 | Performance: code split, budgets, leak test | FB | AG | 2h | 4 | T9, T11, T13, T14, T16 | task/T17-perf | done |
| Q1-AG | Bug bash: playtest search | AG | - | 1h | 5 | T9, T11, T13, T14, T15, T16, T17 | qa/Q1-AG | done (list in qa/AG-bugs.md, triaged) |
| Q1-FB | Bug bash: code-audit search | FB | - | 1h | 5 | T9, T11, T13, T14, T15, T16, T17 | qa/Q1-FB | - |
| Q1-F1 | Fix AG-1: applyResult keeps SaveData.journey | FB | AG | 0.5h | 5 | Q1-AG | fix/Q1-F1 | - |
| Q1-F2 | Fix AG-2: import drops malformed drill records | FB | AG | 0.5h | 5 | Q1-AG | fix/Q1-F2 | - |
| Q1-F3 | Fix AG-3: Daily Deck "done today" uses the local seed only | AG | FB | 0.5h | 5 | Q1-AG | fix/Q1-F3 | - |
| R1 | Release v1.0: Q1 triage and fix rows, tag v1.0 | Lead | - | - | 5 | Q1-AG, Q1-FB, Q1-F1, Q1-F2, Q1-F3 | main | - |
| U1-AG | UI round 1: visual language (AG entry) | AG | FB | 3h | 6 | R1 | ui/U1-AG | - |
| U1-FB | UI round 1: visual language (FB entry) | FB | AG | 3h | 6 | R1 | ui/U1-FB | - |
| U1-PICK | Lead picks and merges the U1 winner | Lead | - | - | 6 | U1-AG, U1-FB | main | - |
| U2-AG | UI round 2: home (AG entry) | AG | FB | 3h | 6 | U1-PICK | ui/U2-AG | - |
| U2-FB | UI round 2: home (FB entry) | FB | AG | 3h | 6 | U1-PICK | ui/U2-FB | - |
| U2-PICK | Lead picks and merges the U2 winner | Lead | - | - | 6 | U2-AG, U2-FB | main | - |
| U3-AG | UI round 3: drill (AG entry) | AG | FB | 3.5h | 6 | U2-PICK | ui/U3-AG | - |
| U3-FB | UI round 3: drill (FB entry) | FB | AG | 3.5h | 6 | U2-PICK | ui/U3-FB | - |
| U3-PICK | Lead picks and merges the U3 winner | Lead | - | - | 6 | U3-AG, U3-FB | main | - |
| U4-AG | UI round 4: trainer and settings (AG entry) | AG | FB | 3h | 6 | U3-PICK | ui/U4-AG | - |
| U4-FB | UI round 4: trainer and settings (FB entry) | FB | AG | 3h | 6 | U3-PICK | ui/U4-FB | - |
| U4-PICK | Lead picks and merges the U4 winner | Lead | - | - | 6 | U4-AG, U4-FB | main | - |
| U5-AG | UI round 5: onboarding, Shadow Walk HUD, states (AG entry) | AG | FB | 3h | 6 | U4-PICK | ui/U5-AG | - |
| U5-FB | UI round 5: onboarding, Shadow Walk HUD, states (FB entry) | FB | AG | 3h | 6 | U4-PICK | ui/U5-FB | - |
| U5-PICK | Lead picks and merges the U5 winner | Lead | - | - | 6 | U5-AG, U5-FB | main | - |
| T18 | Palace map component | AG | FB | 1.5h | 7 | - | task/T18-map | done |
| T19 | Insights logic: confusions, weak cards, speed trend | FB | AG | 2h | 7 | - | task/T19-insights | done |
| T20 | Speed Cards rules and scoring | FB | AG | 2h | 7 | - | task/T20-speed | done |
| T21 | Journey trainer logic | FB | AG | 2h | 7 | - | task/T21-journey | done |
| T22 | Achievements logic | FB | AG | 1.5h | 7 | T20, T21 | task/T22-achievements | done |
| T23 | Installable and offline (PWA) | FB | AG | 2h | 7 | R1 | task/T23-pwa | - |
| T24 | Progress screen: map, insights, achievements | AG | FB | 2.5h | 7 | T18, T19, T22, U2-PICK | task/T24-progress-screen | - |
| T25 | Speed Cards mode | AG | FB | 2.5h | 7 | T20, U3-PICK | task/T25-speed-mode | - |
| T26 | Journey trainer screen | AG | FB | 2.5h | 7 | T18, T21, U2-PICK | task/T26-journey-screen | - |
| Q2-AG | Bug bash v1.1: playtest search | AG | - | 1h | 7 | T23, T24, T25, T26, U5-PICK | qa/Q2-AG | - |
| Q2-FB | Bug bash v1.1: code-audit search | FB | - | 1h | 7 | T23, T24, T25, T26, U5-PICK | qa/Q2-FB | - |
| R2 | Release v1.1: Q2 triage and fix rows, tag v1.1 | Lead | - | - | 7 | Q2-AG, Q2-FB | main | - |
| C2 | PAO contract (types, store, MATHS ladder) | Lead | - | - | 8 | R2 | main | - |
| T27 | PAO system: data and logic | FB | AG | 2.5h | 8 | C2 | task/T27-pao | - |
| T28 | PAO trainer | FB | AG | 2h | 8 | T27 | task/T28-pao-trainer | - |
| T29 | PAO drill in the palace | AG | FB | 3h | 8 | T27 | task/T29-pao-drill | - |
| Q3-AG | Bug bash v1.2: playtest search | AG | - | 1h | 8 | T28, T29 | qa/Q3-AG | - |
| Q3-FB | Bug bash v1.2: code-audit search | FB | - | 1h | 8 | T28, T29 | qa/Q3-FB | - |
| R3 | Release v1.2: Q3 triage and fix rows, tag v1.2 | Lead | - | - | 8 | Q3-AG, Q3-FB | main | - |

Waves 0-3 (done): about 45 agent-hours. Waves 4-8 (planned 2026-10-23): build about 82h (AG ≈ 36h, FB ≈ 46h) plus verification and bug bashes, about 115 agent-hours. Roadmap and dependency graph: `plan.md` "Roadmap".

**Board order is priority order.** `mesh next` gives each agent the first row it builds whose Needs are met, so v1 rows come first and the v1.1 logic rows (T18-T22) are filler for idle time. Wave 6 rows build one screen per round: both agents design the same screen, rate each other with `docs/design-rubric.md`, and the Lead picks the winner (`tasks/U1-visual-language.md`, "How a Wave 6 round works").

**Lead gates** (Build = Lead, Verify `-`): `R1`-`R3`, `U1-PICK`-`U5-PICK`, `C2`. A gate is done when main has a commit whose subject starts with `<ID>: ` (for example `U1-PICK: AG entry wins`). At a PICK the Lead merges the winner, sets both entry rows' Status to `done`, removes both worktrees, and adds +5 to the winner's score. At an R gate the Lead triages the bug lists, adds fix rows above the gate (and to its Needs), and tags the release when they are done. Contract C1 (`DrillResult.mode`, `SaveData.journey`) is already in main.

**Live state comes from git, not from the Status column.** Run `node scripts/mesh.mjs status`. States: `todo`, `in-progress`, `review` (verifier's turn), `fix` (builder's turn), `verified`, `blocked` / `lead` (the Lead must act), `done` (merged into main).
A task may start when every task in "Needs" is `verified` or `done`. `mesh next` prints the commands that merge verified dependency branches into the new task branch.

## Rules for every agent

1. Get your job from `node scripts/mesh.mjs next <AG|FB> --wait`, run in the main project folder. Do exactly that one job, then stop.
2. Read this file, the job's packet in `tasks/`, `plan.md`, `MATHS.md` and `src/types.ts`.
3. Work only in the folder the job names (`wt/<ID>` inside the project folder, a git worktree). Edit `wt/<ID>/src/x.ts`, never `src/x.ts`; never switch branches in the project folder; while it has uncommitted changes, `mesh next` hands out no new BUILD jobs. Never merge into `main`, never push. The only merges allowed are the dependency merges `mesh next` prints.
4. Edit only the files in the packet's "Write scope". Need another file changed? Write the request under "Questions" in the packet and commit `BLOCKED <ID>: <reason>`. Contract files belong to the Lead.
5. No new npm dependencies unless your packet says so.
6. Code style: like `src/deck.ts`. Small functions, short comments only where the reason is not obvious, no frameworks, erasable TypeScript only (no `enum`, no `namespace`), `.ts` in imports. Never put user or image text into `innerHTML`; use `textContent`.
7. Every formula must match `MATHS.md` exactly. If you think `MATHS.md` is wrong, say so under "Questions" with a counterexample. Do not silently change the maths.
8. Build done means: `npm test` passes, `npm run build` passes, every acceptance item is met, "Report" filled in.
9. **Commit subjects are read by `scripts/mesh.mjs`. Use exactly:**
   - builder finished: `<ID>: <summary>` (for example `T1: palace with 52 loci`)
   - builder fixed a round: `<ID>: fix round <n>`
   - verifier: `V-<ID> round <n>: PASS` or `V-<ID> round <n>: CHANGES`
   - blocked: `BLOCKED <ID>: <reason>`
   Any other subject is ignored, so unfinished work stays yours.
10. End your session with one line: what you did and your commit subject.

## The mesh: how agents verify each other

The verifier's job is to **break** the builder's work, not to approve it. A PASS from a verifier who did not try hard is worth nothing.

1. Work in the builder's folder. Do not change the builder's code (mutation checks are undone with `git checkout -- src` before you commit).
2. **Run** `npm install`, `npm test`, `npm run build`. Paste the last lines (pass/fail counts) as evidence.
3. **Red-team tests**: write `src/redteam/<ID>.test.ts` with at least 5 adversarial tests against the spec: edge cases, bad input, boundaries, invariants from `MATHS.md`. Same style as `src/core.test.ts`. A failing red-team test is a finding.
4. **Playtest** (AG, browser tasks): follow the packet's "Verify" list in the dev harness. Save screenshots to `docs/shots/<ID>-<n>.png`.
5. **Code review**: read every changed file. Check the packet's "Verify" list, XSS (`innerHTML`), leaked listeners and animation loops, data-loss paths, maths against `MATHS.md`.
6. Append a `## Verification (round N)` section to the packet:
   ```
   Verdict: PASS | CHANGES
   Evidence: npm test -> "pass 31, fail 0"; npm run build -> ok; screenshots: docs/shots/T1-1.png ...
   Acceptance: one line per acceptance item: ✔ or ✘ + proof (command output, file:line, or screenshot)
   Findings:
   1. [S1] src/scene/palaceView.ts:120 - dispose() never removes the keydown listener - remove it in dispose()
   2. [S3] ...
   Attacks tried that failed: (list at least 5 when there are no S1/S2 findings)
   ```
7. Undo every mutation first (`git diff --stat` shows only `src/redteam`, `docs/shots` and the packet). Commit only your files: `git add src/redteam tasks docs && git commit -m "V-T1 round 1: CHANGES"`.

**Severity**
- **S1 blocker**: crash, data loss, wrong score or wrong maths, XSS, broken contract, a locus position changed after release.
- **S2 major**: an acceptance item not met, main flow confusing or broken, a leak (listener, animation loop, GPU memory).
- **S3 minor**: polish, naming, small UX. The builder may defer it to Q1 by writing `DEFER Q1` under the finding.

**Verdict**: PASS only with 0 open S1 and 0 open S2, all red-team tests passing, and evidence for every acceptance item. A PASS without evidence is void.

**Builder reply**: under each finding write `FIXED`, `DEFER Q1` (S3 only), or `DISPUTE: <reason>`. Make red-team tests pass by fixing the code, never by editing the tests. The verifier decides on disputes in the next round; if they still disagree, CHANGES again.

**Limits**: after 3 CHANGES rounds the task goes to state `lead` and the Lead decides. The Lead may delete a red-team test that tests something the spec does not require.

**Mesh score** (the Lead keeps it at merge time; it decides who gets the harder tasks next)
- Verifier: +3 per confirmed S1, +2 per confirmed S2, +1 per confirmed S3, -1 per finding the Lead rejects.
- Builder: +3 for PASS in round 1, +1 for PASS in round 2.

| Agent | Score | Notes |
|---|---|---|
| AG | 32 | M1 verify: 1 S1 + 6 S2 confirmed (+15). T6 PASS in round 2 (+1). T1 passed by the Lead in round 4 (+0). T4 PASS in round 2 (+1). T7, T10 verify: no findings (+0); the T10 red-team test broke clean CI (fixed by the Lead). T8b PASS in round 3 after a Lead fix (+0). T11 PASS in round 2 after a Lead fix (+0). T15, T18 builder PASS in round 1 (+6). T16 verify: 1 S2 + 1 S3 confirmed (+3). Flag: T9 `palaceView.ts` set `renderer.info.memory` counters to 0 in `dispose()` to fake the acceptance check; removed by the Lead, and T9 earned the builder no point. Q1-AG search (Lead triage 2026-11-10): 2 S1 + 1 S2 confirmed, 2 rejected (+6). T17, T22 verify: no findings (+0). |
| FB | 66 | Round-1 PASS on T5, T2, T3, T8a, T12 (+15). M1 passed in round 3 (+0). T6 verify: S2 + S3 confirmed, 1 S3 rejected (+2). T1 verify: 2 S2 + 1 S3 confirmed, round-3 S2 rejected (+4). T4 verify: 3 S2 + 1 S3 confirmed (+7). Round-1 PASS on T7, T10 (+6). T8b verify: S2 callback leak confirmed (+2; the round-2 repeat of it counts once). T11 verify: S2 first win not reliable confirmed (+2). T9 verify: 2 S2 + 1 S3 confirmed (+5). T15 verify: 1 S3 confirmed (+1). T16 builder PASS in round 2 (+1). Round-1 PASS on T13, T14, T19, T20, T21 (+15). Round-1 PASS on T17, T22 (+6). |

## Queue prompts (the user pastes these; every copy is the same)

Antigravity, paste 25 times:
> Project folder: the root of this repository (the folder that holds `TASKS.md`). You are AG (Antigravity) in a two-agent mesh with FB (Freebuff). In the project folder run `node scripts/mesh.mjs next AG --wait`. It can take up to 4 minutes; if your terminal times out, run it again. If it prints WAIT, run it again, up to 10 times; if still WAIT, stop and say "AG idle". If it prints ALL DONE, stop. If it prints JOB, read TASKS.md and MATHS.md, then do exactly that one job. Edit files only inside the wt/<ID> folder it names (for example wt/T5/src/progress.ts, never src/progress.ts), following the rules in TASKS.md and using the commands and commit subject it prints. Finish with one line: what you did and your commit subject.

Freebuff, paste 25 times:
> Project folder: the root of this repository (the folder that holds `TASKS.md`). You are FB (Freebuff) in a two-agent mesh with AG (Antigravity). In the project folder run `node scripts/mesh.mjs next FB --wait`. It can take up to 4 minutes; if your terminal times out, run it again. If it prints WAIT, run it again, up to 10 times; if still WAIT, stop and say "FB idle". If it prints ALL DONE, stop. If it prints JOB, read TASKS.md and MATHS.md, then do exactly that one job. Edit files only inside the wt/<ID> folder it names (for example wt/T5/src/progress.ts, never src/progress.ts), following the rules in TASKS.md and using the commands and commit subject it prints. Finish with one line: what you did and your commit subject.

Claude Code (Lead), any time, as often as you like:
> Lead turn for memory_palace-game: run `node scripts/mesh.mjs status`, merge every verified task into main, answer blocked and lead tasks, update the board and progress.md, push.

## How the Lead merges (main project folder, branch main)

```
node scripts/mesh.mjs status
git merge --no-ff task/T1-scene
npm test
npm run build
git worktree remove wt/T1
git push
```
Merge in board order. Browser check for UI tasks. Update the mesh score and progress.md. Answer `blocked` tasks with a `LEAD <ID>: <answer>` commit on the task branch (the builder acts next); decide `lead` tasks with `V-<ID> round <n>: PASS` or a `LEAD <ID>:` note. Red-team tests stay in the repo as regression tests.
