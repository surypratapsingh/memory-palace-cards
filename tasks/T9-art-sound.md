# T9 - Art and sound pass

- Build: AG | Verify: FB | Est. 5h | Wave 4 (start after T11 is verified) | Branch: `task/T9-art` | Worktree: `wt/T9`

## Goal
Make the palace beautiful and memorable without moving anything players have memorized.

## Write scope
- `src/scene/**` (not `src/data/palace.ts`; `src/scene/props.ts` is already in main, written by Gemini and checked by the Lead: use it, change it only to fix a bug)
- `public/assets/**` (new), `ASSETS.md` (new)
- `src/sound.ts` (already in main, written by Gemini and checked by the Lead; wire it in, change it only to fix a bug)
- `docs/shots/T9-*.png`
- Card faces only: `src/ui/cardFace.ts` and the card-face code in `src/ui/cardPicker.ts` and `src/ui/drill.ts` (Lead, 2026-10-21)

## Hard rules
- `src/data/palace.ts` does not change: positions, order, names, kinds, rooms. `src/redteam/T1-lock.test.ts` (written by FB when T1 passed) must still pass untouched.
- CC0 assets only (for example Kenney or Quaternius). List every file with source URL and licence in `ASSETS.md`.
- All assets under 15 MB total. 60 fps on a laptop integrated GPU, under 300 draw calls (log `renderer.info.render.calls` in the scene demo).
- A missing or failed model falls back to the T1 primitive kit, so the palace never breaks.

## Requirements
- Locus models: in `buildLocusObject` (`src/scene/objectKit.ts`) call `buildProp(locus.kind, { main: mainMat, accent: accentMat, gold: goldMat })` from `src/scene/props.ts` and add the group; when it returns null, build the old primitives. Call `disposeProps()` where the kit disposes its shared geometries. Room decorations may use GLTF files (GLTFLoader from `three/examples/jsm`, CC0 only) or more procedural parts.
- Room character (Lead, 2026-10-21): `src/scene/textures.ts` and `src/scene/decor.ts` are already in main (from Gemini); use them, change them only to fix a bug. In `palaceWorld.ts` give floors and walls `roomMaterials(room)` and call `scaleUVs(geometry, widthM, heightM, TILE_METERS[kind])` on each floor/wall geometry (kind `<room>-floor` / `<room>-wall`). Add `buildDecor().root` to the scene and call its `dispose()` and `disposeTextures()` in `dispose()`. Decor rules (never between a locus and its viewpoint, never on the glide route or in a door) are tested in `src/scene/decor.test.ts`.
- Atmosphere (Lead, 2026-10-21): `src/scene/atmosphere.ts` is in main (Gemini, Lead-tuned); use it, change it only to fix a bug. After the world, decor and loci exist: `buildAtmosphere(renderer, scene, { casters: <locus groups>, receivers: <floor and wall meshes>, lamps: lampPositions().map((p) => new THREE.Vector3(...p)) })` (`lampPositions` from `decor.ts`), call `update(camera.position.x, camera.position.z)` every frame and `dispose()` in `dispose()`. Contact shadows and lamp halos come with it. Every locus must stay at least as bright as before; add before/after screenshots from each room's viewpoints.
- Free walk (Lead, 2026-10-21): `src/scene/collide.ts` and `src/scene/walkInput.ts` are in main (Gemini); use them, change them only to fix a bug. In `palaceView.ts` replace the free-walk code (keys by `e.key`, fixed 3 m/s, `isWalkable` only) with a `Set` of `e.code` values, `keysFromCodes(set)` and `state = stepWalk(state, keys, yaw, delta)`. Clear the set on `blur` and when free walk ends, so a key held while the tab loses focus does not keep walking. This fixes Shift/Caps Lock W and walking through furniture.
- Card art (Lead, 2026-10-21): `src/ui/cardArt.ts` and `src/scene/cardTexture.ts` are in main (Gemini). `cardFace(id)` renders `cardSvg(id, { theme })`, theme `'four-colour'` when `<html>` has class `color-safe`, else `'classic'`; keep the element's class names so trainer styles still apply. The drill's card picker and card displays use `cardFace`. A card shown in 3D at a locus uses `cardTexture(id, theme)` on a plane; call `disposeCardTextures()` in `dispose()`. See `cards-demo.html`.
- 3D card placement (Lead browser check, 2026-10-23, after T7 merge): during memorize the floating card sits so high that its top is cut off by the screen edge at 1366x768 and 800x600, and its caption is cut after two lines ("A snail delivers a rose to its"). With `cardTexture` in place: the whole card and its locus object must be inside the view at 16:9 and 4:3, and the caption must not be cut (shorter caption or smaller text on the card; the full caption stays in the HUD). During recall the card picker covers the lower part of the locus object; keep the object visible above the picker. Add screenshots.
- Sound: call `play('flip' | 'whoosh' | 'correct' | 'wrong', data.settings.sound)` and `ambience(roomName, data.settings.sound)` from `src/sound.ts` at the right moments; call `stopAll()` in `dispose()`. Sound is off by default. Volume is low.

## Acceptance
- [ ] `npm test` (including `src/redteam/T1-lock.test.ts`) and `npm run build` pass.
- [ ] Before/after screenshots of each room.
- [ ] `ASSETS.md` complete; total asset size written in "Report".
- [ ] Draw calls and fps written in "Report".

## Questions
## Report

## Verify (for FB)
In `wt/T9`: `npm test`, `npm run build`, paste counts.
1. `git diff main -- src/data/palace.ts` is empty. `src/redteam/T1-lock.test.ts` unchanged and passing.
2. `ASSETS.md`: every file in `public/assets` listed, each licence is CC0 (open the source page if you can), total size under 15 MB (`du -sh public/assets`).
3. Code review: models and their textures disposed in `dispose()`; failed load falls back; sound never plays when `settings.sound` is false; no autoplay before a user gesture.
4. Red-team `src/redteam/T9.test.ts`: at least 5 checks, for example every `ASSETS.md` row has a URL and "CC0", no asset file over 5 MB, `sound.ts` with sound off makes no `AudioContext`.
5. Compare before/after screenshots: can you still tell every neighbouring locus apart?
Write "Verification" as TASKS.md says.
