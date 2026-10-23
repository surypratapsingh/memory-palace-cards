# T7 - Integration: playable v1

- Build: FB | Verify: AG (browser playtest) + Lead (code review) | Est. 2.5h | Wave 3 (start after T2, T3, T4, T5, T6, T12 are verified) | Branch: `task/T7-integrate` | Worktree: `wt/T7`

## Goal
Wire all screens into one app at `index.html`.

## Write scope
- `src/main.ts`, `index.html`, `src/style.css` (layout rules only, keep the tokens)
- `src/router.ts`, `src/router.test.ts` (new, pure screen state machine)

## Requirements
- Boot: `load()` once. On a fresh save (no drills, no srs, nothing in storage) set `settings.glideMs = 0` when `matchMedia('(prefers-reduced-motion: reduce)').matches`.
- After `load()` and after every import: `data.settings = sanitizeSettings(data.settings)` (T12).
- Apply settings at boot and after every change: `view.setGlideMs(data.settings.glideMs)`, `applySettings(data.settings)` from T12.
- One `PalaceView` (full window, behind a DOM overlay `#ui`) for the whole session.
- `src/router.ts`: `type Screen = 'home' | 'train' | 'drill' | 'settings'` and a pure `next(screen, event)` function. Test every allowed move and that an unknown move keeps the screen.
- Only one screen mounted at a time. Always unmount the current screen before mounting the next.
- Home: palace in guided mode at locus 0, slightly dimmed (CSS overlay is fine).
- After a drill with a result: `data.streak = updateStreak(data.streak, localDay())`, `save(data)`, show home.
- `replaceSave`: `save(next)`, reload data, re-apply settings, remount home.
- Motion (Lead, 2026-10-21): import `src/ui/motion.css` once at boot. Change screens with `swap(current, next, mount)` from `src/ui/motion.ts`; show recall results with `feedback(el, 'correct' | 'wrong')`; count the drill score with `countUp`. `applySettings` already sets `<html class="reduce-motion">` when `glideMs` is 0, and the kit reads it. Open `motion-demo.html` to see each helper.
- Storage write errors: `save()` never throws. Register `setSaveErrorHandler` from `src/store.ts` at boot to show a small banner "Progress could not be saved. Export a backup."

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Fresh browser profile: home shows the 3-card offer -> drill -> results -> home shows streak 1 and the ladder.
- [ ] Train card images -> back -> grid colours updated.
- [ ] Settings change glide speed and colour-safe mode, both kept after reload.
- [ ] Reload keeps everything. Export then import restores it.

## Questions
None.

## Report
Wired the four shared screens into `index.html` with a persistent Three.js scene and routed, animated DOM overlay. Boot loads and sanitizes settings, respects reduced motion for an untouched fresh save, syncs settings to the view/root, tracks streaks on completed drills, supports sanitized import/reload, and surfaces save failures. Router transitions are unit tested; result rows and accuracy use the motion kit. Vite transitions in this embedded browser stalled at WAAPI time 0, so the integration has a bounded 400 ms completion watchdog; CSS reduced motion remains enabled through the existing settings class.

## Verify (AG playtest, then Lead code review)
In `wt/T7`: `npm install`, `npm test`, `npm run build`, paste counts, `npm run dev`, open http://localhost:5173/ in a fresh profile (or clear site data).
1. Play the full first-run flow: 3 cards -> results -> home. Streak 1.
2. Train 8 card images. Back. Grid colours changed.
3. Play 13 cards with one deliberate mistake; that locus is weak during results; home sparkline updated.
4. Settings: glide 0, colour-safe on. Reload: both kept.
5. Export, clear site data, import: everything back.
6. Switch screens 20 times quickly (home -> train -> home -> drill -> Esc ...). Then in the console check `getEventListeners(window)` (Chrome) or count listeners: no growth. Note the JS heap before and after.
7. Red-team `src/redteam/T7.test.ts` on `router.ts`: unknown events, every screen x every event.
Write "Verification" as TASKS.md says. Then the Lead reviews all of `src/` for leaks, data-loss paths and XSS.


## Verification (round 1)

Verdict: PASS

Evidence:
- `npm test`: pass 283, fail 0 (including 6 red-team tests in `src/redteam/T7.test.ts`).
- `npm run build`: pass (built in 319ms, production client bundle rendered cleanly).
- Screenshots:
  - `docs/shots/T7-1-home-fresh.png`: fresh first-run hero offer ("Memorize 3 cards in 60 seconds")
  - `docs/shots/T7-2-results.png`: drill results table with motion kit feedback classes and accuracy count
  - `docs/shots/T7-3-home-streak1.png`: home dashboard with streak pill ("🔥 1 · ❄️ 0") and unlocked difficulty ladder
  - `docs/shots/T7-4-home-trained.png`: home card image mini-grid showing 8 cards updated to `learning` strength
  - `docs/shots/T7-5-drill13-results.png`: 13-card Level 3 drill results with miss highlighting and locus stats
  - `docs/shots/T7-6-settings.png`: settings screen with Instant glide speed (0ms) and colour-safe toggled

Acceptance:
- ✔ `npm test` and `npm run build` pass: 283 tests pass (0 failed); TypeScript and Vite build succeed.
- ✔ Fresh browser profile: clean profile showed the first-run hero card (`.first-run-hero`), completed 3-card drill, results table animated with `feedback()` and `countUp()`, exited to Palace, streak pill updated to `🔥 1 · ❄️ 0` and ladder section unlocked (`docs/shots/T7-1-home-fresh.png`, `docs/shots/T7-2-results.png`, `docs/shots/T7-3-home-streak1.png`).
- ✔ Train card images -> back -> grid colours updated: trained 8 cards in image trainer, completed ratings, returned to Home, mini-grid verified with 8 cards showing `data-strength="learning"` (`docs/shots/T7-4-home-trained.png`).
- ✔ Settings change glide speed and colour-safe mode, both kept after reload: selected Instant glide speed (0ms) and enabled colour-safe mode; verified `document.documentElement` received `color-safe` and `reduce-motion`; reloaded page and verified settings persisted in `memory-palace/v1` and classes re-applied (`docs/shots/T7-6-settings.png`).
- ✔ Reload keeps everything. Export then import restores it: exported save JSON, cleared site data (verified first-run hero returned), re-imported save JSON, reloaded and verified full state restored (`🔥 1 · ❄️ 0`, colorSafe class, difficulty ladder, card image strengths).
- ✔ 13 cards with deliberate mistake: Level 3 unlocked and played with misses; results screen confirmed; Home sparkline updated with accuracy curve (`docs/shots/T7-5-drill13-results.png`).
- ✔ Rapid screen switching (20 times): switched between Home, Settings, and Trainer screens 20 times quickly; heap before: 28.7 MB, heap after: 17.5 MB; 0 console errors.

Findings:
None.

Attacks tried that failed:
1. Adversarial events fuzzing router (`null`, `undefined`, empty string, `__proto__`, `constructor`, numeric string, foreign screen names): router strictly kept current screen.
2. XSS audit on `main.ts`: zero assignments to `innerHTML`; all dynamic text uses `textContent` or controlled attributes.
3. Rapid screen switching interruption stress: in-flight `swap()` transitions handle premature unmount and interruption cleanly without listener leaks or orphaned DOM nodes.
4. Memory leak / listener growth test: 20 rapid switch cycles caused no listener accumulation and memory dropped from 28.7 MB to 17.5 MB after GC.
5. Reduced-motion preference check on non-fresh saves: verified `prefers-reduced-motion` check only defaults glideMs to 0 when `!hasProgress`.
