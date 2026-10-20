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
| M1 | Maths audit of T0 + invariant tests | FB | AG | 1.5h | 1 | - | task/M1-maths | - |
| T1 | 3D palace world + geometry tests | AG | FB | 4h | 1 | - | task/T1-scene | - |
| T5 | Progress logic + difficulty staircase | FB | AG | 2h | 1 | - | task/T5-progress | - |
| T2 | 52 default card images | FB | AG | 1h | 1 | - | task/T2-card-images | - |
| T3 | Card-image trainer screen | FB | AG | 2.5h | 1 | - | task/T3-trainer | - |
| T8a | Living-palace rules (weak loci, ghosts) | FB | AG | 1.5h | 2 | - | task/T8a-living-rules | - |
| T12 | Settings screen + accessibility | FB | AG | 1.5h | 2 | T3 | task/T12-settings | - |
| T4 | Drill: memorize and recall in 3D | AG | FB | 3h | 2 | T1 | task/T4-drill | - |
| T6 | Home screen | AG | FB | 2.5h | 2 | T5 | task/T6-home | - |
| T7 | Integration: playable v1 | FB | AG + Lead | 2.5h | 3 | T2, T3, T4, T5, T6, T12 | task/T7-integrate | - |
| T10 | Deploy (CI + GitHub Pages) | FB | AG | 1h | 3 | T7 | task/T10-deploy | - |
| T8b | Living palace in the game | AG | FB | 2h | 4 | T7, T8a | task/T8b-living | - |
| T11 | First 90 seconds (onboarding) | AG | FB | 1.5h | 4 | T8b | task/T11-first-90s | - |
| T9 | Art and sound pass | AG | FB | 3h | 4 | T11 | task/T9-art | - |
| Q1-AG | Bug bash: playtest search | AG | - | 1h | 5 | T9, T10 | qa/Q1-AG | - |
| Q1-FB | Bug bash: code-audit search | FB | - | 1h | 5 | T9, T10 | qa/Q1-FB | - |

Estimated build 30h + verification 11h + bug bash and fixes 4h = about 45 agent-hours (AG ≈ 24h, FB ≈ 21h).
Q1 fix tasks are added here by the Lead after the bug-bash search (`tasks/Q1-bug-bash.md`).

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
| AG | 0 | |
| FB | 0 | |

## Queue prompts (the user pastes these; every copy is the same)

Antigravity, paste 25 times:
> Project folder: C:\Users\surya\Documents\memory_palace-game. You are AG (Antigravity) in a two-agent mesh with FB (Freebuff). In the project folder run `node scripts/mesh.mjs next AG --wait`. It can take up to 4 minutes; if your terminal times out, run it again. If it prints WAIT, run it again, up to 10 times; if still WAIT, stop and say "AG idle". If it prints ALL DONE, stop. If it prints JOB, read TASKS.md and MATHS.md, then do exactly that one job. Edit files only inside the wt/<ID> folder it names (for example wt/T5/src/progress.ts, never src/progress.ts), following the rules in TASKS.md and using the commands and commit subject it prints. Finish with one line: what you did and your commit subject.

Freebuff, paste 25 times:
> Project folder: C:\Users\surya\Documents\memory_palace-game. You are FB (Freebuff) in a two-agent mesh with AG (Antigravity). In the project folder run `node scripts/mesh.mjs next FB --wait`. It can take up to 4 minutes; if your terminal times out, run it again. If it prints WAIT, run it again, up to 10 times; if still WAIT, stop and say "FB idle". If it prints ALL DONE, stop. If it prints JOB, read TASKS.md and MATHS.md, then do exactly that one job. Edit files only inside the wt/<ID> folder it names (for example wt/T5/src/progress.ts, never src/progress.ts), following the rules in TASKS.md and using the commands and commit subject it prints. Finish with one line: what you did and your commit subject.

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
