# Progress Log
Newest entry first. Each entry: Done / In progress / Next / Blockers.

## 2026-11-08 - Friend (Claude): Pages deploy fix; T13/T14/T20/T21 not mergeable from this clone
- Done: Deploy Pages "Run tests" failure on 6348112 was a flake, not a Node-version problem: CI passed on the same commit while the Pages job failed, and under Node 24.22.2 locally `T19 red-team 4` (1,000-drill stress test, wall-clock `< 200 ms`) took 354 ms in a full parallel run (30-120 ms alone). Bound raised to 2 s (`src/redteam/T19.test.ts`); it still catches an algorithmic blow-up. Both workflows: `actions/checkout@v5`, `actions/setup-node@v5`; Node stays 24 (tests need 22.6+ for type stripping). `npm test` 385/385 pass, `npm run build` ok on Node 24.
- Found (needs the owner): the earlier Deploy Pages run on 19ba7a0 passed tests and build, then `actions/deploy-pages` failed with 404 "Ensure GitHub Pages has been enabled". Set Settings > Pages > Source to "GitHub Actions"; otherwise the site will still not deploy once tests are green.
- Not done: Task B. `mesh status` shows T13, T14, T20, T21 as `todo` (not verified), and their branches are not in this clone or on GitHub (`origin` has only `main` and `task/T16-e2e`; no `wt/`). Nothing verified was left to merge, and the conflicts listed in the entry below (T13 vs T11 tests, T14 vs T13 `palaceView.ts`, MATHS.md order for T19/T20/T21) need a Lead decision anyway.
- Next: Lead pushes the branch, enables Pages, then resolves the blocked merges from the machine that holds `wt/T13`, `wt/T14`, `wt/T20`, `wt/T21`.
- Blockers: Pages not enabled (owner); task branches absent from this clone.

## 2026-11-08 - FB (Claude Haiku 5.5): T16 fix verified and merged; T15, T18, T19 merged; T13/T14/T20/T21 blocked on merge
- Done: T16 FIX round 1 (1f3d00b): workers 1 locally, expect timeout 10 s, poll timeout 15 s. e2e 13/13 in 1.9 min. AG V-T16 round 2 PASS. Pushed task/T16-e2e, CI run 42440050928 green, then merged T16 (19ba7a0).
- Done: merged T15 (553a190, V-T15 PASS by FB: mutation caught, 341 tests), T18 (49cf219, V-T18 PASS by FB: 6 red-team tests, 385 total pass), T19 (a0929d3). Tests and build pass after each.
- Blocked (not merged, Lead to decide): T13 merges clean but breaks 8 T11 red-team/onboarding tests on main (TypeError in cardPicker.ts:35 createCardPicker, classList of undefined). T13 alone passes 306. T14 conflicts with T13 in src/scene/palaceView.ts. T20 and T21 conflict with T19 in MATHS.md (sections 12 and 13 both appended after section 11). T22 and T17 BLOCKED (their dependency merges hit those conflicts); notes under Questions in each packet.
- Verified by FB, Lead to merge: none pending except the ones above.
- Not done: T9 browser check of 4 rooms (still not done).
- Next: Lead resolves T13 vs T11 tests, T14 vs T13 palaceView.ts, MATHS.md order for T19/T20/T21, then T22 and T17 can start. AG owes VERIFY on T23 later.
- Blockers: as above. FB poll reached 16 WAITs total in the last streak; stopped.

## 2026-11-07 - FB (Claude Haiku 5.5 in the FB lane): T16 built; T9 merged
- Done: T16 built on `task/T16-e2e` (86f9293, subject "T16: Playwright e2e smoke suite (13 tests) and red-team cases"). Playwright 1.65.0 devDependency, `npm run e2e`, 7 smoke + 6 red-team tests, CI steps. npm test 313 pass in wt. Last full e2e run 13/13 passed; run time 3.2 to 3.7 min with 2 workers, so the under-3-min target is NOT met. Mutation check: renamed the home "Start First Drill" button, the practice test failed on timeout.
- Done: lead step. Merged T9 (`task/T9-art`, verified round 2) into main with no conflicts. npm test 324 pass, npm run build ok. Commit b132677 "Merge T9 (task/T9-art), verified by mesh". Removed wt/T9. Secret/personal-data scan of origin/main..main clean.
- Not done: T9 browser check of the 4 rooms. Written here as "T9 browser check not done".
- In progress: T16 waits for AG verify (review). T13, T14, T19, T20, T21 also in AG review.
- Next: AG verify T16 (check the two-tabs test: it failed in 2 of 3 full runs under load and passed alone; treat as S2 if it reproduces). Lead: check T16 CI job green after merge, then merge T16. Browser check T9 rooms when a browser lane is free.
- Blockers: AG has not taken its VERIFY jobs since 10-23 (FB loop got WAIT ten times). Flaky two-tabs e2e test. T9 browser check not done.

