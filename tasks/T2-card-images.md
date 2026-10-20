# T2 - 52 default card images

- Build: FB | Verify: AG | Est. 1h | Wave 1 | Branch: `task/T2-card-images` | Worktree: `wt/T2`

## Goal
Fill `CARD_IMAGES` in `src/data/cardImages.ts` with one vivid default image for each of the 52 cards. Players see this image when they learn a card and can edit it.

## Write scope
- `src/data/cardImages.ts`
- `src/core.test.ts`: add exactly one line, see Acceptance.

## The system (follow it exactly)
Rank gives the object (by shape or meaning):

| Rank | Object |
|---|---|
| A | Rocket (the letter A is a pointed rocket) |
| 2 | Swan (2 shape) |
| 3 | Trident (3 prongs) |
| 4 | Sailboat (4 shape) |
| 5 | Giant hand (5 fingers) |
| 6 | Snail (6 spiral) |
| 7 | Boomerang (7 shape) |
| 8 | Snowman (8 shape) |
| 9 | Balloon on a string (9 shape) |
| T (10) | Bat and ball (1 and 0) |
| J | Jester |
| Q | Queen |
| K | King |

Suit gives the flavour:

| Suit | Flavour |
|---|---|
| S Spades | digging, tools, darkness, graveyards |
| H Hearts | love, people, fire, romance |
| D Diamonds | money, gold, jewels, luxury |
| C Clubs | plants, jungle, fighting, cavemen |

Each image = the rank object + the suit flavour + an action. Examples (already in the file, keep or improve):
- `8D`: "A snowman made of gold coins" - hook "8 = snowman, Diamonds = money"
- `2H`: "Two swans kissing, necks making a heart" - hook "2 = swan, Hearts = love"

## Rules for images
- Concrete and easy to picture. Something happening (action), not a static label.
- Under 60 characters.
- Every image clearly different from all others. Same-rank cards must differ by more than one word (8S vs 8C should be different scenes, not "snowman with shovel" vs "snowman with club").
- No real people, no brands, no copyrighted characters. Cartoon slapstick is fine; nothing gory or sexual.
- `hook` format: `"<rank> = <object>, <Suit name> = <flavour word>"`.

## Output format
52 entries, ordered by the deck: Spades A..K, Hearts A..K, Diamonds A..K, Clubs A..K. Card ids use `T` for ten: `TS`, `TH`, `TD`, `TC`.
```ts
{ card: 'AS', image: 'A rocket drilling down into a graveyard', hook: 'A = rocket, Spades = digging' },
```

## Acceptance
- [ ] In `src/core.test.ts`, inside the test `card images are well formed`, add: `assert.equal(CARD_IMAGES.length, 52);`
- [ ] `npm test` and `npm run build` pass.
- [ ] All rules above hold.

## Questions
## Report

## Verify (for AG)
In `wt/T2`: run `npm test`, paste counts. Red-team `src/redteam/T2.test.ts`: at least 5 automatic checks (deck order, hook format regex, rank object word present, pairs that share more than half their words other than a/an/the/of/with get printed for manual review, length). Then read all 52 entries and check:
1. Every card present once, deck order, `T` for ten.
2. Each image uses its rank object and its suit flavour, and has an action.
3. Distinctness: list any two images that could be confused. Pay attention to the 4 cards of each rank.
4. Content rules: no real people, brands, copyrighted characters, gore, sexual content.
5. Under 60 characters, hook format exact.
Write "Verification" with PASS or CHANGES. For each finding give the exact replacement text so the builder can paste it.
