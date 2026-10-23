# U4 - UI round 4: Trainer and Settings (AG entry vs FB entry)

- Rows: `U4-AG` (AG builds, FB rates) and `U4-FB` (FB builds, AG rates) | Est. 2h build + 1h improve each | Wave 6 (after U3-PICK) | Branches: `ui/U4-AG`, `ui/U4-FB` | Worktrees: `wt/U4-AG`, `wt/U4-FB`
- Round rules: "How a Wave 6 round works" in `tasks/U1-visual-language.md`. Rubric: `docs/design-rubric.md`. Use the U1 tokens.

## Goal
The card-image trainer is a quiet flashcard room: card, image, reveal, rate, next. Settings are short, plain and instantly applied.

## Write scope
- `src/ui/trainer.ts` (layout and markup only; `buildQueue` unchanged), `src/ui/trainer.css`, `src/ui/trainer-demo.ts`
- `src/ui/settings.ts` (layout and markup only; `src/settings.ts` unchanged), `src/ui/settings.css`, `src/ui/settings-demo.ts`
- `docs/shots/U4-AG-*.png` or `docs/shots/U4-FB-*.png`

## Requirements
1. Trainer: card face (T13 art), the image and hook after reveal, rate buttons 1-4 with keys shown, session progress "3 / 8", edit image in place (plain text, 60 characters), the overview of new cards.
2. Rating a card has no animation delay; the next card appears at once.
3. Settings: glide speed with a live preview of what it means, sound, colour-safe, captions; each with a one-line plain explanation; changes apply at once and are saved.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass.
- [ ] Screenshots: trainer prompt, reveal, edit, overview, settings; per the rubric's evidence pack.

## Verify (rater)
Rate the other agent's entry as steps 2 and 4 of "How a Wave 6 round works" in `tasks/U1-visual-language.md` say: `npm test`, `npm run build`, `npm run e2e` (paste counts), the rubric table in `docs/design-rubric.md` with evidence, the 5 best changes as findings, and `src/redteam/<ID>.test.ts` with at least 5 checks. Write "Verification" as TASKS.md says.

## Questions

## Report (U4-AG)

## Report (U4-FB)
