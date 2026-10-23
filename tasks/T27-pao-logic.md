# T27 - PAO system: data and logic

- Build: FB | Verify: AG | Est. 2.5h | Wave 8, v1.2 (start after C2, the Lead's PAO contract) | Branch: `task/T27-pao` | Worktree: `wt/T27`

## Goal
PAO (Person-Action-Object) is how memory athletes reach 1 locus per 3 cards: every card has a person, an action and an object; three cards in a row make one scene: the person of card 1 doing the action of card 2 to the object of card 3. A full deck fits on 18 loci instead of 52. This task writes the default PAO table and the pure logic; T28 trains it, T29 drills it.

## Contract C2 (the Lead fills this in before the task opens)
Planned shape, may change at C2:
- `DrillResult.mode?: 'speed' | 'pao'`
- `SaveData.pao?: Partial<Record<CardId, { person?: string; action?: string; object?: string }>>` (user overrides)
- `SaveData.paoSrs?: Partial<Record<string, SrsState>>`, key `"<CardId>:P"`, `"<CardId>:A"`, `"<CardId>:O"`

## Write scope
- `src/data/pao.ts`, `src/pao.ts`, `src/pao.test.ts` (new)
- `MATHS.md`: append section 15 "PAO" only

## Requirements
1. `src/data/pao.ts`: 52 entries `{ card, person, action, object }`, original text, each under 30 characters. Build on the existing card-image system (`src/data/cardImages.ts`: rank gives the object, suit gives the flavour) so a player's current images still help: the object should be the card's existing image object where it fits. Persons are archetypes or fictional figures, not real living people. Every action is a visible physical verb ("juggling", "sawing"), not an abstract one.
2. `paoScenes(sequence)`: groups of 3 cards to `{ person, action, object, cards }`; a last group of 1 or 2 uses the person (and action) only. 52 cards give 18 scenes.
3. `paoFor(save, card)`: user override, else default.
4. `scorePao(sequence, answers)`: per-card scoring as `score` in `deck.ts` (MATHS.md section 2), so PAO results compare with normal drills.
5. Validation for imported overrides: strings only, trimmed, at most 60 characters, otherwise ignored.

## Acceptance
- [ ] `npm test` and `npm run build` pass; at least 12 tests.
- [ ] Data tests: 52 unique cards, no empty field, no duplicate person, no duplicate action, lengths under 30.

## Questions
## Report

## Verify (for AG)
In `wt/T27`: `npm test`, `npm run build`, paste counts.
1. Read all 52 entries: is every scene imaginable in under 2 seconds? List weak ones as S3.
2. Red-team `src/redteam/T27.test.ts`: at least 5 tests, for example sequences of length 0, 1, 2, 3, 52, 53; overrides with HTML in them stay plain text; a 10 kB override string is ignored.
Write "Verification" as TASKS.md says.
