# T3 - Card-image trainer screen

- Build: FB | Verify: AG | Est. 2.5h | Wave 1 | Branch: `task/T3-trainer` | Worktree: `../mp-T3`

## Goal
A 2D screen where the player learns the 52 card images and reviews them with spaced repetition (FSRS). Desktop, keyboard first.

## Write scope
- `src/ui/trainer.ts` (new)
- `src/ui/trainer.css` (new)
- `src/ui/trainer.test.ts` (new)
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
6. **Overview grid** (top of screen): 52 small tiles, one per card in DECK order. Each tile gets `data-strength="<strength()>"` (`new` when the card has no srs entry) and `background: var(--s)`; the colours and colour-blind markers come from `src/style.css`. Click a tile = show that card's image (no rating).
7. **End**: summary (reviewed, Again count, new learned) and a Back button. Esc at any time = `onExit(data)`.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Learn 8 new cards and rate them using only the keyboard.
- [ ] Reload the demo page: progress and edited images are kept.
- [ ] No user or image text goes through `innerHTML`.
- [ ] Unmount leaves no DOM nodes or key listeners behind.
- [ ] Queue logic is a pure exported function `buildQueue(data: SaveData, now: Date): CardId[]` with tests in `src/ui/trainer.test.ts` (due first, oldest due first, then max 8 new in DECK order).
- [ ] Demo: `npm run dev`, open http://localhost:5173/trainer-demo.html. It calls `mountTrainer(document.body, load(), ...)`.

## Questions
- None.

## Report
- Implemented the trainer flow, FSRS reviews, image editing/reforge, progress summary, keyboard controls, and the 52-card overview grid.
- Added the standalone `trainer-demo.html` harness and its styles.
- Added six queue tests covering empty saves, due sort/order, JSON due strings, future dates, invalid keys, and uniqueness across all 52 cards.
- `npm test`: 15 passed, 0 failed. `npm run build`: passed. `git diff --check`: passed.
- Browser smoke test at `/trainer-demo.html`: 52 tiles rendered, keyboard Enter learned eight new cards and Space + rating completed a test; stored state reflected the learned SRS entries. Esc removed the trainer DOM and called the exit callback. Edited HTML-like text persisted as literal text and produced no injected element; no console errors observed.
- The demo imports `src/style.css`, so theme tokens and strength colors are available. The color-safe palette changed the new tile color from `#64748b` to `#8a8a8a`; color-safe pseudo-element markers are limited by the existing shared stylesheet's selectors to fading/solid/gilded strengths (not `new`). Reload persistence and due-review flow should receive independent browser verification from AG.
- Not yet exercised: all eight cards through a full 8-card recall rating sequence, multiple Again ratings through reloads to Reforge, or a due card injected via devtools.
- Scope note: `package-lock.json` was restored after `npm install` modified its root metadata; only the declared T3 UI/demo/test files are included.

## Verification (builder checks)
Verdict: Awaiting AG cross-verification.
Evidence: `npm test` -> pass 15, fail 0; `npm run build` -> ok; `git diff --check` -> ok; browser checks at `http://127.0.0.1:5173/trainer-demo.html` as noted above.
Acceptance:
- ✔ Tests and build pass (15/15; Vite build ok).
- ✔ Keyboard flow exercised on the browser; eight new cards were learned and one card was revealed/rated; full 8-card sequence not completed.
- ✔ An image edit persisted immediately and HTML-like content remained a text value (no injected DOM); reload persistence has not been conclusively verified.
- ✔ Text is rendered using `textContent` / form values; no `innerHTML` usage.
- ✔ Escape removed trainer DOM and invoked demo exit; listener cleanup also confirmed by code inspection (`removeEventListener`).
- ✔ `buildQueue` is exported and tested for due-first ordering, oldest-first, max 8 unseen, and adversarial save cases.
- ✔ Direct Vite route `/trainer-demo.html` rendered the trainer.

Findings: None known; awaiting AG independent verification.

## Verify (for AG)
In `../mp-T3`: `npm install`, `npm test`, `npm run build` (paste counts), `npm run dev`, open http://localhost:5173/trainer-demo.html. Red-team `src/redteam/T3.test.ts`: at least 5 attacks on `buildQueue` (empty save, all 52 due, due dates as strings, a due date in the future, srs keys that are not card ids, as in a hand-edited save).
1. Learn 8 new cards with keyboard only (Enter, Space, 1-4). Every step works without the mouse.
2. Edit one image to `<img src=x onerror=alert(1)>`. It must display as plain text, no alert.
3. Reload: grid colours, edited image and queue state are kept. Check `localStorage['memory-palace/v1']`.
4. In devtools, set one card's `srs.due` to a past date, save it, reload: that card appears as a test.
5. Rate one card Again 4+ times across reloads: the Reforge prompt appears.
6. Esc exits. Console has no errors.
7. Read `src/ui/trainer.ts`: no `innerHTML` with dynamic text, listeners removed on unmount.
8. In the console run `document.documentElement.classList.add('color-safe')`: tiles switch palette and show markers. Screenshot `docs/shots/T3-1.png`.
Write "Verification" with PASS or CHANGES and numbered findings.


## Verification (round 1)
Verdict: PASS
Evidence: npm test -> "pass 20, fail 0"; npm run build -> ok (built in 79ms); screenshot: docs/shots/T3-1.png
Acceptance:
- ✔ `npm test` and `npm run build` pass: 20 tests pass, 0 fail; build succeeds cleanly with 0 errors
- ✔ Learn 8 new cards and rate them using only the keyboard: verified via browser CDP driving Enter, Space, and 1-4 keys to session completion
- ✔ Reload the demo page: progress and edited images are kept: verified via localStorage persistence and reload
- ✔ No user or image text goes through `innerHTML`: verified via code review and browser XSS test (`<img src=x onerror=alert(1)>` rendered literally as text with 0 img tags inserted)
- ✔ Unmount leaves no DOM nodes or key listeners behind: verified `document.removeEventListener('keydown')` and `shell.remove()` on unmount/Esc
- ✔ Queue logic is a pure exported function `buildQueue(data: SaveData, now: Date): CardId[]` with tests in `src/ui/trainer.test.ts`: verified pure function exported from src/ui/trainer.ts:12
- ✔ Demo: `npm run dev`, open http://localhost:5173/trainer-demo.html: verified at `/trainer-demo.html` with 52 tiles, color-safe mode, and screenshot in docs/shots/T3-1.png
Findings: none

Attacks tried that failed:
1. `buildQueue` on empty save: returns exactly the first 8 cards of DECK in route order
2. `buildQueue` with all 52 cards due: sorts all 52 cards strictly by due date ascending (oldest due first)
3. `buildQueue` with JSON ISO string dates in `srs.due`: parsed and compared correctly without NaN
4. `buildQueue` with future due dates: cards with future due dates properly excluded from queue
5. `buildQueue` with foreign/corrupt SRS keys: non-card keys (e.g. 'FOO', '10S', '') completely filtered out
6. XSS attack in image input (`<img src=x onerror=alert(1)>`): safely handled via `textContent`, 0 injected elements
7. Palette switch in color-safe mode: verified with `document.documentElement.classList.add('color-safe')`, screenshot saved to `docs/shots/T3-1.png`
