# T29 - PAO drill in the palace

- Build: AG | Verify: FB | Est. 3h | Wave 8, v1.2 (start after T27) | Branch: `task/T29-pao-drill` | Worktree: `wt/T29`

## Goal
Drill with PAO: three cards per locus, one scene per locus. A 52-card deck uses 18 loci, so the player reaches a full deck much sooner.

## Write scope
- `src/ui/drill.ts`, `src/ui/drill.css`: a `pao` option, in the structure the U3 winner set
- `src/scene/cardBillboard.ts`: show up to 3 small cards side by side at one locus (keep one-card behaviour unchanged)
- `src/ui/home.ts`: PAO drill entry when PAO is on
- `docs/shots/T29-*.png`
- Read only: `src/pao.ts` (T27)

## Requirements
1. Memorize: locus `k` shows the 3 cards of scene `k` and the scene caption ("Pirate juggling a snowman"); Right/Space next scene.
2. Recall: at each locus the player picks 3 cards in order (the picker shows 3 slots; Backspace clears the last slot, then goes back a locus).
3. Result: per-card review as in a normal drill, plus per-locus scenes with the wrong part marked (person, action or object), so the player knows which PAO part failed.
4. Saved with `mode: 'pao'` (contract C2). Locus stats: a locus is a miss when any of its 3 cards is wrong.
5. Ladder for PAO: 3, 6, 9, 15, 21, 27, 39, 52 cards (whole scenes); the Lead adds this to MATHS.md section 4 at C2.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass; one e2e test plays a 6-card PAO drill perfectly.
- [ ] Three cards at one locus fit in view at 16:9 and 4:3 (extend `src/scene/cardPlacement.test.ts` from T13).
- [ ] Screenshots: memorize scene, recall with 3 slots, result.

## Questions
## Report

## Verify (for FB)
In `wt/T29`: `npm test`, `npm run build`, `npm run e2e`; paste counts.
1. Code review: scoring uses `scorePao`; locus stats rule 4; one-card drills unchanged (their tests and e2e still pass).
2. Red-team `src/redteam/T29.test.ts`: at least 5 tests, for example a 52-card PAO deck ends with a 1-card scene, Backspace on an empty first slot at locus 0, picking a used card, quitting mid-scene saves nothing.
Write "Verification" as TASKS.md says.
