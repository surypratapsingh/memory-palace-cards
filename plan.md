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
- Ghosts: last drill's cards stay faint at loci and fade over 12 h. Warning if starting a drill over fresh ghosts.
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
- Multi-agent workflow: see TASKS.md (board, rules, worktrees) and tasks/*.md (one packet per task, build + verify sections).

## Milestones
- [x] M0 Research and plan
- [x] T0 Foundation: scaffold, contracts, deck, SRS, store, tests
- [ ] Wave 1 (parallel): T1 3D palace, T2 card images, T3 trainer screen, T5 progress logic
- [ ] Wave 2: T4 drill, T6 home screen
- [ ] Wave 3: T7 integration, playable v1
- [ ] Wave 4: T8 living palace, T9 art and sound, T10 deploy
- [ ] Later: user-built palaces, other ordered content, PAO (3 cards per locus), mobile
