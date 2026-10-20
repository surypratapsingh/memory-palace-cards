# Decision Log
Format per entry:
## YYYY-MM-DD - Decision title
- Decision:
- Context:
- Alternatives rejected:
- Consequences:

## 2026-10-20 - "Self-changing" palace changes appearance and route, not item positions
- Decision: The palace reacts to memory state by fading/glowing items (FSRS retrievability), lighting the daily walk route, flagging leeches for user-driven repair, and unlocking rooms. Items stay at their locus unless the user moves them during leech repair.
- Context: In the method of loci the location is the retrieval cue. Moving an item breaks the cue the user learned and causes interference.
- Alternatives rejected: Auto-reorder items by memory strength (weak items to the entrance); reshuffle rooms each session.
- Consequences: Spatial memory stays stable. The "change" the user sees is visual state, route, and growth.

## 2026-10-20 - FSRS via ts-fsrs for scheduling
- Version part superseded by "ts-fsrs 5.4.2 (stable), not 6.0 beta". FSRS choice still valid.
- Decision: Use `ts-fsrs` (MIT, v6, FSRS-7 default).
- Context: Need spaced repetition plus a per-item recall probability to drive the visuals. FSRS gives retrievability directly.
- Alternatives rejected: SM-2 (no retrievability value, older); custom algorithm.
- Consequences: Node >= 24 needed to build (machine has v24.19.0). One dependency.

## 2026-10-20 - 2D SVG floor plan first, three.js 3D walk second
- Superseded by "3D first-person palace, desktop first" (2026-10-20, user request).
- Decision: M1 renders the palace as a 2D SVG floor plan. 3D first-person walk comes in M3 on the same data.
- Context: The learning loop must be proven first. Krokos et al. 2019 show desktop virtual palaces work; immersion adds about 8.8%.
- Alternatives rejected: 3D from day one (slow to build, delays the core loop); photo-only palace (needs image storage and upload flow first).
- Consequences: Fast MVP that also works on phones. 3D is an extra view, not a rewrite.

## 2026-10-20 - Palace built from the user's own places via questions
- Superseded for v1 by "Fixed default 3D palace with 52 loci" (2026-10-20). Own-place builder moved to Later.
- Decision: Onboarding asks about the user's real home/route and turns answers into rooms and ordered loci.
- Context: Familiar places give the strongest loci for free and need no 3D assets. This is the "asks you questions" and "personalized" part of the request.
- Alternatives rejected: Prebuilt fantasy palaces only (unfamiliar, must be memorized first).
- Consequences: Prebuilt palaces can come later as an option for users who prefer them.

## 2026-10-20 - Vanilla TypeScript + Vite, local-only storage
- Still valid. Tests use `node --test` instead of a framework (see below).
- Decision: No UI framework, no backend. JSON in localStorage with export/import.
- Context: Small UI, single user, fastest path to a working app.
- Alternatives rejected: React (extra weight for a few forms); backend with accounts (not needed for one user).
- Consequences: Data lives in one browser; export file is the backup. Add IndexedDB with images, sync only if asked.

## 2026-10-20 - Cards first: memorize the order of a shuffled deck
- Decision: v1 content is playing cards. The game is about recalling the order. Three layers: card images (FSRS, long term), fixed journey (long term), deck order (short-term drill).
- Context: User request. Card order is the classic memory-sports event and has clear scoring.
- Alternatives rejected: general flashcards first; PAO (3 cards per locus) in v1 (too hard for beginners, kept for Later).
- Consequences: Need 52 default card images and 52 loci. Engine reused later for any ordered list.

## 2026-10-20 - 3D first-person palace, desktop first
- Decision: three.js first-person palace with guided glide (fast, ordered) plus optional free walk (WASD + mouse look).
- Context: User wants 3D walking on desktop. Krokos et al. 2019: immersive spatial view helps recall.
- Alternatives rejected: 2D floor plan (superseded), react-three-fiber (adds React for little gain), Unity/WebGL export (heavy, slow to iterate).
- Consequences: three.js is the only rendering dependency. Mobile is out of v1.

## 2026-10-20 - Fixed default 3D palace with 52 loci
- Decision: One handcrafted palace: 4 themed rooms x 13 loci. Positions are permanent once released.
- Context: Modelling each user's real home in 3D is not feasible. Card drills need 52 loci. Rooms must look different to reduce interference.
- Alternatives rejected: procedural rooms from user answers (weak distinctness); photo backgrounds (no walking).
- Consequences: Art pass (T9) may restyle objects but must never move loci.

## 2026-10-20 - Review of the Gemini "LociVerse" prototype
- Decision: Keep its ideas: path ribbon, distinct room ambience, Shadow Walk, "what stood here?" recall, Reforge prompt on failure, colour by memory state. Reject: phantom echoes quizzing items in a central atrium, portals moving by memory strength, its R = e^(-t/S) maths, FastAPI + Postgres + vector DB backend.
- Context: Echoes and moving portals train items away from their locus and change the map, which breaks the method. Its formula is inconsistent: it defines S as the 90% point but e^(-1) = 0.37. The prototype also had no persistence, put user text in innerHTML, and added loci that broke route order.
- Alternatives rejected: adopting the prototype as the codebase.
- Consequences: FSRS via ts-fsrs replaces the custom maths. No backend in v1.

