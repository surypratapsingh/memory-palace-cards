# T1 - 3D palace world

- Builder: Sonnet 5.5 | Verifier: Antigravity | Wave 1 | Branch: `task/T1-scene` | Worktree: `../mp-T1`
- Status line for board: see TASKS.md

## Goal
A first-person three.js palace with 52 visually distinct loci on a fixed walking route, exposed through the `PalaceView` interface in `src/types.ts`. Other tasks (drill, home) only talk to the palace through that interface.

## Write scope
- `src/data/palace.ts` (new)
- `src/scene/**` (new)
- `scene-demo.html` (new, dev harness)

## Read first
`src/types.ts` (PalaceView, LocusInfo, LocusMood), `src/deck.ts` (`cardLabel`, `isRed`).

## Requirements

### Layout data: `src/data/palace.ts`
- Export the palace layout: 4 rooms x 13 loci = 52 loci, in walking order.
- Rooms, in order, each with a clearly different look:
  1. Library: warm amber light, dark wood.
  2. Kitchen: cool white light, tiles.
  3. Greenhouse: green light, glass.
  4. Observatory: deep blue light, star points on the ceiling.
- Rooms connect with doorways so the route is one continuous walk: enter room 1, go clockwise along the walls, exit to room 2, and so on.
- Each locus: `name` (e.g. "Red armchair"), `kind` (an object type from your kit), `color`, position. Loci at least 2 m apart, against walls or in corners, never in the middle of the walking path.
- Distinctness rules (classical loci rules): no two loci share the same kind + color; neighbours in the route have different kinds; names unique.
- These positions become permanent once released. Players memorize them.

### View: `src/scene/palaceView.ts`
- `export const createPalaceView: CreatePalaceView` implementing every `PalaceView` method.
- Renderer: antialias, fills the container, follows container size (ResizeObserver), pixel ratio capped at 2.
- Objects: a kit function that builds each `kind` from 2-5 primitives (box, cylinder, sphere, cone, torus). At least 15 kinds. Share geometries and materials where possible.
- Floor plaque with the locus number (1-52) in front of each object.
- Golden path ribbon on the floor joining loci in order.
- `glideTo(i)`: camera eases to 1.8 m in front of the object at eye height 1.6 m, facing it, about 600 ms (one constant). A new call mid-glide wins; the earlier promise resolves.
- `showCard(i, card, opts)`: card billboard above the object facing the camera. Canvas texture: white card, `cardLabel(card)`, red for hearts/diamonds, caption below (wrap to 2 lines). `ghost` = opacity 0.25. Small bob animation.
- `setLocusMood`: `weak` = dimmed with dull red emissive, `highlight` = pulsing glow, `normal` = reset.
- `setFreeWalk(true)`: `PointerLockControls` from `three/examples/jsm/controls/PointerLockControls.js`. WASD/arrows at 3 m/s. Cannot pass through walls (clamp to walkable rectangles is fine). Click canvas to lock, Esc unlocks. `false` = guided mode, camera moves only via `glideTo`.
- `onLocusClick`: raycast on click. When pointer is locked, use the screen centre.
- One `renderer.setAnimationLoop`. `dispose()` stops it, disposes geometries, materials, textures, removes the canvas and every listener.
- Performance: no shadows (or one light only), under 300 draw calls, 60 fps on a laptop integrated GPU.

### Dev harness: `scene-demo.html` + `src/scene/demo.ts`
- Full-window palace. Keys: Right/Left = next/previous locus, C = random card at current locus, G = ghost all shown cards, X = toggle weak on current, H = toggle highlight, F = toggle free walk. Small on-screen help and current locus name.
- Expose the view as `window.__view` for the verifier.
- Open with `npm run dev`, then http://localhost:5173/scene-demo.html

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] `view.loci.length === 52`, names unique, rooms named as above.
- [ ] Right arrow 52 times visits every locus in order, each stop faces its object, plaque number matches.
- [ ] Card labels readable from the glide position. Red suits red. Ghost clearly faint.
- [ ] Free walk works, walls block, Esc releases.
- [ ] No console errors. `window.__view.dispose()` removes the canvas.
- [ ] No new dependencies. `src/scene` imports only `three`, `three/examples/jsm/...`, `../types.ts`, `../deck.ts`, `../data/palace.ts`.

## Do not
- Do not edit `src/types.ts` or other files outside the write scope.
- No external model files, textures from the web, or post-processing. The art pass is T9.

## Questions
(builder writes here if blocked)

## Report
(builder fills when done: what was built, files, how to check, known gaps)

## Verify (for the verifier)
Run in `../mp-T1`: `npm install`, `npm test`, `npm run build`, `npm run dev`, open http://localhost:5173/scene-demo.html.
1. Press Right 52 times. Every stop faces an object, plaque numbers 1-52 in order, route never jumps across a room.
2. No two neighbouring loci look alike. The 4 rooms are easy to tell apart by light and colour.
3. C shows a card: readable, faces camera, red suits red. G makes it faint. X and H visibly change the object.
4. F: walk with WASD and mouse. Try to walk through every wall of room 1. Esc releases.
5. Resize the window: no stretching.
6. Console: no errors or warnings from our code. Note rough fps.
7. Console: `__view.loci.length` is 52. `__view.dispose()` removes the canvas without errors.
8. Read `src/scene`: listeners removed in dispose, no imports outside the allowed list, no `any` without a reason.
Write the "Verification" section with PASS or CHANGES and numbered findings. Attach screenshots of each room if your tool can.
