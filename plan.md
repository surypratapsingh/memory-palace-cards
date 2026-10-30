# Plan

## Goal
A desktop web game where you walk a 3D memory palace and use it to memorize the **order** of shuffled playing cards. It teaches the real method used in memory sports, schedules practice with spaced repetition, and the palace visibly reacts to what you remember and forget. Later the same engine handles any ordered list (steps, dates, vocab). Research basis: research.md.

## Scope
- In (v1):
  - 3D first-person palace (three.js), desktop first: 4 themed rooms x 13 loci = 52 loci on a fixed walking route.
  - Card images: one vivid default image per card (52), editable by the user, learned with FSRS reviews.
  - Drill: memorize N shuffled cards by gliding locus to locus, then recall the order at each locus. Memory-sports scoring.
  - Ladder 3, 5, 8, 13, 20, 26, 39, 52 cards. Daily Deck. Streak. Personal bests.
  - Living palace: fading card images, weak loci flagged, ghost images after a drill.
  - Local save (localStorage) with JSON export/import. No backend.
- Out (until asked): accounts, sync, leaderboards, AI images, mobile layout, VR, user-built palaces, non-card content.

## Game design

### Three things the player learns
1. **Card images** (long term, FSRS): card -> image. "8♦ = snowman made of gold coins". System: rank gives the object, suit gives the flavour (see src/data/cardImages.ts).
2. **The journey** (long term): 52 loci in fixed order. Learned by walking it. Loci never move once released.
3. **A deck order** (short term, the game): place card images on loci in order, then recall.

### Core loop (5 minutes a day)
1. Home: streak, Daily Deck, due card images.
2. Train: review due card images (Space reveal, keys 1-4 rate).
3. Drill: memorize -> recall -> results. Weak loci and wrong cards shown.
4. Results feed the palace: locus stats, card lapses, ghosts.

### Drill details
- Memorize: camera glides to locus i, card i floats there with its image caption. Right arrow/Space = next, Left = back. Timer runs.
- Recall: cards cleared. At each locus pick the card (grid or keys: rank then suit). Used cards greyed. Backspace = previous locus.
- Score: total correct, plus "run" = correct before first error (memory-sports rule), memorize time.

### Living palace (self-changing without breaking the map)
- Card image strength (FSRS recall) shown as colour: new grey, fading red, learning blue, solid green (30d+), gilded gold (180d+).
- Weak locus: miss rate >= 40% over >= 5 tries -> dim red, with a tip to picture it bigger or stranger.
- Leech card: 4+ lapses -> "Reforge" prompt to write a stranger image.
- Weak locus: chosen by empirical-Bayes shrinkage, relative to the player's own miss rate (MATHS.md section 5). Replaces the fixed 40% rule.
- Ghosts: last drill's cards stay faint at loci, half-life 2 h, hidden after about 5.6 h (MATHS.md section 6). Warning if starting a drill over fresh ghosts.
- Practice level follows a 2-up/1-down staircase, so the player practises where they succeed about 70% of the time (MATHS.md section 4).
- Shadow walk: walk the route with cards hidden, click a locus to check what was there.
- Never: moving loci, reordering rooms, quizzing items away from their locus.

### Retention ("make people stick around")
1. **First win in 90 seconds**: no setup, first screen offers "memorize 3 cards". Success proves the method works on you.
2. **Clear next goal**: ladder level, best time, rank title (Novice -> Palace Keeper).
3. **Daily Deck**: same shuffle for everyone each day (date seed). Share result as emoji grid, no spoilers, no backend.
4. **Forgiving streak**: freezes earned every 7 days, max 2.
5. **Visible decay**: fading images and ghosts give a reason to return. Daily work stays under 5 minutes.
6. **Session end**: shows what unlocks next.
- Not doing: push notifications, guilt messages, paid boosts.

