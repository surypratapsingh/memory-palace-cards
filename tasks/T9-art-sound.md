# T9 - Art and sound pass

- Build: AG | Verify: FB | Est. 3h | Wave 4 (start after T11 is merged) | Branch: `task/T9-art` | Worktree: `../mp-T9`

## Goal
Make the palace beautiful and memorable without moving anything players have memorized.

## Write scope
- `src/scene/**` (not `src/data/palace.ts`)
- `public/assets/**` (new), `ASSETS.md` (new)
- `src/sound.ts` (new)
- `docs/shots/T9-*.png`

## Hard rules
- `src/data/palace.ts` does not change: positions, order, names, kinds, rooms. The Lead adds `src/data/palace.lock.test.ts` at the T1 merge; it must still pass untouched.
- CC0 assets only (for example Kenney or Quaternius). List every file with source URL and licence in `ASSETS.md`.
- All assets under 15 MB total. 60 fps on a laptop integrated GPU, under 300 draw calls (log `renderer.info.render.calls` in the scene demo).
- A missing or failed model falls back to the T1 primitive kit, so the palace never breaks.

## Requirements
- Replace primitive locus objects with low-poly models (GLTFLoader from `three/examples/jsm`). Same kind, same colour family, same footprint.
- Room character: materials, light colour, small decorations away from loci (never between a locus and its viewpoint).
- `src/sound.ts`: card flip, glide whoosh, correct/wrong chime, room ambience. Generated with Web Audio or CC0 files. Plays only when `data.settings.sound` is true (default off). Volume low.

## Acceptance
- [ ] `npm test` (including `palace.lock.test.ts`) and `npm run build` pass.
- [ ] Before/after screenshots of each room.
- [ ] `ASSETS.md` complete; total asset size written in "Report".
- [ ] Draw calls and fps written in "Report".

## Questions
## Report

## Verify (for FB)
In `../mp-T9`: `npm test`, `npm run build`, paste counts.
1. `git diff main -- src/data/palace.ts` is empty. `palace.lock.test.ts` unchanged and passing.
2. `ASSETS.md`: every file in `public/assets` listed, each licence is CC0 (open the source page if you can), total size under 15 MB (`du -sh public/assets`).
3. Code review: models and their textures disposed in `dispose()`; failed load falls back; sound never plays when `settings.sound` is false; no autoplay before a user gesture.
4. Red-team `src/redteam/T9.test.ts`: at least 5 checks, for example every `ASSETS.md` row has a URL and "CC0", no asset file over 5 MB, `sound.ts` with sound off makes no `AudioContext`.
5. Compare before/after screenshots: can you still tell every neighbouring locus apart?
Write "Verification" as TASKS.md says.
