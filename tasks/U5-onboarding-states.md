# U5 - UI round 5: Onboarding, Shadow Walk HUD, empty/loading/error states (AG entry vs FB entry)

- Rows: `U5-AG` (AG builds, FB rates) and `U5-FB` (FB builds, AG rates) | Est. 2h build + 1h improve each | Wave 6 (after U4-PICK) | Branches: `ui/U5-AG`, `ui/U5-FB` | Worktrees: `wt/U5-AG`, `wt/U5-FB`
- Round rules: "How a Wave 6 round works" in `tasks/U1-visual-language.md`. Rubric: `docs/design-rubric.md`. Use the U1 tokens.

## Goal
The first 90 seconds sell the game, and the edges (loading, errors, empty states, the save-error banner) feel as cared for as the middle.

## Write scope
- `src/ui/onboarding.ts` (layout and markup only; the flow from T11 stays), `src/ui/onboarding.css`
- `src/ui/shadowWalk.ts` (HUD layout and markup only), its CSS (create `src/ui/shadowWalk.css` if needed)
- `src/main.ts` and `src/style.css`: only the save-error banner, the scene loading state and the scene error state (T17)
- `docs/shots/U5-AG-*.png` or `docs/shots/U5-FB-*.png`

## Requirements
1. Onboarding: still under 90 s and at most 8 presses plus 3 picks (T11 acceptance); one main action per step; the skip link stays.
2. Shadow Walk: a minimal HUD (how to walk, how to check a locus, how to leave), a crosshair only with pointer lock, the check prompt readable in every room.
3. States: scene loading, scene failed (Retry), save failed (storage full or private mode), import failed: each with one plain sentence and one action.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass.
- [ ] Onboarding timed again (time and press count in your report); screenshots of every state, per the rubric's evidence pack.

## Verify (rater)
Rate the other agent's entry as steps 2 and 4 of "How a Wave 6 round works" in `tasks/U1-visual-language.md` say: `npm test`, `npm run build`, `npm run e2e` (paste counts), the rubric table in `docs/design-rubric.md` with evidence, the 5 best changes as findings, and `src/redteam/<ID>.test.ts` with at least 5 checks. Write "Verification" as TASKS.md says.

## Questions

## Report (U5-AG)

## Report (U5-FB)
