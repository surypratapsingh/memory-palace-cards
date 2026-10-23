# U2 - UI round 2: Home screen (AG entry vs FB entry)

- Rows: `U2-AG` (AG builds, FB rates) and `U2-FB` (FB builds, AG rates) | Est. 2h build + 1h improve each | Wave 6 (after U1-PICK) | Branches: `ui/U2-AG`, `ui/U2-FB` | Worktrees: `wt/U2-AG`, `wt/U2-FB`
- Round rules: "How a Wave 6 round works" in `tasks/U1-visual-language.md`. Rubric: `docs/design-rubric.md`. Use the U1 winner's tokens (`docs/design-tokens.md`); no new tokens unless you add them to that file with a reason.

## Goal
Home answers in one glance: what to do today (Daily Deck, due card images), how far I have come (ladder, streak, best times, rank title), and where else I can go (train, practise, Shadow Walk, settings, save import/export). One obvious main action.

## Write scope
- `src/ui/home.ts`, `src/ui/home.css`, `src/ui/home-demo.ts`
- `docs/shots/U2-AG-*.png` or `docs/shots/U2-FB-*.png`
- Not: `src/progress.ts` or other logic (ask under "Questions" if the home needs a new number)

## Requirements
1. The main action is the Daily Deck until it is done today, then the recommended practice level. Exactly one primary button.
2. The 52 card-image tiles (strength colours) stay, with the colour-safe markers; they become card faces (T13 art) or keep text, your choice, but they must stay readable at 1280x720.
3. Streak with freezes, rank title, ladder progress, best time per level: shown, never as guilt ("You lost your streak" is not allowed; plan.md Retention).
4. Ghost warning (T8b) and leech "Reforge" prompt keep working.
5. Import/export stay reachable but quiet.
6. Use the home demo harness with: fresh save, 1 drill, 30 drills, a 400-day streak, all 52 cards gilded.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass.
- [ ] Screenshots of the 5 demo saves, per the rubric's evidence pack.

## Verify (rater)
Rate the other agent's entry as steps 2 and 4 of "How a Wave 6 round works" in `tasks/U1-visual-language.md` say: `npm test`, `npm run build`, `npm run e2e` (paste counts), the rubric table in `docs/design-rubric.md` with evidence, the 5 best changes as findings, and `src/redteam/<ID>.test.ts` with at least 5 checks. Write "Verification" as TASKS.md says.

## Questions

## Report (U2-AG)

## Report (U2-FB)
