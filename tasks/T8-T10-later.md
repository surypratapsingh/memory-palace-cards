# Wave 4 tasks (start after T7 is merged)

These packets are short on purpose. The integrator expands each one into its own file before dispatch, because details depend on what T1-T7 produced.

## T8 - Living palace effects
- Builder: Sonnet 5.5 | Verifier: Antigravity | Branch: `task/T8-living`
- Write scope: `src/living.ts` + `src/living.test.ts` (pure rules), additions in `src/ui/drill.ts`, `src/scene/**` only if a visual is missing.
- Weak loci: miss rate >= 40% over >= 5 tries -> `setLocusMood(i, 'weak')` when a drill starts; results tip "Locus 17 (Blue vase) keeps failing: picture your image bigger, louder, stranger."
- Ghosts: the last drill's cards stay at their loci as ghosts, fading linearly to 0 over 12 h after the drill. Starting a new drill with ghosts above 0.15 opacity shows "Fresh ghosts can mix you up. Rest an hour or try again later."
- Shadow walk: after a drill, free-walk the route with cards hidden; clicking a locus reveals what was there.
- Pure rules (`weakLoci(stats)`, `ghostOpacity(drillAt, now)`) unit tested.

## T9 - Art and sound pass
- Builder: Antigravity | Verifier: Sonnet 5.5 | Branch: `task/T9-art`
- Replace primitive locus objects with CC0 low-poly models (for example Kenney or Quaternius packs, CC0 only). List every asset with source URL and licence in `ASSETS.md`.
- Optional room ambience loops (CC0), card-flip sound, mute toggle, off by default.
- Hard rule: locus positions, order, names and room order in `src/data/palace.ts` do not change. Players have memorized them.
- Budget: all assets under 15 MB total, scene still 60 fps on an integrated GPU.

## T10 - Deploy to GitHub Pages
- Builder: Haiku 5.5 | Verifier: Freebuff | Branch: `task/T10-deploy`
- Needs a GitHub remote first (the user decides the repo name and visibility).
- Add `.github/workflows/pages.yml`: Node 24, `npm ci`, `npm test`, `npm run build`, deploy `dist/` with the official Pages actions. Set Vite `base` to the repo name if needed (new `vite.config.ts`).
- Verify: open the deployed URL, play the 3-card drill, check console is clean.