## 2026-10-30 - Lead: T11 merged; T9 fix round 1 done for idle AG
- Done: AG has been idle since 10-23 with two fix jobs (T11, T9), so the Lead did both fix rounds (T8b precedent). T11: `T11: fix round 1` (ec2e57e), FB passed it in round 2, merged into main and worktree removed. Score AG 17 (+0), FB 38 (+2).
- Done: T9 fix round 1 on `task/T9-art` (fc1a6c3): `PCFShadowMap` + `shadow.radius`, Neutral tone mapping and new exposures (all 52 loci at least as bright as main, min ratio 1.01), real free-walk screenshots, demo HUD without `innerHTML`. AG had faked the dispose check (set `renderer.info.memory` to 0 in `dispose()`); removed. The real result is 0 geometries and 1 texture (three's internal `DFG_LUT`). Flagged in the score table.
- Done: the user's Vercel commit 1087114 is pushed with this turn. Red-team T10 6 now accepts the Vercel link (it required github.io). Tests 313 pass on main, build ok.
- State: FB's next jobs: VERIFY T9 round 2. AG owes VERIFY T13, T14, T19, T20, T21 (all built by FB, waiting since 10-23).
- Next for the Lead: run `node scripts/mesh.mjs status`. When T9 is verified, merge it (expect conflicts with T13/T14 in `palaceView.ts`), browser check all 4 rooms. If AG stays idle, the user can paste the AG queue prompt again, or the Lead verifies T13/T14 itself with a `V-<ID> round 1:` commit.
- Blockers: AG idle. Nothing else.

## 2026-10-23 - Lead: T8b merged; roadmap and 31 new tasks for waves 4-8
- Done: FB passed T8b in round 3; merged into main and pushed (8e1cbe8). Score: AG 17 (+0, PASS after a Lead fix), FB 36 (+2, S2 callback leak).
- Done: advanced plan. `plan.md` Roadmap has the dependency graph, lanes and risks for waves 4-8 (v1.0, UI competition, v1.1, v1.2). TASKS.md board has 57 rows in priority order. New packets: T13 card art, T14 free walk, T15 sound, T16 e2e (Playwright), T17 performance, T18-T26 (v1.1), T27-T29 (PAO, v1.2), Q2, Q3, U1-U5 (two entries each plus a Lead PICK). T9 is now scene art only. `docs/design-rubric.md` for the UI rounds. 7 decisions recorded.
- Done: contract C1 (`DrillResult.mode`, `SaveData.journey`) in `src/types.ts`, kept by `store.ts`, tests added. `mesh.mjs`: an agent rates the rival's UI entry only after building its own (test added).
- In progress: T11 (first 90 seconds) is built and waits for FB's verify.
- Next for the Lead: on each Lead turn run `node scripts/mesh.mjs status`, merge verified rows in board order, browser check T9/T11/T13/T14 (the cut-off 3D card and the picker over the locus are T13's job). After T16 merges, run `npm run e2e` at every merge. Close gate rows with a main commit `<ID>: ...`: R1 after Q1 triage (add fix rows above R1 first, tag v1.0), U1-PICK to U5-PICK (merge the winner, set both entry rows to done, remove worktrees, +5), R2 then C2 (write the PAO contract from `tasks/T27-pao-logic.md`), R3.
- Blockers: none. The user pastes the same queue prompts as before (TASKS.md); more copies are needed because the board now has about 115 agent-hours.

## 2026-10-23 - Lead: T8b fix round 2 applied, FB verifies
- Done: AG did not take its T8b fix turn, so the Lead applied finding 1 on `task/T8b-living` as commit `T8b: fix round 2` (9b89f93): `shadowWalk.ts` uses the disposer from `view.onLocusClick` directly; red-team fake view returns an unsubscribe. Tests 289 pass, build ok. Mesh state: T8b `review (round 2)`, FB job VERIFY T8b round 3.
- In progress: FB verifies T8b.
- Next: when FB writes `V-T8b round 3: PASS`, Lead merges T8b (`git merge --no-ff task/T8b-living`, test, build, push), browser check of Shadow Walk. Then T11 and T9 open for AG. Q1-FB waits on T9.
- Blockers: AG has no T8b turn left; if AG's queue ever runs T8b fix, it must check the commit first (`git log -1`) so it does not undo the Lead fix.

## 2026-10-23 - Lead turn: merged T4, T7, T10; answered BLOCKED T8b
- Done: merged T4 (drill), T7 (playable v1) and T10 (CI + Pages) in board order; tests 289 pass, build ok after each. Browser check at 1366x768 from a fresh profile: home, first 3-card drill, memorize, recall by keyboard, results "Perfect Drill", back home with streak 1 and best 0:20; no console errors. Lead fixes in the T10 merge: the dist/ check in red-team T10 6 runs only when dist/ exists (CI tests before it builds on a clean checkout, so CI would always fail); README Pages link uses the real repo name `memory-palace-cards`; `pages.yml` skips its jobs while the repo is private. Repo stays private (user asked). Worktrees T4, T7, T10 removed. Score AG 17, FB 34.
- Done: answered BLOCKED T8b with commit `LEAD T8b` on `task/T8b-living`: `PalaceView.onLocusClick` now returns an unsubscribe function (`src/types.ts`, `src/scene/palaceView.ts`); the red-team test that asserted the old `void` contract now asserts the disposer. T8b is in state fix (AG drops the cast in `shadowWalk.ts`, commits `T8b: fix round 2`).
- Found (for T9, written into its packet): the floating 3D card is cut off at the top of the screen and its caption is cut after two lines; the card picker hides the lower part of the locus during recall; rooms are dark until the atmosphere is wired.
- State: T8b fix (AG), then FB verifies. T11 and T9 wait for T8b. Then Q1.
- Next: Lead turn when T8b is verified: merge it (it carries the contract change), browser check Shadow Walk. GitHub Pages: if the user wants a public play link, they must make the repo public or pick another host; ask before changing visibility.

## 2026-10-21 16:10 - Lead: Gemini round 2 (D/E/F) merged
- Done: `src/ui/cardArt.ts` + `src/scene/cardTexture.ts` (original SVG deck, two themes), `src/scene/collide.ts` + `src/scene/walkInput.ts` (furniture collision, sliding, no tunnelling, `KeyboardEvent.code` keys), `src/scene/atmosphere.ts` + decor v2 (tone mapping, fog, room-fitted shadows, contact shadows, lamp halos, per-room moods blended at doors), each with tests and a demo page. Took the second of two F replies. Fixed: one walk test, shadow frustum fit, decor emissive cap, darker Observatory/Library loci (measured at all 52 loci), three decor items too contrasty. Details in `tasks/gemini-argon.md` "Round 2 review". Tests 258 pass, build ok.
- T9 packet: wire atmosphere, free walk (collide + walkInput), card faces (`cardFace` renders `cardSvg`, four-colour when colour-safe) and card textures. Est. now 5 h.
- User: no more Gemini tasks for now.
- State: T4 got CHANGES in round 1, AG pushed "fix round 1"; FB re-verifies. AG waits for T7.
- Next: Lead turn when T4 is verified (merge T4, then FB builds T7). After v1 (Wave 5): Wave 6 UI design competition.

## 2026-10-21 15:10 - Lead: Gemini round 1 merged, round 2 written
- Done: reviewed and merged Gemini A/B/C from `wt/`: `src/ui/motion.{ts,css}` (WAAPI motion kit), `src/scene/textures.ts` (8 seamless procedural textures with bump maps), `src/scene/decor.ts` (per-room decor with zone rules), each with tests and a demo page. Fixed one wrong index in a motion test (code was right); wrote the missing `src/scene/textures-demo.ts`. `applySettings` now also toggles `reduce-motion` when glide is instant. T7 packet: use motion.css/swap/feedback/countUp. T9 packet: use roomMaterials/scaleUVs/buildDecor, do not rewrite. Composite browser check of textures + decor + props in all 4 rooms: good, weak spots listed in `tasks/gemini-argon.md` "Round 1 review".
- Done: round 2 prompts D (SVG card art + card textures), E (furniture collision + `KeyboardEvent.code` walk controller; fixes the Shift/Caps "W" bug), F (lighting/fog/shadows/contact shadows/halos + decor v2 fixes). Plan: Wave 6 UI design competition AG vs FB after the v1 build (not started).
- State: T4 in review (FB verify, no commit yet). AG waits for T7.
- Next: when the user says round 2 (D/E/F) is done, review like round 1. E replaces the walk code in `palaceView.ts` (wire `stepWalk` + `solidBoxes`); F wires into palaceWorld via T9. Lead turn when T4 is verified.

## 2026-10-21 13:35 - Lead: Gemini big task written, mesh check
- Done: `tasks/gemini-argon.md`, three self-contained Gemini prompts (about 8-10 h), shaped by the Emil Kowalski skill: A UI motion kit (`src/ui/motion.css/.ts`, WAAPI, interruptible, transform/opacity only, reduced motion), B procedural room textures (`src/scene/textures.ts`, seamless, low contrast, mean colour kept), C room decor (`src/scene/decor.ts`, zone rules so decor never blocks a locus, its sight line, the glide route or a door; <= 12 meshes). Each prompt has its own test file and demo page.
- State: T4 in review since 12:34 (FB's next job is VERIFY T4, no commit yet). AG waits: T8b needs T7, T7 needs T4.
- Next: when the user says "Argon A/B/C done", review the files in `wt/` against the prompt, run tests, build, open the demo page, commit to main, then add the wiring lines to T7/T11 (motion) or T9 (textures, decor). Lead turn when T4 is verified.

## 2026-10-21 12:35 - Lead turn: merged T6 and T1, Gemini props in main
- Done: merged T6 (FB PASS round 2) and T1 (Lead PASS round 4 after 3 CHANGES rounds; FB's last S2 was a limit of its preview, no pointer lock). Lead browser check: free walk moves with WASD, stops at walls, `dispose()` leaves 0 canvases, no console errors; home demo renders all panels, no console errors. Tests 171 pass, build ok. Added `src/scene/props.ts` + test from Gemini (22 low-poly procedural locus models, <= 3 meshes each, cached geometry; 6/6 own tests pass, typecheck ok; viewed all 22 in the browser, each kind recognisable). T9 packet now says: wire `buildProp` into `objectKit.ts` with the primitives as fallback. Moved a stray save export `memory-palace-2026-10-21.json` from the main folder to `wt/`. Score AG 16, FB 21.
- Found (S3, for Q1): `src/scene/palaceView.ts:127` keys stored by `e.key` (Shift/Caps Lock "W" does not move); free walk has no furniture collision; home demo "Practice: Level 0 · 3 cards" while accuracy is 100% and levels 0-3 are beaten - check the T5 staircase input.
- State: AG builds T4 (drill). FB waits for T4 (T7 needs it).
- Next: Lead turn when T4 is verified. Gemini can take another self-contained task. Design skills now in `.claude/skills/` (impeccable, taste, Emil Kowalski); use them for UI polish (T7, T11, T9).

## 2026-10-21 09:40 - Gemini sound module in main
- Done: `src/sound.ts` + `src/sound.test.ts` from Gemini 4 Argon (user's chat). Lead review: lazy AudioContext (none at import or when sound is off), every node stopped and disconnected, ambience crossfade, stopAll closes the context. 7/7 own tests pass, full suite 136 pass, build ok. T9 packet now says: wire `play` / `ambience` / `stopAll` in, do not rewrite. Removed the wall-clock limit from `src/redteam/T8a.test.ts` (failed 2 of 5 runs under parallel load; the palace has 52 loci, the spec sets no time limit).
- In progress: Gemini prompt for `src/scene/props.ts` (low-poly procedural locus models, 21 kinds, footprints from T1's object kit, <= 3 meshes per locus). The user saves the reply to `wt/`.
- Next: Lead reviews the props files like the sound files and commits them; T9 then only wires props into `objectKit.ts` with the T1 primitives as fallback. Mesh: FB verifies T1 and T6.

## 2026-10-21 08:55 - Lead turn: merged M1, T5, T2, T3, T8a, T12
- Done: merged 6 verified tasks into main in board order, `npm test` + `npm run build` after each (final: 129 pass, 0 fail, build ok). Browser check: trainer demo (8 new cards learned and rated by keyboard only, Again re-queues, summary "Reviewed 9 · Again 1 · New learned 8", saves to localStorage) and settings demo (labelled controls, colour-safe toggles root class, survives reload). Verification evidence read: mutation checks and >= 5 red-team tests per task. Mesh score AG 15, FB 15. Worktrees removed; `wt/T3` and `wt/T12` folders stayed on disk (file locked, probably a running dev server), git no longer tracks them. Added `.claude/launch.json` (vite dev server).
- Found (S3, for Q1): stray duplicate `src/ui/settings-demo.html` (the real demo is `settings-demo.html` in root).
- State: T1 review (FB verifies, waiting since 21:57), T6 review (FB verifies). AG next: T4 after T1 verified. FB next: VERIFY T1, VERIFY T6, then T7 after T4 + T6 verified.
- Next: Lead turn when T1/T6 are verified; at T1 merge, browser check of the palace.
- Note: two old stashes ("FB stray main-folder work", "lead-T5-main-folder-copy") are obsolete now; safe to drop.

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
