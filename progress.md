# Progress Log
Newest entry first. Each entry: Done / In progress / Next / Blockers.

## 2026-10-20 23:20 - Lead turn: nothing to merge
- State: no commits and no file changes in any `wt/` since 22:54. Nothing verified, blocked or in `lead` state. Main folder clean; no stray files in main `src/`.
- Waiting on FB: next job FIX M1 (`wt/M1`), then VERIFY T1, then CONTINUE T5, T2, T3, T8a. AG has no job until FB commits one of these.
- Next: if FB stays idle, check that its queue is running and uses the current prompt (TASKS.md "Queue prompts").

## 2026-10-20 22:55 - Lead: T5 reconciled, main folder clean
- Done: FB's T5 session ended without a commit. Its main-folder `src/progress.ts` (22:44) passes 24/27 tests in `src/progress.test.ts`; the `../mp-T5` copy passes 23/27. Moved the worktree to `wt/T5` and put the main-folder version there, uncommitted; FB's next CONTINUE T5 finishes it (3 failing: dayDiff month end, updateStreak g < 0, freeze cap). Main-folder copy stashed ("lead-T5-main-folder-copy-2244"). All worktrees are now in `wt/`. Main folder clean, BUILD jobs flow.
- State: M1 fix (FB next), T1 review (FB verifies), T5/T2/T3/T8a in-progress (FB), T12 in-progress but waits for T3. AG waits for FB.
- Stash: "FB stray main-folder work 22:08-22:28" holds FB's newest M1 edits (`src/store.ts`, `src/math.test.ts`) that never reached `task/M1-maths`. Use only if FB's fix round asks for them.
- Next: watch that FB now edits `wt/<ID>/...`. If files appear in the main `src/` again, Freebuff must be started with the worktree as its project folder.
- Blockers: none.

## 2026-10-20 22:40 - Lead: Freebuff root cause, worktrees moved into wt/
- Found: Freebuff edits files only in the project folder, whatever folder its shell is in. So M1 was committed from a stale copy (AG gave `V-M1 round 1: CHANGES`), and T2, T3, T8a, T12 files were written into the main folder.
- Done: copied main-folder T2, T3, T8a, T12 work to new branches (`Lead: move ...` commits, state in-progress). Stashed the whole stray set (`git stash list`, "FB stray main-folder work 22:08-22:28") so nothing is lost; M1/T5 copies there are FB's newest edits. Moved worktrees T1, T2, T3, T8a, T12, M1 to `wt/<ID>`; `/wt/` added to `.git/info/exclude`. mesh: worktree path `wt/<ID>`, packet path inside it, `worktree move` for old folders, CONTINUE waits for Needs and merges verified deps. `npm test` scoped to src and scripts (9 pass). Queue prompts now say edit only `wt/<ID>/...`.
- In progress: FB's current T5 session still writes `src/progress.ts` in the main folder and works from `../mp-T5`. When it stops: move `../mp-T5` to `wt/T5`, copy the main-folder T5 files into it, commit them on `task/T5-progress`, clean the main folder.
- Next: FB gets FIX M1 (in `wt/M1`). If FB still writes outside `wt/`, Freebuff must be started with the worktree as its project folder instead.
- Blockers: none.

## 2026-10-20 22:10 - Lead turn: main folder cleaned
- Done: FB had written M1 and T5 files in the main folder (old dispatch). Waited until no file changed for 5 min, then moved them: `src/store.ts` + `src/math.test.ts` to `task/M1-maths` (worktree `../mp-M1`), `src/progress.ts` + `src/progress.test.ts` to `task/T5-progress` (worktree `../mp-T5`). Commits use a `Lead: move ...` subject, so mesh reads both as `in-progress` and FB gets CONTINUE jobs. Files checked byte-identical before main was reset. Main folder is clean, so BUILD jobs flow again.
- State: T1 `review` (FB verifies). M1, T5 `in-progress` (FB). Nothing verified, nothing blocked. No merges this turn.
- Seen, not acted on (AG checks at M1 verify): moved `store.ts` reads `src.streak.lastDay` on an `unknown` value, which likely fails `npm run build`; it also drops the trailing newline.
- Next: Lead turn again when anything is `verified`, `blocked` or `lead`. At T1 merge: browser check of the palace.
- Blockers: none.

