# T21 - Journey trainer logic

- Build: FB | Verify: AG | Est. 2h | Wave 7 (filler: may start any time FB has no other job) | Branch: `task/T21-journey` | Worktree: `wt/T21`

## Goal
The second thing the player must learn (plan.md, "Three things the player learns") is the journey: the 52 loci in fixed order. Today it is learned only by walking. This task schedules journey practice with FSRS, the same way card images are trained. T26 (AG) builds the screen.

## Write scope
- `src/journey.ts`, `src/journey.test.ts` (new)
- `MATHS.md`: append section 14 "Journey practice" only
- Read only: `src/srs.ts` (`newSrs`, `review`, `isDue`, `strength`, `Rating`), `src/data/palace.ts` (`LOCI`, `ROOMS`), `src/deck.ts` (`rng`, `shuffle`)

## Contract (C1, already in main)
`SaveData.journey?: Partial<Record<number, SrsState>>`: FSRS state per locus, key = locus index. Missing key = not introduced. `src/store.ts` keeps it on import and export.

## Requirements
1. Question kinds, each about one locus `i` (the scheduled item):
   - `next`: "What comes after <name of i>?" answer `i + 1` (not asked for the last locus)
   - `number`: "Which stop is <name of i>?" answer `i`
   - `where`: "What is at stop <i>?" answer `i`
   Pick the kind with a seeded `rng` so a session is reproducible; prefer `next` for loci in their first 3 reviews (route order is the point).
2. `journeyQueue(save, now, seed, size = 10)`: due loci first (oldest due first), then new loci in route order, at most 5 new per session, and only from the first room that still has new loci (learn one room at a time). Never the same locus twice in one queue.
3. `choices(question, seed)`: the right answer plus 3 distractors from the same room within 3 stops of the answer when possible (hard but fair), shuffled with the seed, no duplicates.
4. `grade(save, i, correct, ms, now)`: returns a new `SaveData` (never mutates) with `journey[i]` reviewed: wrong = `Again`; right in under 4 s = `Good`; right but slow = `Hard`. Write the 4 s threshold in MATHS.md section 14 with the reason.
5. `journeyStrength(save, now)`: count of loci per `Strength` (for the progress screen).

## Acceptance
- [x] `npm test` and `npm run build` pass; at least 12 tests (17 journey tests).
- [x] A saved journey survives `exportJson` / `importJson` (tested with a reviewed locus).

## Questions
- A new route-ordered queue cannot use its full default size of 10 when introducing at most five new loci. Implementation returns all eligible due loci up to size, then appends at most five new loci; with an empty save and size 10 the queue is five items. The math section documents this interpretation.

## Report
Implemented pure journey queueing, seeded question selection and choices, FSRS grading, and 52-locus strength counts in `src/journey.ts`, with 17 focused tests. A saved FSRS state survives JSON export/import. Added section 14 to `MATHS.md`; the 4,000 ms cut-off gives quick correct answers `Good`, slower correct answers `Hard`, and incorrect answers `Again`. Verification: `npm test` -> 313 pass, 0 fail; `npm run build` -> passed (existing Vite >500 kB chunk warning); `git diff --check` -> passed.

## Verify (for AG)
In `wt/T21`: `npm test`, `npm run build`, paste counts.
1. Red-team `src/redteam/T21.test.ts`: at least 5 tests, for example a save with all 52 loci due, a journey key "999" or "-1" in an imported save is ignored, `next` never asked for locus 51, distractors never include the answer, the same seed gives the same queue.
2. Check MATHS.md section 14 against the code.
Write "Verification" as TASKS.md says.
