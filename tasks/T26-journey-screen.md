# T26 - Journey trainer screen

- Build: AG | Verify: FB | Est. 2.5h | Wave 7 (start after T18, T21 and U2-PICK) | Branch: `task/T26-journey-screen` | Worktree: `wt/T26`

## Goal
A two-minute daily practice of the route itself: the palace shows a locus, you answer "what comes next?", "which stop is this?" or "what is at stop 17?", and FSRS (T21) decides what to ask tomorrow.

## Write scope
- `src/ui/journey.ts`, `src/ui/journey.css` (new), `src/ui/journey-demo.ts` + `.html` (new)
- `src/router.ts`, `src/router.test.ts` (new screen `journey`), `src/main.ts` (mount it, save the result)
- `src/ui/home.ts`: one entry with the number of journey stops due today, in the style the U2 winner set
- `docs/shots/T26-*.png`
- Read only: `src/journey.ts` (T21), `src/ui/palaceMap.ts` (T18)

## Requirements
1. Session from `journeyQueue(save, now, seed)`. For each question: the camera glides to the asked locus (or shows the map for `where` questions), the question in one line, 4 choices from `choices()` as buttons with keys 1 to 4.
2. After an answer: right or wrong shown for 600 ms (the right answer highlighted on the palace map), then the next question. `grade()` with the answer time.
3. End: "12 of 14 right. Next review: tomorrow" and a Continue button. The save is written once at the end and also when the player quits early (answered questions are kept).
4. Esc quits to home at any point. Sound (T15) like the trainer: flip on a new question.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass; add one e2e test that answers a full session.
- [ ] Screenshots of each question kind, the feedback state and the end screen.

## Questions
## Report

## Verify (for FB)
In `wt/T26`: `npm test`, `npm run build`, `npm run e2e`; paste counts.
1. Code review: grade called once per answer; quit early keeps answered questions; no listener left after unmount; no `innerHTML` with locus names.
2. Red-team `src/redteam/T26.test.ts`: at least 5 tests, for example mashing 1-4 during the feedback delay grades once, Esc during a glide, an empty queue (nothing due, no new loci) shows "All caught up", a save with a broken journey entry.
Write "Verification" as TASKS.md says.