## 2026-10-20 - ts-fsrs 5.4.2 (stable), not 6.0 beta
- Decision: Pin ts-fsrs ^5.4.2.
- Context: npm "latest" is 5.4.2; v6 is beta only.
- Alternatives rejected: 6.0.0-beta.
- Consequences: Revisit when v6 is stable.

## 2026-10-20 - Tests with node --test, no test framework
- Decision: `npm test` runs `node --test`; Node 24 runs .ts files directly. Test files excluded from tsc.
- Context: Fewer dependencies, enough for pure-logic tests.
- Alternatives rejected: vitest, jest.
- Consequences: Code must use erasable TypeScript only (no enums, no namespaces). Imports use `.ts` extensions.

## 2026-10-20 - Multi-agent workflow: task packets, worktrees, cross-model verification
- Decision: TASKS.md board plus one packet per task in tasks/. Each builder works in its own git worktree on its own branch, only in its write scope. A different agent verifies every task. Only the integrator merges and edits shared contracts.
- Context: User runs several cheap agents (Sonnet 5.5, Haiku 5.5, Freebuff, Antigravity) on one local folder. Shared folder + branch switching would collide.
- Alternatives rejected: everyone on main (overwrites); one agent does all (slower, costlier).
- Consequences: Shared contracts were built first (T0) so parallel tasks code against stable interfaces. Assignment: Sonnet = hard builds (3D, drill, integration) and logic reviews; Haiku = data and pure logic; Freebuff = bounded UI screen; Antigravity = home UI, art, and browser playtests; Opus = contracts and final review.

## 2026-10-20 - Two-agent verification mesh (Antigravity + Freebuff), Claude Code as Lead
- Supersedes the agent assignment in "Multi-agent workflow" above (Sonnet/Haiku lanes). Task packets, worktrees and Lead-owned contracts stay.
- Decision: Only Antigravity (AG) and Freebuff (FB) build. Each task is built by one and verified by the other. Verifiers must try to break the work: red-team tests in `src/redteam/<ID>.test.ts`, mutation checks (break the code on purpose, a test must fail), evidence for every acceptance item, S1/S2/S3 severity, max 3 rounds, Lead settles disputes. A mesh score rewards confirmed findings and first-round passes.
- Context: User wants the top models of Antigravity and Freebuff to do 10-20+ hours of work and check each other. AG has a browser, so it builds 3D/UI and playtests; FB builds pure logic, maths, settings, integration and CI, and verifies AG's work through code review and tests. The Lead does the browser check at merge for AG's visual tasks.
- Alternatives rejected: one agent builds everything (no independent check); peer review without tests (approval by politeness); both agents on the same task (write collisions).
- Consequences: ~45 agent-hours on the board. Red-team tests stay as regression tests. Pure logic is split out of every UI task (drill-logic, sparkline, router, settings, living) so FB can test AG's work without a browser.

## 2026-10-20 - Maths spec file with measured numbers
- Decision: `MATHS.md` holds every formula: shuffle uniformity (chi-square), FSRS-6 forgetting curve, 2-up/1-down staircase, empirical-Bayes weak loci, exponential ghost fade, easing, palace geometry invariants, WCAG contrast, capture-recapture bug estimate. Only the Lead edits it.
- Context: User asked for "good maths" so agents build a correct product. Agents need one source to test against.
- Alternatives rejected: formulas spread across task packets (drift between tasks).
- Consequences: Lead checked the numbers with the real code (chi-square 38-63 vs limit 87.97, FSRS bracket on 32 histories, staircase success 0.702-0.703).

## 2026-10-20 - Weak loci by empirical Bayes, ghosts by half-life
- Supersedes the fixed "miss rate >= 40% over >= 5 tries" rule and the linear 12 h ghost fade in plan.md.
- Decision: Weak locus = posterior miss rate `(misses + 5m)/(tries + 5)` at least 0.15 above the player's global miss rate m, with at least 3 tries, max 5 shown. Ghost opacity `0.35 · 2^(-h/2)`, hidden below 0.05, warning above 0.15.
- Context: A fixed threshold flags noise on small samples and paints a beginner's whole palace red. Exponential fade has one clear parameter (half-life) and matches how interference fades.
- Alternatives rejected: raw miss rate; Wilson lower bound (harder to explain, same effect); linear fade.
- Consequences: Rules are pure functions in `src/living.ts` (T8a), tested against worked examples.

## 2026-10-20 - Settings in SaveData; save() never throws
- Decision: `SaveData.settings` (glideMs, sound, colorSafe, captions) with defaults merged on load. `PalaceView.showCard` takes `opacity` instead of `ghost`, and `setGlideMs(ms)` was added. `save()` catches storage errors, returns false and calls a handler set by `setSaveErrorHandler`.
- Context: Reduced motion, colour-blind safety and quota/private-mode errors must be handled before screens are built. Changing contracts later would break parallel tasks.
- Alternatives rejected: settings in a separate localStorage key (not exported with the save); every screen wrapping save in try/catch (easy to forget one).
- Consequences: Old saves load with default settings. T12 adds `sanitizeSettings` for junk values.

## 2026-10-20 - GitHub repo private by default
- Decision: `surypratapsingh/memory-palace-cards`, private.
- Context: User asked for a GitHub repo without saying public or private. Private is the safe default.
- Alternatives rejected: public (can be switched any time by the user).
- Consequences: GitHub Pages (T10) needs a paid plan on a private repo; T10 reports if it is not available.
