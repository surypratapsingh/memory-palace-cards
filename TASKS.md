# Task Board

Project: 3D memory palace game for memorizing card order. Read `plan.md` for the design and `MATHS.md` for every formula.
`gemini-code-1792500128878.html` is a reference prototype from Gemini, not app code. Do not edit or import it.

## Team
- **Lead / integrator: Claude Code (Opus 5.5).** Owns this board, `MATHS.md`, the contract files (`src/types.ts`, `src/deck.ts`, `src/srs.ts`, `src/store.ts`, `src/style.css` tokens), merges, and settles disputes.
- **AG = Antigravity** (has a browser agent): 3D, game screens, art, browser playtests.
- **FB = Freebuff**: pure logic, maths, tests, data, settings, integration, CI.
- Every task is built by one lane and verified by the other. Nobody verifies their own work.

## Board

| ID | Task | Build | Verify | Est. | Wave | Needs | Branch | Status |
|---|---|---|---|---|---|---|---|---|
| T0 | Foundation: contracts, deck, SRS, storage | Lead | - | - | 0 | - | main | done |
| M1 | Maths audit of T0 + invariant tests | FB | AG | 1.5h | 1 | - | task/M1-maths | todo |
| T1 | 3D palace world + geometry tests | AG | FB | 4h | 1 | - | task/T1-scene | todo |
| T5 | Progress logic + difficulty staircase | FB | AG | 2h | 1 | - | task/T5-progress | todo |
| T2 | 52 default card images | FB | AG | 1h | 1 | - | task/T2-card-images | todo |
| T3 | Card-image trainer screen | FB | AG | 2.5h | 1 | - | task/T3-trainer | todo |
| T8a | Living-palace rules (weak loci, ghosts) | FB | AG | 1.5h | 2 | - | task/T8a-living-rules | todo |
| T12 | Settings screen + accessibility | FB | AG | 1.5h | 2 | T3 | task/T12-settings | todo |
| T4 | Drill: memorize and recall in 3D | AG | FB | 3h | 2 | T1 | task/T4-drill | blocked |
| T6 | Home screen | AG | FB | 2.5h | 2 | T5 | task/T6-home | blocked |
| T7 | Integration: playable v1 | FB | AG + Lead | 2.5h | 3 | T2-T6, T12 | task/T7-integrate | blocked |
| T10 | Deploy (CI + GitHub Pages) | FB | AG | 1h | 3 | T7 | task/T10-deploy | blocked |
| T8b | Living palace in the game | AG | FB | 2h | 4 | T7, T8a | task/T8b-living | blocked |
| T11 | First 90 seconds (onboarding) | AG | FB | 1.5h | 4 | T8b | task/T11-first-90s | blocked |
| T9 | Art and sound pass | AG | FB | 3h | 4 | T11 | task/T9-art | blocked |
| Q1 | Bug bash, cross-fix round | AG + FB | each other | 4h | 5 | T9, T10 | qa/Q1-* | blocked |

Estimated build 30h + verification 11h + bug bash 4h = about 45 agent-hours (AG ≈ 24h, FB ≈ 21h).

Status flow: `todo` -> `in-progress` -> `review` -> `changes` (back to builder) -> `verified` -> `done` (merged by Lead).

### Order per lane (each agent takes the next item; verify jobs come before new builds)
- **AG**: T1 -> verify M1, T5, T2, T3 as they arrive -> T4 -> T6 -> verify T8a, T12, T7, T10 -> T8b -> T11 -> T9 -> Q1.
- **FB**: M1 -> T5 -> T2 -> T3 -> verify T1 -> T8a -> T12 -> verify T4, T6 -> T7 -> T10 -> verify T8b, T11, T9 -> Q1.

## Rules for every agent

1. Read this file, your task file in `tasks/`, `plan.md`, `MATHS.md` and `src/types.ts`. Do only your task.
2. Work in your own git worktree. Never switch branches in the main project folder. From the project root:
   ```
   git worktree add ../mp-T1 -b task/T1-scene
   cd ../mp-T1
   npm install
   ```
   Replace `T1` and the branch with your task's values from the board.
3. Edit only the files in your task's "Write scope". Need another file changed? Stop and write the request under "Questions" in your task file. Contract files belong to the Lead.
4. No new npm dependencies unless your task says so.
5. Code style: like `src/deck.ts`. Small functions, short comments only where the reason is not obvious, no frameworks, erasable TypeScript only (no `enum`, no `namespace`), `.ts` in imports. Never put user or image text into `innerHTML`; use `textContent`.
6. Every formula you implement must match `MATHS.md` exactly. If you think `MATHS.md` is wrong, say so under "Questions" with a counterexample. Do not silently change the maths.
7. Done means: `npm test` passes, `npm run build` passes, every acceptance item is met. Fill the "Report" section, then commit on your branch: `git add -A && git commit -m "T1: <summary>"`. Do not merge. Do not push.
8. End your session with one line for the user: `T1 ready for verification by FB` (or `blocked: <reason>`).

