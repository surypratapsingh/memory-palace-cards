# T9 - Art and sound pass

- Build: AG | Verify: FB | Est. 3h | Wave 4 (start after T11 is verified) | Branch: `task/T9-art` | Worktree: `wt/T9`

## Goal
Make the palace beautiful and memorable without moving anything players have memorized.

## Write scope
- `src/scene/**` (not `src/data/palace.ts`; `src/scene/props.ts` is already in main, written by Gemini and checked by the Lead: use it, change it only to fix a bug)
- `public/assets/**` (new), `ASSETS.md` (new)
- `src/sound.ts` (already in main, written by Gemini and checked by the Lead; wire it in, change it only to fix a bug)
- `docs/shots/T9-*.png`

## Hard rules
- `src/data/palace.ts` does not change: positions, order, names, kinds, rooms. `src/redteam/T1-lock.test.ts` (written by FB when T1 passed) must still pass untouched.
- CC0 assets only (for example Kenney or Quaternius). List every file with source URL and licence in `ASSETS.md`.
- All assets under 15 MB total. 60 fps on a laptop integrated GPU, under 300 draw calls (log `renderer.info.render.calls` in the scene demo).
- A missing or failed model falls back to the T1 primitive kit, so the palace never breaks.

## Requirements
- Locus models: in `buildLocusObject` (`src/scene/objectKit.ts`) call `buildProp(locus.kind, { main: mainMat, accent: accentMat, gold: goldMat })` from `src/scene/props.ts` and add the group; when it returns null, build the old primitives. Call `disposeProps()` where the kit disposes its shared geometries. Room decorations may use GLTF files (GLTFLoader from `three/examples/jsm`, CC0 only) or more procedural parts.
- Room character: materials, light colour, small decorations away from loci (never between a locus and its viewpoint).
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
