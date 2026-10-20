# T1 - 3D palace world

- Build: AG | Verify: FB | Est. 4h | Wave 1 | Branch: `task/T1-scene` | Worktree: `../mp-T1`

## Goal
A first-person three.js palace with 52 visually distinct loci on a fixed walking route, exposed through the `PalaceView` interface in `src/types.ts`. Other tasks only talk to the palace through that interface. The geometry must pass the invariants in `MATHS.md` section 8, and camera motion must follow section 7.

## Write scope
- `src/data/palace.ts`, `src/data/palace.test.ts` (new)
- `src/scene/**` (new), including `src/scene/ease.ts` and `src/scene/ease.test.ts`
- `scene-demo.html` (new, dev harness)
- `docs/shots/T1-*.png` (screenshots)

## Read first
`src/types.ts` (PalaceView, LocusInfo, LocusMood), `src/deck.ts` (`cardLabel`, `isRed`), `MATHS.md` sections 7 and 8.

## Layout data: `src/data/palace.ts` (pure, no three.js import)
Exact exports (other agents write tests against them):
```ts
import type { LocusInfo } from '../types.ts';
export interface Rect { x0: number; z0: number; x1: number; z1: number }   // metres, x0 < x1, z0 < z1
export interface Room { name: string; rect: Rect; light: number }          // light = hex colour
export interface Locus extends LocusInfo { kind: string; color: number; pos: [number, number]; face: [number, number] }
export const VIEW_DIST = 1.8;   // camera distance from the object
export const EYE_HEIGHT = 1.6;
export const WALL = 0.2;        // rooms shrink by this for walking
export const ROOMS: readonly Room[];   // route order
export const DOORS: readonly Rect[];   // DOORS[r] joins ROOMS[r] and ROOMS[r + 1], spans the wall gap
export const LOCI: readonly Locus[];   // 52, route order
export function viewpoint(i: number): [number, number];               // pos + VIEW_DIST * face
export function isWalkable(x: number, z: number): boolean;            // inside a shrunk room or a door
export function glidePath(from: number, to: number): [number, number][]; // [viewpoint(from), door centres in route order..., viewpoint(to)]
```
- Rooms in order, each clearly different: 1 Library (warm amber light, dark wood), 2 Kitchen (cool white light, tiles), 3 Greenhouse (green light, glass), 4 Observatory (deep blue light, star points on the ceiling).
- One continuous walk: enter room 1, go around the walls, exit through a door to room 2, and so on.
- `face` is the unit vector from the object toward the viewer. Loci stand against walls or in corners, never in the walking path.
- These positions become permanent once merged. Players memorize them.

## Tests you write
- `src/data/palace.test.ts`: every invariant G1-G6 in `MATHS.md` section 8, plus `glidePath(51, 0)` (recall starts by flying from the last locus back to the first).
- `src/scene/ease.test.ts`: every property of `easeInOutCubic` and `lerpAngle` in `MATHS.md` section 7 (check slopes with finite differences, h = 1e-6).

## View: `src/scene/palaceView.ts`
- `export const createPalaceView: CreatePalaceView`, implementing every `PalaceView` method.
- Renderer: antialias, fills the container, follows its size (ResizeObserver), pixel ratio capped at 2.
- Objects: a kit function builds each `kind` from 2-5 primitives (box, cylinder, sphere, cone, torus). At least 15 kinds. Share geometries and materials.
- Floor plaque with the locus number (1-52) in front of each object. Golden path ribbon on the floor along `glidePath` of consecutive loci.
- `glideTo(i)`: camera moves along `glidePath(current, i)` at eye height, eased with `easeInOutCubic` over `glideMs` (default 600, set by `setGlideMs`), yaw by `lerpAngle`, ends facing the object. A new call mid-glide wins and the earlier promise resolves. `glideMs = 0`: jump at once, promise resolves on the next frame.
- `showCard(i, card, { caption, opacity })`: card billboard above the object facing the camera. Canvas texture: white card, `cardLabel(card)`, red for hearts and diamonds, caption below (max 2 lines). `opacity` default 1, clamp to [0, 1]. Small bob animation.
- `setLocusMood`: `weak` = dimmed with a dull red emissive, `highlight` = pulsing glow, `normal` = reset.
- `setFreeWalk(true)`: `PointerLockControls` from `three/examples/jsm/controls/PointerLockControls.js`. WASD/arrows at 3 m/s. Blocked by `isWalkable` (try x and z moves separately so you slide along walls). Click to lock, Esc unlocks. `false` = guided mode.
- `onLocusClick`: raycast on click; screen centre when the pointer is locked.
- One `renderer.setAnimationLoop`. `dispose()` stops it, disposes geometries, materials, textures and the renderer, disconnects the ResizeObserver, removes the canvas and every listener.
- Performance: no shadow maps, under 300 draw calls, 60 fps on a laptop integrated GPU.

## Dev harness: `scene-demo.html` + `src/scene/demo.ts`
- Full-window palace. Keys: Right/Left = next/previous locus, C = random card at current locus, G = all shown cards to opacity 0.25, X = toggle weak, H = toggle highlight, F = toggle free walk, 0 = glide speed 0, 6 = glide speed 600. On-screen help and current locus name.
- Expose the view as `window.__view` for the verifier.
- `npm run dev`, then http://localhost:5173/scene-demo.html