## The mesh: how agents verify each other

The verifier's job is to **break** the builder's work, not to approve it. A PASS from a verifier who did not try hard is worth nothing.

1. Work in the builder's worktree (for example `../mp-T1`). Do not change the builder's code.
2. **Run** `npm install`, `npm test`, `npm run build`. Paste the last lines (pass/fail counts) as evidence.
3. **Red-team tests**: write `src/redteam/<ID>.test.ts` (for example `src/redteam/T1.test.ts`) with at least 5 adversarial tests against the spec: edge cases, bad input, boundaries, invariants from `MATHS.md`. Same style as `src/core.test.ts`. A failing red-team test is a finding.
4. **Playtest** (AG, browser tasks): follow the task's "Verify" list in the dev harness. Save screenshots to `docs/shots/<ID>-<n>.png`.
5. **Code review**: read every changed file. Check the task's "Verify" list, XSS (`innerHTML`), leaked listeners and animation loops, data-loss paths, maths against `MATHS.md`.
6. Append a `## Verification (round N)` section to the task file:
   ```
   Verdict: PASS | CHANGES
   Evidence: npm test -> "pass 31, fail 0"; npm run build -> ok; screenshots: docs/shots/T1-1.png ...
   Acceptance: one line per acceptance item: ✔ or ✘ + proof (command output, file:line, or screenshot)
   Findings:
   1. [S1] src/scene/palaceView.ts:120 - dispose() never removes the keydown listener - remove it in dispose()
   2. [S3] ...
   Attacks tried that failed: (list at least 5 when there are no S1/S2 findings)
   ```
7. Commit only your files: `git add src/redteam docs/shots tasks && git commit -m "V-T1 round 1: CHANGES"`.
8. End with one line for the user: `T1 verified: PASS` or `T1 verified: CHANGES, back to AG`.

**Severity**
- **S1 blocker**: crash, data loss, wrong score or wrong maths, XSS, broken contract, a loci position changed after release.
- **S2 major**: an acceptance item not met, main flow confusing or broken, a leak (listener, animation loop, GPU memory).
- **S3 minor**: polish, naming, small UX. The builder may defer it to Q1 by writing `DEFER Q1` under the finding.

**Verdict**: PASS only with 0 open S1 and 0 open S2, all red-team tests passing, and evidence for every acceptance item. A PASS without evidence is void.

**Builder reply**: under each finding write `FIXED <commit>`, `DEFER Q1` (S3 only), or `DISPUTE: <reason>`. Make red-team tests pass by fixing the code, never by editing the tests. Then ask for the next round.

**Limits**: max 3 rounds. After round 3, or on any `DISPUTE`, the Lead decides. The Lead may delete a red-team test that tests something the spec does not require.

**Mesh score** (the Lead keeps it at merge time; it decides who gets the harder tasks next)
- Verifier: +3 per confirmed S1, +2 per confirmed S2, +1 per confirmed S3, -1 per finding the Lead rejects.
- Builder: +3 for PASS in round 1, +1 for PASS in round 2.

| Agent | Score | Notes |
|---|---|---|
| AG | 0 | |
| FB | 0 | |

## How the user dispatches

Builder prompt:
> Project folder: C:\Users\surya\Documents\memory_palace-game. You are <AG|FB>. Read TASKS.md, MATHS.md, then build task <ID> from tasks/<file>.md. Follow the rules in TASKS.md exactly.

Verifier prompt:
> Project folder: C:\Users\surya\Documents\memory_palace-game. You are <AG|FB>, the verifier of task <ID>. Read TASKS.md ("The mesh") and MATHS.md, then do the "Verify" section of tasks/<file>.md in the folder ../mp-<ID>. Your goal is to break it. Do not change the builder's code.

Fix-round prompt (back to the builder):
> You are <AG|FB>. Read the latest "Verification" section in tasks/<file>.md in ../mp-<ID>. Reply to every finding as TASKS.md says, fix the code, make all red-team tests pass, commit.

After a task is `verified`, tell the Lead (Claude Code): "merge <ID>".

## How the Lead merges (main project folder, branch main)

```
git merge --no-ff task/T1-scene
npm test
npm run build
git worktree remove ../mp-T1
git push
```
Then: visual check in a browser for UI tasks, update the board and the mesh score, add an entry to progress.md, unblock the next tasks. Red-team tests stay in the repo as regression tests.
