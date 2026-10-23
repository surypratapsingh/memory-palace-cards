# T14 - Free walk: collision, physical keys, focus safety

- Build: FB | Verify: AG | Est. 1.5h | Wave 4 (may start now) | Branch: `task/T14-free-walk` | Worktree: `wt/T14`

## Goal
Free walk (Shadow Walk, and later the journey trainer) feels solid: you cannot walk through furniture, keys work with Shift and Caps Lock and on non-QWERTY layouts, and nothing keeps walking after the tab loses focus.

## Write scope
- `src/scene/freeWalk.ts` (new) and `src/scene/freeWalk.test.ts` (new)
- `src/scene/palaceView.ts`: only the free-walk code (the `keys` object, `onKeyDown`/`onKeyUp`, the click-to-lock and click raycast in `onCanvasClick`, the "Free walk update" block in the animation loop, `setFreeWalk`, and the matching lines in `dispose()`). Not the atmosphere lines (T9) or `glideTo` (T13).
- `src/scene/collide.ts`, `src/scene/walkInput.ts`: already in main (Gemini, checked by the Lead). Use them; change them only to fix a bug, and say which bug in "Report".
- `docs/shots/T14-*.png`

## Requirements
1. Move the free-walk logic out of `palaceView.ts` into `freeWalk.ts`, so `palaceView.ts` keeps only a few call lines. Suggested shape (change it if a simpler one works):
   `createFreeWalk(): { keyDown(code: string): void; keyUp(code: string): void; clear(): void; step(pos: { x: number; z: number }, yaw: number, dt: number): { x: number; z: number } }`.
2. Keys by physical key: store `e.code` values in a `Set`, call `keysFromCodes(set)` and `state = stepWalk(state, keys, yaw, delta)` (walk 1.6 m/s, run with Shift 3.2 m/s, collision and sliding from `collide.ts`). Remove the old `e.key` keys object, the fixed 3 m/s speed and the `isWalkable`-only check.
3. Clear the key set on `window` `blur`, on `visibilitychange` to hidden, when free walk ends (`setFreeWalk(false)`), and when pointer lock is lost. Ignore key events whose target is an `input`, `textarea` or `select`.
4. Entering free walk at a guided viewpoint that is inside a furniture box puts the body at `nearestFree` (no stuck start).
5. **No pointer lock** (embedded previews, some iframes; the Lead's Shadow Walk click did nothing there): when `requestPointerLock` fails, use drag-to-look (mouse button held moves yaw and pitch) and raycast locus clicks from the mouse position, not from the screen centre. With pointer lock, keep the current crosshair behaviour.
6. All listeners added by free walk are removed in `dispose()`.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] `freeWalk.test.ts`: at least 6 tests without WebGL, for example Shift+W runs, `KeyW` works when `e.key` is "W" or "z" (AZERTY), `clear()` stops movement within `STOP_TIME`, `blur` clears keys, a start inside a box moves to a free spot, a long frame (`dt` 1 s) does not tunnel through a wall.
- [ ] `palaceView.ts` free-walk code is replaced by calls into `freeWalk.ts` (write the line count before/after in "Report").
- [ ] Screenshot of Shadow Walk standing next to furniture without clipping into it.

## Questions
## Report

## Verify (for AG)
In `wt/T14`: `npm test`, `npm run build`, paste counts. Then `npm run dev`, Shadow Walk.
1. Browser: walk into every piece of furniture in one room: no clipping, smooth sliding along it. Hold W, Alt+Tab away, come back: you are not walking. Caps Lock on: W still walks. Shift runs.
2. Click a locus in Shadow Walk with pointer lock and (if your browser agent has no pointer lock) without it: the check prompt opens for the right locus.
3. Code review: no listener left after `dispose()`; nothing allocated per frame in `step` (no `new THREE.Vector3` per frame).
4. Red-team `src/redteam/T14.test.ts`: at least 5 adversarial tests, for example NaN or negative `dt`, all keys held at once, `keyUp` for a key never pressed, `clear()` twice, a 10 s walk into a corner never ends inside a box.
Write "Verification" as TASKS.md says.
