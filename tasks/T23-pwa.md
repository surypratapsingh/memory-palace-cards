# T23 - Installable and offline (PWA)

- Build: FB | Verify: AG | Est. 2h | Wave 7 (start after R1, the v1.0 release) | Branch: `task/T23-pwa` | Worktree: `wt/T23`

## Goal
The game has no backend, so it can work fully offline: install it once, then play on a plane. Updates arrive without losing the save.

## Write scope
- `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png` (new)
- `index.html` (manifest link, theme colour), `src/main.ts` (register the service worker, update prompt)
- `src/pwa.ts`, `src/pwa.test.ts` (new, small helpers if needed)
- `e2e/pwa.spec.ts` (new, uses the T16 setup)
- No new npm dependency (no Workbox, no vite-plugin-pwa): a hand-written service worker of under 80 lines.

## Requirements
1. Manifest: name "Memory Palace", short name "Palace", `display: standalone`, `start_url: "./"`, `scope: "./"` (the site is built with `base: './'`), theme and background colours from `src/style.css` tokens. Icons: SVG plus 192 and 512 PNG (draw them once from the SVG with any tool you have; commit the PNGs).
2. `sw.js`: on install, cache `./` and `./index.html`; on fetch, same-origin GET only: navigation requests network-first with the cached `index.html` as fallback; other requests cache-first (hashed assets never change), filling the cache as they load. Delete old caches on activate. Never cache cross-origin requests.
3. Register only in the production build (`import.meta.env.PROD`) and only when `serviceWorker` is in `navigator`.
4. Update: when a new worker is waiting, show a small non-blocking line "New version ready" with a Reload button; never reload by itself mid-drill.
5. The save (`localStorage`) is never touched by the worker.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass.
- [ ] `e2e/pwa.spec.ts`: load once, go offline (`context.setOffline(true)`), reload: home renders and a 3-card drill works.
- [ ] Chrome DevTools > Application: manifest has no errors; "Installable" (screenshot `docs/shots/T23-1.png`).

## Questions
## Report

## Verify (for AG)
In `wt/T23`: `npm test`, `npm run build`, `npm run e2e`; paste counts. Then `npm run preview` in the browser.
1. Install it, go offline, play a drill, come back online. Change one line of the app, rebuild, reload: the update line appears; Reload keeps the save.
2. Code review: no cross-origin caching, old caches deleted, no worker in dev mode.
3. Red-team: at least 5 adversarial checks (unit or e2e), for example offline on first ever visit shows the browser's normal offline page (not a broken app), a 404 asset is not cached, two tabs open during an update.
Write "Verification" as TASKS.md says.
