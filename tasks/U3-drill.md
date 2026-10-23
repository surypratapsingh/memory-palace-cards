# U3 - UI round 3: Drill (AG entry vs FB entry)

- Rows: `U3-AG` (AG builds, FB rates) and `U3-FB` (FB builds, AG rates) | Est. 2.5h build + 1h improve each | Wave 6 (after U2-PICK) | Branches: `ui/U3-AG`, `ui/U3-FB` | Worktrees: `wt/U3-AG`, `wt/U3-FB`
- Round rules: "How a Wave 6 round works" in `tasks/U1-visual-language.md`. Rubric: `docs/design-rubric.md`. Use the U1 tokens.

## Goal
The drill is the game. Ready, memorize, recall and results must feel focused and fast: the palace and the card are the stars, the HUD stays out of the way, and keyboard play has zero animation lag.

## Write scope
- `src/ui/drill.ts` (layout and markup only; `src/drill-logic.ts` stays as it is), `src/ui/drill.css`, `src/ui/cardPicker.ts` (layout only), `src/ui/drill-demo.ts`
- `docs/shots/U3-AG-*.png` or `docs/shots/U3-FB-*.png`

## Requirements
1. Ready: level, card count, ghost warning if any, one Start button (Space).
2. Memorize HUD: card number "7 / 13", timer (tabular numbers), the card's image caption (full text, never cut), and the beginner hint (T11) when shown. Nothing covers the locus object or the floating card (rubric criterion 8).
3. Recall picker: the locus stays visible above the picker at 1366x768 (Lead finding 2026-10-23); rank-then-suit keys still work; used cards greyed; Backspace goes back.
4. Results: score, run, time, per-locus review with the wrong cards, the ghosts note, share text button, and the "what unlocks next" line (plan.md Retention 6).
5. No animation on keyboard-driven steps (Right/Space during memorize, picks during recall). Results may animate once (count-up from `motion.ts`).

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass.
- [ ] Screenshots of each phase in two rooms, plus a 52-card result, per the rubric's evidence pack.

## Verify (rater)
Rate the other agent's entry as steps 2 and 4 of "How a Wave 6 round works" in `tasks/U1-visual-language.md` say: `npm test`, `npm run build`, `npm run e2e` (paste counts), the rubric table in `docs/design-rubric.md` with evidence, the 5 best changes as findings, and `src/redteam/<ID>.test.ts` with at least 5 checks. Write "Verification" as TASKS.md says.

## Questions

## Report (U3-AG)

## Report (U3-FB)