## 2026-10-20 - Queue prompts and git-state coordinator
- Done: `scripts/mesh.mjs` (status, next AG|FB --wait) + `scripts/mesh.test.mjs` (3 tests). TASKS.md: board with explicit Needs lists, Q1 split into Q1-AG/Q1-FB, strict commit subjects, queue prompts section. Packets start on "verified" instead of "merged". T1 lock test now written by FB at T1 PASS (`src/redteam/T1-lock.test.ts`); T9 updated. Supersedes the previous entry's "Next" (no manual dispatch, no Lead lock test).
- Found: agents had started under the old dispatch. AG is building T1 in `../mp-T1` (correct). FB started M1 in the main folder (wrong place): uncommitted `src/store.ts` + `src/math.test.ts`. Not committed by the Lead.
- In progress: moving FB's M1 work to branch `task/M1-maths` in `../mp-M1` once FB's current session stops writing.
- Next: Lead turn = `node scripts/mesh.mjs status`; if the main folder is dirty with agent work, move it to the task branch; merge verified tasks; answer blocked/lead tasks; push. Agents run the queue prompts in TASKS.md.
- Blockers: none.

## 2026-10-20 - Mesh replan for Antigravity + Freebuff, MATHS.md, GitHub
- Done: Replaced the Sonnet/Haiku assignment with a two-lane mesh: AG builds 3D/UI, FB builds logic/maths/settings/integration/CI, each verifies the other (TASKS.md "The mesh": red-team tests, mutation checks, severity, evidence, mesh score). New packets: M1 maths audit, T8a living rules, T8b living palace, T9, T10, T11 first 90 s, T12 settings, Q1 bug bash; T1-T7 rewritten. MATHS.md written and numbers checked against the code. Contracts: SaveData.settings, showCard opacity, setGlideMs, save() never throws, strength colour tokens in style.css. 6 tests pass, build passes. Old unrelated README moved to docs/agent-orchestrator-README.md. GitHub repo created (private) and pushed.
- In progress: nothing.
- Next: User dispatches Wave 1 in parallel: AG builds T1; FB builds M1, then T5, T2, T3 (in that order). AG verifies FB's tasks as they finish; FB verifies T1. When a task is verified, the user tells the Lead "merge <ID>". At the T1 merge the Lead adds `src/data/palace.lock.test.ts` (frozen loci positions, see T9) and does the browser check.
- Blockers: none.

## 2026-10-20 - Cards-first replan, foundation (T0), task packets
- Done: Replanned for cards + order + 3D + desktop (plan.md). Reviewed Gemini prototype (decisions.md). Built T0: Vite + TS scaffold, `src/types.ts` contracts, `src/deck.ts`, `src/srs.ts`, `src/store.ts`, `src/ui/cardFace.ts`, 6 passing tests (`npm test`), build passes. Wrote TASKS.md board + rules and packets in tasks/. git repo initialised on main.
- In progress: nothing.
- Next: User dispatches Wave 1 in parallel: T1 (Sonnet), T2 (Haiku), T3 (Freebuff), T5 (Haiku). Then their verifiers. Integrator merges verified branches, then unblocks T4 and T6.
- Blockers: GitHub remote not set up (needed for push and T10).

## 2026-10-20 - Research and plan
- Done: Researched method of loci evidence, VR palace study, FSRS, existing apps (research.md). Wrote plan.md, decisions.md.
- Next: Start M1.
- Note: README.md in this folder describes an unrelated "Agent Orchestrator" skill. Left untouched.

## 2026-10-20 - Project started
- Done: memory files created
- Next: fill in plan.md