## Acceptance
- [x] `npm test` (including your two test files) and `npm run build` pass.
- [x] Right arrow 52 times visits every locus in order, each stop faces its object, plaque number matches. 51 -> 0 glide goes through the doors.
- [x] Card labels readable from the viewpoint. Red suits red. Opacity 0.25 clearly faint.
- [x] Free walk works, walls block, doors pass, Esc releases.
- [x] No console errors. `window.__view.dispose()` removes the canvas.
- [x] Screenshots `docs/shots/T1-room1.png` ... `T1-room4.png`.
- [x] No new dependencies. `src/scene` imports only `three`, `three/examples/jsm/...`, `../types.ts`, `../deck.ts`, `../data/palace.ts`, and its own files.

## Do not
- Do not edit `src/types.ts` or files outside the write scope.
- No external model files, web textures, or post-processing. The art pass is T9.

## Questions

None.

## Report

- Built 3D memory palace layout in `src/data/palace.ts` with 4 rooms (`Library`, `Kitchen`, `Greenhouse`, `Observatory`), 3 doors spanning wall gaps, and 52 loci strictly satisfying invariants G1-G6:
  - G1: 52 loci, 13 per room in route order.
  - G2: 52 unique names, 52 unique (kind, color) pairs, 22 distinct object kinds (>= 15 required), no adjacent loci share a kind (including 51 -> 0 wrap).
  - G3: All 1326 pairwise distances >= 2.0m (min distance = 2.08m).
  - G4: Unit face vectors (|face| = 1.0) and all viewpoints `v_i = pos_i + 1.8 * face_i` lie inside rooms shrunk by 0.3m.
  - G5: Continuous walkable area through shrunk rooms and doorways; all 52x52 (2704 pairs) glide paths stay within walkable area checked at 0.05m intervals.
  - G6: Angular rotation around room center turns monotonically in the same direction <= 360° per room.
- Implemented camera easing in `src/scene/ease.ts` (`easeInOutCubic`, `lerpAngle`) and tested all mathematical properties (continuity, monotonicity, symmetry, finite difference slopes at 0, 0.5, 1 with h = 1e-6, shortest arc interpolation).
- Implemented `PalaceView` in `src/scene/palaceView.ts` and modular scene subsystems:
  - `src/scene/objectKit.ts`: 22 distinct 3D object models using 2-5 primitives with shared geometries, mood styling (weak, highlight, normal), and floor plaques (1-52).
  - `src/scene/cardBillboard.ts`: crisp canvas textures for cards with captions, bob animation, and GPU cleanup disposing textures and materials on replacement or clear.
  - `src/scene/palaceWorld.ts`: room floors, walls, door archways, lighting, observatory star field, and golden path floor ribbon.
  - `src/scene/palaceView.ts`: smooth multi-segment camera gliding, `glideMs = 0` instant jump, free walk with `PointerLockControls` and separate X/Z wall sliding against `isWalkable`, raycasting on click, and comprehensive `dispose()` removing all DOM elements, event listeners, loops, and GPU resources.
- Dev harness in `scene-demo.html` + `src/scene/demo.ts` with on-screen HUD, key bindings (Right/Left, C, G, X, H, F, 0, 6), and `window.__view` exposed.
- Browser playtested in Edge via CDP with zero console errors. All 4 room screenshots generated at `docs/shots/T1-room1.png` ... `T1-room4.png`.
- Tests and build:
  - `npm test`: 21 passing, 0 failing.
  - `npm run build`: cleanly passes TypeScript typecheck and Vite build.

## Verify (for FB)
In `../mp-T1`: `npm install`, `npm test`, `npm run build`, paste counts.
1. **Independent check**: in `src/redteam/T1.test.ts`, re-implement G3, G4 and G5 yourself (do not import the builder's test helpers) and run them on `LOCI`, `ROOMS`, `DOORS`. Add attacks: `glidePath(i, i)`, `glidePath(0, 51)`, `isWalkable` exactly on a wall line and in a door, `lerpAngle` with a = b, |b − a| = π, angles beyond ±2π, t = 0 and t = 1.
2. **Mutation check**: move one locus 1 m toward its neighbour, run `npm test`, confirm `palace.test.ts` fails, undo with `git checkout -- src`. Same for changing the `4t³` branch of `easeInOutCubic` to `3t³`.
3. **Code review of `src/scene/`**: count `addEventListener` vs `removeEventListener`; `setAnimationLoop(null)`, `renderer.dispose()`, `ResizeObserver.disconnect()` in `dispose`; textures from canvases disposed when a card is replaced (GPU leak); a second `glideTo` during a glide resolves the first promise; `glideMs = 0` path; imports only from the allowed list; no `any` without a reason.
4. Look at the 4 screenshots: rooms easy to tell apart? Neighbouring objects different?
5. **Lock test** (only in the round you PASS): write `src/redteam/T1-lock.test.ts` that freezes every locus as a literal table (index, room, name, kind, pos, face), copied from the PASSing code, and asserts `LOCI` deep-equals it. From then on, any move of a locus fails `npm test` (T9 depends on this).
Write "Verification" as TASKS.md says. The Lead does the browser check at merge.
