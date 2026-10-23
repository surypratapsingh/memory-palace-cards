# T13 - Card art in the UI and in 3D, card placement

- Build: FB | Verify: AG | Est. 2.5h | Wave 4 (may start now) | Branch: `task/T13-card-art` | Worktree: `wt/T13`

## Goal
Every card the player sees, in the DOM and floating at a locus, uses the real card art from `src/ui/cardArt.ts` (Gemini round 2, in main). The floating card and its locus object are both fully in view, and the recall picker never hides the locus.

## Write scope
- `src/ui/cardFace.ts`, `src/ui/cardPicker.ts`
- `src/scene/cardBillboard.ts` (the floating card)
- `src/scene/cardTexture.ts`, `src/ui/cardArt.ts`: change only to fix a bug, and say which bug in "Report"
- `src/scene/palaceView.ts`: only the camera look-at target inside `glideTo` (and the guided-mode pitch), if you need it for requirement 3. Not the free-walk code (T14) or the atmosphere lines (T9).
- `src/ui/drill.css`: only the `.card-picker` / `.picker-*` rules (requirement 4)
- New tests: `src/ui/cardFace.test.ts`, `src/scene/cardPlacement.test.ts`
- `docs/shots/T13-*.png`
- Not in scope: `src/ui/drill.ts` (T11 is changing it), `src/ui/home.ts` (U2 redesigns it), `src/data/palace.ts`.

## Requirements
1. **DOM card face**: `cardFace(id)` renders `cardSvg(id, { theme })` from `cardArt.ts`. Theme `'four-colour'` when `<html>` has class `color-safe`, else `'classic'`. Keep the element's class names (`card-face`, `red`) so trainer styles still apply. The element has `role="img"` and an `aria-label` such as "Queen of hearts". The SVG comes from our own code, not from user text, so building it from the `cardSvg` string is allowed; still never put user text into it.
2. **Picker**: each picker button shows a small card face (or the rank and suit symbol drawn like the card art at small size), keeps its `data-card`, `data-rank`, `data-suit` attributes, its text for screen readers, and keyboard picking (rank then suit). Used cards stay visibly greyed and disabled.
3. **Floating card in 3D**: `CardBillboardManager` draws the card with `cardTexture(id, theme)` on its plane instead of the canvas text. `cardTexture` returns a Promise: show the plane only when the texture is ready, and do nothing if the card was removed or replaced before the Promise resolved (no leaked texture, no card at the wrong locus). The caption is not drawn on the card any more; the full caption stays in the drill HUD. Call `disposeCardTextures()` in `dispose()`.
4. **Placement**: at the guided viewpoint of every locus (`viewpoint(i)`, `EYE_HEIGHT`, the camera fov and near plane in `palaceView.ts`), the whole card plane and the top of the locus object are inside the view frustum at aspect 16:9 and 4:3, with at least 5% margin to every edge. Prove it with `src/scene/cardPlacement.test.ts`, which projects the card corners and the object's top centre with a `THREE.PerspectiveCamera` for all 52 loci at both aspects (no WebGL needed). Lead's browser check on 2026-10-23: the card top was cut off at 1366x768 and 800x600.
5. **Picker size**: during recall at 1366x768 the picker takes at most the bottom 40% of the screen and the locus object stays visible above it. Screenshot at 1366x768 and 1920x1080.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] `cardPlacement.test.ts` passes for all 52 loci at 16:9 and 4:3.
- [ ] Screenshots: trainer card, recall picker, a floating card in each of the 4 rooms, colour-safe theme.
- [ ] No canvas-text card code left in `cardBillboard.ts`.

## Questions
None.

## Report
- `cardFace` now embeds the authored `cardSvg` at a compact width, retains `.card-face` / `.red`, selects the root's classic or four-colour theme, and has a card-name accessible label. The recall picker shows authored rank/suit miniatures, preserves visible label text and all `data-*` attributes, and keeps used cards disabled and greyed.
- Floating billboards now use `cardTexture(id, theme)`, stay hidden until the image is ready, and reject stale async completions when replaced/cleared; caption remains in the drill HUD. Shared cached textures use release references and `disposeCardTextures()` is called on manager disposal. Removed all canvas text card rendering from `cardBillboard.ts`.
- Guided view aims at height 1.3 m and the 0.8 × 0.65 m billboard is centred at 1.9 m; placement test projects all corners and top centres for 52 loci at 16:9 and 4:3 with at least 5% viewport margin.
- Verification: `npm install` (0 vulnerabilities); targeted card-face and placement tests pass (3/3); `npm test` passes (299/299); `npm run build` succeeds (Vite large-chunk warning remains); `git diff --check` clean. Vite responded HTTP 200 for the app and transformed card-face, picker, and billboard modules. Browser playthrough and required screenshot set were not captured in this FB session; AG verification remains required.

## Verify (for AG)
In `wt/T13`: `npm test`, `npm run build`, paste counts. Then `npm run dev` and play a 5-card drill.
1. Browser: every floating card fully visible with its object at 1366x768, 1920x1080 and 800x600; the picker leaves the locus visible; colour-safe mode switches the suits to four colours in the trainer, the picker and in 3D.
2. Rapid input: press Right fast through a 13-card memorize. Does a card ever appear at the wrong locus or stay behind after `clearCards()`?
3. Code review: texture disposal on remove, replace and dispose; the async race in requirement 3; no `innerHTML` with any user or image text.
4. Red-team `src/redteam/T13.test.ts`: at least 5 checks, for example `cardFace` for all 52 ids has an aria-label, colour-safe theme, picker keeps `data-card` for all 52, placement margin at a 21:9 aspect (report only, S3), showCard then clearCards before the texture resolves leaves no mesh.
Write "Verification" as TASKS.md says.
