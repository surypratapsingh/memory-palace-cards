# T3 - Card-image trainer screen

- Builder: Freebuff | Verifier: Antigravity | Wave 1 | Branch: `task/T3-trainer` | Worktree: `../mp-T3`

## Goal
A 2D screen where the player learns the 52 card images and reviews them with spaced repetition (FSRS). Desktop, keyboard first.

## Write scope
- `src/ui/trainer.ts` (new)
- `src/ui/trainer.css` (new)
- `trainer-demo.html` + `src/ui/trainer-demo.ts` (new, dev harness)

## Use these existing modules (do not edit them)
- `src/srs.ts`: `newSrs`, `review`, `isDue`, `strength`, `Rating`
- `src/store.ts`: `save`, `load`, `imageFor`
- `src/deck.ts`: `DECK`
- `src/ui/cardFace.ts`: `cardFace(card)` returns the card element
- `src/data/cardImages.ts`: `CARD_IMAGES` (only 2 entries until T2 is merged; your code must work with any number)
- Types in `src/types.ts`: `SaveData`, `CardId`

## API
```ts
export function mountTrainer(root: HTMLElement, data: SaveData, onExit: (data: SaveData) => void): () => void;
```
Returns an unmount function that removes everything it added (DOM and key listeners). Call `save(data)` after every change so nothing is lost if the tab closes.

## Flow
1. Build a queue: all cards with `data.srs[card]` due (`isDue`), oldest due first, then up to 8 new cards (cards with no `data.srs` entry), in `DECK` order.
2. **New card**: show `cardFace`, the image (`imageFor`), the hook if a default exists. Text input "Make it yours" prefilled with the image; on change save to `data.images[card]`. Button/Enter "Got it": set `data.srs[card] = newSrs()` and put the card at the end of the queue as a test.
3. **Test card**: show `cardFace` only. Player recalls the image. Space = reveal image. Rate with keys 1 Again, 2 Hard, 3 Good, 4 Easy (also buttons): `data.srs[card] = review(data.srs[card], grade)`. Again = put the card back at the end of the queue.
4. **Reforge**: if the card is rated Again and its `lapses >= 4`, show "This image isn't sticking. Make it stranger:" with the image input focused.
5. Progress text: "7 left".
6. **Overview grid** (top of screen): 52 small tiles, one per card in DECK order, coloured by `strength()`: new grey, fading red, learning blue, solid green, gilded gold. Click a tile = show that card's image (no rating).
7. **End**: summary (reviewed, Again count, new learned) and a Back button. Esc at any time = `onExit(data)`.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Learn 8 new cards and rate them using only the keyboard.
- [ ] Reload the demo page: progress and edited images are kept.
- [ ] No user or image text goes through `innerHTML`.
- [ ] Unmount leaves no DOM nodes or key listeners behind.
- [ ] Demo: `npm run dev`, open http://localhost:5173/trainer-demo.html. It calls `mountTrainer(document.body, load(), ...)`.

## Questions
## Report

## Verify (for the verifier)
In `../mp-T3`: `npm install`, `npm test`, `npm run build`, `npm run dev`, open http://localhost:5173/trainer-demo.html.
1. Learn 8 new cards with keyboard only (Enter, Space, 1-4). Every step works without the mouse.
2. Edit one image to `<img src=x onerror=alert(1)>`. It must display as plain text, no alert.
3. Reload: grid colours, edited image and queue state are kept. Check `localStorage['memory-palace/v1']`.
4. In devtools, set one card's `srs.due` to a past date, save it, reload: that card appears as a test.
5. Rate one card Again 4+ times across reloads: the Reforge prompt appears.
6. Esc exits. Console has no errors.
7. Read `src/ui/trainer.ts`: no `innerHTML` with dynamic text, listeners removed on unmount.
Write "Verification" with PASS or CHANGES and numbered findings.
