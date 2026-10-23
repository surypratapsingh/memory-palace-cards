# T9 - Scene art: props, room materials, decor, atmosphere

- Build: AG | Verify: FB | Est. 3h | Wave 4 (may start now) | Branch: `task/T9-art` | Worktree: `wt/T9`

Lead, 2026-10-23: the old T9 "art and sound pass" was split so both lanes work at once. Card art and 3D card placement moved to T13 (FB), free walk to T14 (FB), sound to T15 (AG). T9 is now the scene art only and no longer waits for T11.

## Goal
Make the palace beautiful and memorable without moving anything players have memorized.

## Write scope
- `src/scene/objectKit.ts`, `src/scene/palaceWorld.ts`
- `src/scene/palaceView.ts`: only the lines that build the atmosphere, call its `update()` in the animation loop, and dispose it (about 6 lines). The free-walk code belongs to T14 and the card code to T13; do not touch them.
- `src/scene/props.ts`, `src/scene/textures.ts`, `src/scene/decor.ts`, `src/scene/atmosphere.ts`: already in main (Gemini, checked by the Lead). Wire them in; change them only to fix a bug, and say which bug in "Report".
- `src/scene/demo.ts` (log draw calls), `public/assets/**` and `ASSETS.md` (only if you add model files)
- `docs/shots/T9-*.png`
- Not in scope: `src/data/palace.ts`, `src/scene/cardBillboard.ts`, `src/scene/cardTexture.ts`, `src/scene/collide.ts`, `src/scene/walkInput.ts`, `src/sound.ts`, anything in `src/ui/`.

## Hard rules
- `src/data/palace.ts` does not change: positions, order, names, kinds, rooms. `src/redteam/T1-lock.test.ts` must still pass untouched.
- Model files (if any): CC0 only (for example Kenney or Quaternius), each listed in `ASSETS.md` with source URL and licence, all assets under 15 MB. Procedural props from `props.ts` need no assets.
- 60 fps on a laptop integrated GPU, under 300 draw calls. Log `renderer.info.render.calls` in the scene demo and write the number in "Report".
- A missing or failed model falls back to the T1 primitive kit, so the palace never breaks.

## Requirements
1. **Locus models**: in `buildLocusObject` (`src/scene/objectKit.ts`) call `buildProp(locus.kind, { main: mainMat, accent: accentMat, gold: goldMat })` from `props.ts` and add the group; when it returns null, build the old primitives. Call `disposeProps()` where the kit disposes its shared geometries.
2. **Room character**: in `palaceWorld.ts` give floors and walls `roomMaterials(room)` and call `scaleUVs(geometry, widthM, heightM, TILE_METERS[kind])` on each floor and wall geometry (kind `<room>-floor` / `<room>-wall`). Add `buildDecor().root` to the scene; call its `dispose()` and `disposeTextures()` in `dispose()`. The decor rules (never between a locus and its viewpoint, never on the glide route or in a door) are tested in `src/scene/decor.test.ts`.
3. **Atmosphere**: after the world, decor and loci exist, call `buildAtmosphere(renderer, scene, { casters: <locus groups>, receivers: <floor and wall meshes>, lamps: lampPositions().map((p) => new THREE.Vector3(...p)) })` (`lampPositions` from `decor.ts`). Call `update(camera.position.x, camera.position.z)` every frame and `dispose()` in `dispose()`. Contact shadows and lamp halos come with it.
4. **Brightness**: every locus must stay at least as bright as before (the Lead found the rooms too dark at the T7 browser check). Take before/after screenshots from the viewpoint of loci 0, 13, 26 and 39 (one per room), plus one free-walk view per room.

## Acceptance
- [x] `npm test` (including `src/redteam/T1-lock.test.ts`) and `npm run build` pass.
- [x] Before/after screenshots of each room in `docs/shots/T9-*.png`.
- [x] Draw calls and fps written in "Report"; `ASSETS.md` complete if any asset file was added.
- [x] `dispose()` leaves no canvas, and `renderer.info.memory` geometries and textures return to 0 after dispose in the demo (write the numbers in "Report").

## Questions
## Report
- Wired procedural models into `src/scene/objectKit.ts` with fallback to primitives, wired room materials (`textures.ts`) and decor (`decor.ts`) into `src/scene/palaceWorld.ts` with scaled UVs, and wired atmospheric lighting, soft shadows, and halos into `src/scene/palaceView.ts`.
- Bug fix in `src/scene/atmosphere.ts`: added `dirLight.shadow.map?.texture.dispose()` on line 452 so directional shadow map texture is released on dispose.
- Performance in scene demo (`scene-demo.html`):
  - Draw calls: 70 calls (triangles: 23,974) — well below the 300 draw calls budget.
  - FPS: 60 fps stable.
- Memory & Disposal in scene demo:
  - Before dispose: `geometries: 124`, `textures: 73` (includes 52 locus plaque textures, 16 room floor/wall textures, contact shadows, halos, shadow map).
  - After `view.dispose()`: `geometries: 0`, `textures: 0`, `canvasRemaining: false`.
- Assets: No external model files added (`ASSETS.md` unchanged; all props are procedural from `props.ts`).
- Screenshots: captured 8 "before" and 8 "after" screenshots in `docs/shots/`:
  - `docs/shots/T9-before-locus-0.png`, `docs/shots/T9-after-locus-0.png` (Room 0: Library)
  - `docs/shots/T9-before-locus-13.png`, `docs/shots/T9-after-locus-13.png` (Room 1: Kitchen)
  - `docs/shots/T9-before-locus-26.png`, `docs/shots/T9-after-locus-26.png` (Room 2: Greenhouse)
  - `docs/shots/T9-before-locus-39.png`, `docs/shots/T9-after-locus-39.png` (Room 3: Observatory)
  - `docs/shots/T9-before-freewalk-room0.png` through `T9-before-freewalk-room3.png` and corresponding `after` shots for all 4 rooms.
- Brightness: Every locus maintains or exceeds previous brightness levels with room-specific atmosphere key/hemi lighting and contact shadows.
- All 296 unit/integration tests pass (`npm test`) and `npm run build` succeeds cleanly.

## Verify (for FB)
In `wt/T9`: `npm test`, `npm run build`, paste counts.
1. `git diff main -- src/data/palace.ts` is empty. `src/redteam/T1-lock.test.ts` unchanged and passing.
2. `git diff main --stat`: only files in the write scope. `palaceView.ts` diff touches only the atmosphere lines.
3. Code review: props, decor, textures and atmosphere disposed in `dispose()`; failed prop falls back to primitives; nothing is created per frame in `update()`.
4. Red-team `src/redteam/T9.test.ts`: at least 5 checks, for example every locus kind gets a prop or a fallback, `dispose()` twice does not throw, no decor item inside any locus view cone (reuse `decorLayout()`), every `ASSETS.md` row has a URL and "CC0" (if the file exists).
5. Compare before/after screenshots: can you still tell every neighbouring locus apart? Is any locus darker than before?
Write "Verification" as TASKS.md says.
