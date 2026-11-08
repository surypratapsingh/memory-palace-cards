# T17 - Performance: fast first screen, budgets, leak test

- Build: FB | Verify: AG | Est. 2h | Wave 4 (start after T9, T11, T13, T14, T16 are verified) | Branch: `task/T17-perf` | Worktree: `wt/T17`

## Goal
The home screen appears fast, the 3D palace loads behind a clear loading state, and CI fails when the bundle grows past a budget or the GPU memory leaks across drills.

Lead measurement, 2026-10-23: one JS chunk, 639 kB minified, 164 kB gzip (three.js is about 125 kB gzip of that); Vite warns about chunks over 500 kB.

## Write scope
- `src/main.ts` (dynamic import of the scene, loading state), `src/style.css` only for the loading state
- `scripts/budget.mjs` and `scripts/budget.test.mjs` (new), `package.json` script `"budget": "node scripts/budget.mjs"`, `.github/workflows/ci.yml` (run it after the build)
- `vite.config.ts` (chunking only)
- `e2e/perf.spec.ts` (new; uses the T16 setup)
- `src/scene/palaceView.ts`: only a DEV-only stats hook (`if (import.meta.env.DEV)`), if needed for the leak test

## Requirements
1. **Code split**: load `src/scene/palaceView.ts` (and with it three.js) with `await import(...)`. Home renders before the palace is ready; screens that need the view (drill, Shadow Walk, onboarding) wait for it with a loading state ("Opening the palace…", no spinner faster than 1 s cycles, respects reduced motion). If the import fails, show a readable error with a Retry button, never a blank page.
2. **Budgets** (`scripts/budget.mjs`, reads `dist/` after the build, gzip via `node:zlib`, no new dependency): entry chunk referenced by `dist/index.html` at most 60 kB gzip; all JS at most 200 kB gzip; no single asset over 1 MB. Exit code 1 with a readable table when over. The script's own logic has a unit test with a fake `dist/` in a temp folder.
3. **Leak test** (`e2e/perf.spec.ts`): play 10 short drills (3 cards) in a row; `renderer.info.memory.geometries` and `.textures` after drill 10 are at most baseline + 4. Reach the renderer through a DEV-only hook or a test-only build flag; it must not exist in the production bundle.
4. **Draw calls**: after T9, log `renderer.info.render.calls` at the viewpoints of loci 0, 13, 26, 39 in the leak test run; fail above 300.
5. Write before/after numbers in "Report": entry gzip, total gzip, time to home screen (Performance panel or `performance.now()` at first paint of home), draw calls.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run budget`, `npm run e2e` pass.
- [ ] Vite no longer warns about the main chunk (three.js may be its own chunk; its size is fine if it is lazy).
- [ ] "Report" has the numbers from requirement 5.

## Questions
BLOCKED: dependency merges. `git merge task/T13-card-art` is clean. `git merge task/T14-free-walk` conflicts in `src/scene/palaceView.ts` (T13 and T14 both change it), and `git merge task/T16-e2e` cannot run until that is resolved. Lead: resolve the T13/T14 conflict on main (or on task/T14-free-walk) and say which one wins, then mesh can start T17 on a clean base. Not resolved here: palaceView.ts is a 3D file outside this packet.
## Report

## Verify (for AG)
In `wt/T17`: `npm test`, `npm run build`, `npm run budget`, `npm run e2e`; paste counts.
1. Browser with DevTools network throttling "Fast 4G": home appears before the palace; the loading state shows; then the drill works. Block the scene chunk in DevTools (Network > Block request URL): the error and Retry appear, Retry works after unblocking.
2. Mutation: add a 300 kB string to `main.ts`; `npm run budget` must fail. Remove a `dispose()` call in `cardBillboard.ts`; the leak test must fail. Undo with `git checkout -- src`.
3. `grep` the built `dist/` for the DEV hook name: no hits.
4. Red-team `src/redteam/T17.test.ts` (or `.mjs` next to the script): at least 5 checks on `budget.mjs`, for example missing `dist/`, an `index.html` with two module scripts, a chunk exactly at the limit, a non-JS asset over 1 MB.
Write "Verification" as TASKS.md says.
