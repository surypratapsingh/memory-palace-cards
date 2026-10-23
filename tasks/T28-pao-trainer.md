# T28 - PAO trainer

- Build: FB | Verify: AG | Est. 2h | Wave 8, v1.2 (start after T27) | Branch: `task/T28-pao-trainer` | Worktree: `wt/T28`

## Goal
Learn the 156 PAO parts (52 cards x person, action, object) with FSRS, in the same calm flow as the card-image trainer (T3).

## Write scope
- `src/ui/trainer.ts`, `src/ui/trainer.css`, `src/ui/trainer.test.ts`: a PAO mode of the existing trainer (reuse `buildQueue` style; do not fork the trainer)
- `src/ui/home.ts`: one entry "Train PAO", shown once the player turns PAO on in Settings
- `src/ui/settings.ts`, `src/settings.ts`, `src/settings.test.ts`: the PAO on/off setting, as contract C2 defines it
- `docs/shots/T28-*.png`
- Read only: `src/pao.ts`, `src/data/pao.ts` (T27)

## Requirements
1. Queue: due PAO parts first, then new ones, at most 9 new per session (3 cards x 3 parts), and introduce a card's person, action and object together.
2. Prompt: the card face (T13 art) and the part asked ("Person?"); Space reveals; keys 1-4 rate, like the image trainer.
3. Edit: the player can rewrite a part (plain text, 60 characters max, saved as an override).
4. Reviews saved under `paoSrs` keys from contract C2; the save is written after each rating.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass; one e2e test that trains 3 parts.
- [ ] Screenshots: prompt, reveal, edit, end of session.

## Questions
## Report

## Verify (for AG)
In `wt/T28`: `npm test`, `npm run build`, `npm run e2e`; paste counts. Browser: train a session with PAO on, then turn PAO off: the entry disappears and nothing else changes.
1. Red-team `src/redteam/T28.test.ts`: at least 5 tests, for example an override with only spaces, a `paoSrs` key for an unknown card, 156 parts all due at once, rating keys before reveal do nothing.
Write "Verification" as TASKS.md says.
