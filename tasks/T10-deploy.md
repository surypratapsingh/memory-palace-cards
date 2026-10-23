# T10 - Deploy: CI and GitHub Pages

- Build: FB | Verify: AG | Est. 1h | Wave 3 (start after T7 is verified) | Branch: `task/T10-deploy` | Worktree: `wt/T10`

## Goal
Every push to `main` runs the tests and publishes the game.

## Write scope
- `.github/workflows/ci.yml` (new): on pull request and push, Node 24, `npm ci`, `npm test`, `npm run build`.
- `.github/workflows/pages.yml` (new): on push to `main`, same checks, then deploy `dist/` with the official `actions/upload-pages-artifact` and `actions/deploy-pages`.
- `vite.config.ts` (new): `base: './'` so the build works under any repo path.
- `README.md`: add a "Play" link section only.

## Notes
- GitHub Pages on a **private** repository needs a paid GitHub plan. If Pages is not available, keep `ci.yml`, keep `pages.yml` but say so in "Report"; the Lead asks the user whether to make the repo public or use another host.
- Pin action versions to a major tag (for example `actions/checkout@v4`). Use the minimum `permissions` (`pages: write`, `id-token: write` only in the deploy job).

## Acceptance
- [x] `npm test` and `npm run build` pass locally, and `npx vite preview` serves a working game from `dist/`.
- [x] Workflows are valid YAML and use only official GitHub actions.

## Questions
## Report

## Verify (for AG)
In `wt/T10`: `npm run build`, `npx vite preview`, open the preview URL, play the 3-card drill, console clean.
1. Read both workflows: tests run before deploy; deploy only from `main`; permissions minimal; no secrets printed.
2. After the Lead pushes: open the Actions tab, both workflows green; open the Pages URL and play 3 cards.
3. Red-team `src/redteam/T10.test.ts`: parse the workflow files as text and assert `npm test` comes before the deploy step, Node version is 24, and `base` in `vite.config.ts` is `'./'`.
Write "Verification" as TASKS.md says.

## Report
Added independent CI for pushes/pull requests and a main-only Pages pipeline. CI and Pages build run under Node 24 with `npm ci`, tests, and build before artifact upload/deployment; only the deploy job receives Pages/id-token write permissions. Vite uses a relative base for repository subpaths; README includes the expected repository Pages link. Verified the production preview's app shell and relative JS/CSS asset URLs/content types, and exercised the three-card flow through results and back home in the browser. The repository is private and account plan/Pages entitlement cannot be established locally, so deployment availability must be confirmed by the Lead after merge; Pages is not claimed live.

## Verification (round 1)

Verdict: PASS

Evidence:
- `npm test`: pass 289, fail 0 (including 6 adversarial red-team tests in `src/redteam/T10.test.ts`).
- `npm run build`: pass (`dist/` generated cleanly in 571ms).
- `npx vite preview`: served `dist/` at `http://localhost:4173/`, headless browser playtested 3-card drill, 0 console errors.

Acceptance:
- ✔ `npm test` and `npm run build` pass locally, and `npx vite preview` serves a working game from `dist/`: `npm test` passes (289 pass, 0 fail), `npm run build` succeeds, and `npx vite preview` served `dist/` where headless browser verified first-run hero, completed 3-card drill with recall, inspected results screen, and returned to home screen with updated streak pill (`🔥 1 · ❄️ 0`) with 0 console errors.
- ✔ Workflows are valid YAML and use only official GitHub actions: both `.github/workflows/ci.yml` and `.github/workflows/pages.yml` parse cleanly, use official `actions/*` pinned to major tags (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`), and follow strict least-privilege permissions.

Findings:
None.

Attacks tried that failed:
1. Adversarial workflow ordering: asserted `npm test` strictly runs prior to `npm run build` and artifact upload in both `ci.yml` and `pages.yml`.
2. Pages trigger boundary: verified `pages.yml` strictly restricts deploy triggers to `push` on `branches: [main]` and rejects PRs or wild branches.
3. Least-privilege permissions audit: confirmed top-level workflow permissions default to `contents: read`, with `pages: write` and `id-token: write` granted strictly to the downstream `deploy` job.
4. Relative asset path audit: asserted `vite.config.ts` sets `base: './'`, and verified `dist/index.html` references all module scripts and stylesheets with relative `./assets/...` paths rather than absolute root paths.
5. Action pinning audit: verified every action in both workflows targets the official GitHub `actions/` organization and is pinned to a major semantic version tag (`@v4` or `@v3`).
6. Production preview app verification: played full first-run 3-card memorize/recall cycle on `dist/` served via `vite preview` in headless browser with 0 runtime or network errors.