## Architecture
- Vite + TypeScript, no UI framework. three.js for the palace. ts-fsrs 5.4.2 for scheduling.
- Shared contracts in `src/types.ts` (SaveData, DrillResult, PalaceView). Changed only by the integrator.
- Core logic, pure and tested: `src/deck.ts` (deck, seeded deal, scoring), `src/srs.ts` (FSRS wrapper, strength), `src/store.ts` (save/load/import/export), `src/progress.ts` (ladder, streak, share text).
- 3D: `src/scene/` implements `PalaceView` (glideTo, showCard, setLocusMood, free walk). Layout data in `src/data/palace.ts`.
- UI screens mount into a DOM overlay over the 3D canvas: `src/ui/trainer.ts`, `src/ui/drill.ts`, `src/ui/home.ts`. `src/main.ts` routes between them.
- Tests: `node --test` (Node 24 runs .ts directly). No test framework.
- Build/verify: `npm test`, `npm run build`, `npm run dev`.
- Maths: MATHS.md holds every formula with tests and measured numbers.
- Multi-agent workflow: Antigravity (AG) and Freebuff (FB) build in two lanes and verify each other (mesh: red-team tests, mutation checks, severity levels). Claude Code is the Lead/integrator. See TASKS.md and tasks/*.md.
- Repo: https://github.com/surypratapsingh/memory-palace-cards (private).

## Milestones
- [x] M0 Research and plan
- [x] T0 Foundation: scaffold, contracts, deck, SRS, store, tests
- [x] Mesh replan for AG + FB, MATHS.md, GitHub repo
- [x] Queue coordinator `scripts/mesh.mjs` and identical queue prompts
- [x] Gemini round 1: motion kit, room textures, room decor (in main)
- [x] Gemini round 2: card art (D), walk collision (E), atmosphere and decor v2 (F) (in main; wired by T9); prompts in tasks/gemini-argon.md
- [x] Wave 1: M1 maths audit, T1 3D palace, T5 progress + staircase, T2 card images, T3 trainer
- [x] Wave 2: T8a living rules, T12 settings, T4 drill, T6 home
- [x] Wave 3: T7 integration (playable v1), T10 deploy (Pages skipped while the repo is private)
- [x] Wave 4a: T8b living palace in game
- [x] Contract C1 for v1.1 (`DrillResult.mode`, `SaveData.journey`), long-range board and packets for waves 4-8 (2026-10-23)
- [x] Hosting: live on Vercel, https://memory-palace-cards.vercel.app/ (user, 2026-10-28; repo stays private, Pages stays off)
- [ ] Wave 4: T11 first 90 seconds (done 2026-10-30), T9 scene art, T13 card art + placement, T14 free walk, T15 sound, T16 e2e tests, T17 performance
- [ ] Wave 5: Q1 bug bash and cross-fix, R1 release v1.0
- [ ] Wave 6: UI design competition U1-U5 (visual language, home, drill, trainer + settings, onboarding + states), Lead picks per round
- [ ] Wave 7 (v1.1): T18 palace map, T19 insights, T20 Speed Cards rules, T21 journey logic, T22 achievements, T23 PWA, T24 progress screen, T25 Speed Cards mode, T26 journey trainer; Q2, R2
- [ ] Wave 8 (v1.2): C2 PAO contract, T27 PAO logic, T28 PAO trainer, T29 PAO drill; Q3, R3
- [ ] Later: Numbers (Major system) on the same palace, a second palace wing for two-deck drills (new loci after 51, old loci never move), user-built palaces, other ordered content, mobile layout

## Roadmap (planned 2026-10-23)
Board order in TASKS.md is priority order; `mesh next` hands each agent the first row it can build. Lead gates (R1-R3, U1-PICK to U5-PICK, C2) are rows the Lead closes with a `<ID>: ` commit on main.

### Dependency graph
```
v1.0   T11 ─┬─ T15 ───────────────────────┐
            └─ T16 ─┐                      │
       T9 ──────────┼─ T17 ────────────────┼─ Q1-AG, Q1-FB ── R1 (tag v1.0)
       T13 ─────────┤                      │
       T14 ─────────┘                      │
UI     R1 ─ U1 ─ U1-PICK ─ U2 ─ U2-PICK ─ U3 ─ U3-PICK ─ U4 ─ U4-PICK ─ U5 ─ U5-PICK
v1.1   T18 ─────────────┬─ T24 (also T19, T22, U2-PICK)
       T19 ─────────────┘
       T20 ─┬─ T22 ─────── T24
            └─ T25 (also U3-PICK)
       T21 ─┬─ T22
            └─ T26 (also T18, U2-PICK)
       R1 ── T23
       T23, T24, T25, T26, U5-PICK ── Q2-AG, Q2-FB ── R2 (tag v1.1)
v1.2   R2 ── C2 ── T27 ─┬─ T28 ─┐
                        └─ T29 ─┴─ Q3-AG, Q3-FB ── R3 (tag v1.2)
```
Critical path to v1.0: T11 -> T16 -> T17 -> Q1 -> fix rows -> R1 (about 8 agent-hours of wall time if the Lead merges promptly). T9, T13 and T14 run in parallel with it.

### Lanes (build hours, waves 4-8)
- AG (3D, screens, browser): T9 3h, T15 1.5h, T18 1.5h, U1-U5 entries about 15h, T24 2.5h, T25 2.5h, T26 2.5h, T29 3h. About 31h build plus verifying FB's work.
- FB (logic, tests, CI, integration): T13 2.5h, T14 1.5h, T16 3h, T17 2h, T19 2h, T20 2h, T21 2h, T22 1.5h, T23 2h, U1-U5 entries about 15h, T27 2.5h, T28 2h. About 38h build plus verifying AG's work.
- Filler: FB's v1.1 logic rows (T18-T22) sit after the Wave 6 rows on the board, so they fill FB's idle time during Lead gates without delaying v1 or the UI rounds. AG's v1.1 screens need a U pick, so they fill AG's waits between later UI rounds.

### Risks and answers
- Merge conflicts in `palaceView.ts` (T9 atmosphere lines, T13 glideTo target, T14 free-walk code): each packet names its lines; the Lead merges in board order and resolves.
- UI rounds stall on the Lead: each PICK is a short Lead turn; the agents' fillers keep them busy meanwhile.
- e2e flakiness (WebGL in headless chromium): T16 retries once in CI; Q1/Q2 FB charters run the suite several times.
- Speed Cards rules: T20 must cite the WMSC and IAM rule documents; no guessed rules.
