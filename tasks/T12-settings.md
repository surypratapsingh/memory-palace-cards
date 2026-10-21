# T12 - Settings screen and accessibility

- Build: FB | Verify: AG | Est. 1.5h | Wave 2 (start after T3 is verified; it edits the trainer) | Branch: `task/T12-settings` | Worktree: `wt/T12`

## Goal
Let players tune motion, sound, colours and captions, and make the 2D screens usable for everyone. Maths in `MATHS.md` section 10.

## Write scope
- `src/settings.ts`, `src/settings.test.ts` (new, pure)
- `src/ui/settings.ts`, `src/ui/settings.css` (new)
- `src/ui/contrast.test.ts` (new)
- `settings-demo.html` + `src/ui/settings-demo.ts` (new)
- Accessibility fixes in `src/ui/trainer.ts` and `src/ui/trainer.css` (your own T3 screen) only

## Pure logic: `src/settings.ts`
```ts
import type { Settings } from './types.ts';
export const GLIDE_OPTIONS = [0, 300, 600, 1000] as const;   // Instant, Fast, Normal, Slow
/** Repair settings from an import or an old save: wrong types or unknown glideMs values fall back to the defaults in emptySave(). Never mutates. */
export function sanitizeSettings(s: unknown): Settings;
/** Applies what CSS can do: toggles the `color-safe` class on root. */
export function applySettings(s: Settings, root: { classList: { toggle(name: string, on: boolean): unknown } }): void;
```

## Screen: `src/ui/settings.ts`
```ts
export function mountSettings(root: HTMLElement, data: SaveData, onExit: (data: SaveData) => void): () => void;
```
- Glide speed: radio group from `GLIDE_OPTIONS` with labels Instant, Fast, Normal, Slow. Note "Instant also helps with motion sickness".
- Checkboxes: Sound, Colour-blind-safe colours, Captions under cards while memorizing.
- Every change: update `data.settings`, `save(data)`, `applySettings(...)`. Preview row of 5 strength tiles (`data-strength`) so colour-safe mode is visible at once.
- Every control has a `<label>`. Tab order follows the page. Esc and a Back button -> `onExit(data)`.

## Accessibility pass on the trainer (T3)
- The "7 left" progress text is in an `aria-live="polite"` region.
- Every button has a text label (no icon-only buttons). Rating buttons show their key: "Good (3)".
- Visible focus on every control.

## Tests
- `src/settings.test.ts`: `sanitizeSettings` with `undefined`, `null`, `{}`, `{ glideMs: 450 }`, `{ glideMs: '600' }`, `{ sound: 'yes' }`, a valid object (unchanged); `applySettings` with a fake root.
- `src/ui/contrast.test.ts`: read the tokens from `src/style.css` with a regex (do not copy the hex values), compute the WCAG ratio (`MATHS.md` section 10) and assert ≥ 4.5 for text/bg, text/panel, muted/panel, accent/panel, danger/panel, and #dd1111 on white.

## Acceptance
- [x] `npm test` and `npm run build` pass.
- [x] Demo http://localhost:5173/settings-demo.html: every control works with keyboard only; reload keeps the settings.
- [x] No user text through `innerHTML`. Unmount removes listeners.

## Questions
- None.

## Report
- Added `sanitizeSettings` with default repair, valid glide-option preservation, own-property handling, and non-mutation guarantees; `applySettings` idempotently toggles the colour-safe root class.
- Built the settings screen with keyboard-accessible radio/checkbox controls, all settings persisted on change, visible-focus CSS, colour preview using shared CSS variables, Escape/Back exit, and key-listener teardown.
- Added settings demo entry page; no user-provided text is inserted through `innerHTML`.
- Trainer accessibility fixes: progress remains `aria-live="polite"`, rating controls expose their key in both text and `aria-keyshortcuts`, and grid buttons announce the card and its mnemonic image.
- Scope: changed only the listed T12 files; `npm install` modified lockfile root metadata, which was restored.
- Contrast tests now read values from `src/style.css` instead of duplicated constants and check required text/bg, text/panel, muted/panel, accent/panel, danger/panel, plus #dd1111 on white.
- `npm test`: 28 passed, 0 failed. `npm run build`: passed. `git diff --check`: passed.
- Browser demo smoke check at `http://127.0.0.1:5174/settings-demo.html`: controls exposed named radios/checkboxes; keyboard changed glide speed and palette; colour-safe switched preview tile colors; Escape and Back both unmounted the screen. Sound/captions and selected settings state persisted immediately in `localStorage` in-page. A hard reload reset the isolated incognito browser storage, so cross-reload persistence was not confirmed by this run.
- Dependency `task/T3-trainer` was merged as instructed. `npm install` changed lockfile root metadata; it was restored. Only T12's write-scope files are modified.

## Builder Verification
Verdict: Awaiting AG cross-verification.
Evidence: `npm test` -> pass 28, fail 0; `npm run build` -> ok; `git diff --check` -> ok; settings demo launched and exercised in browser at port 5174.
Acceptance:
- ✔ Tests/build pass (28/28; Vite build ok).
- ✔ Settings demo controls could be reached and changed with keyboard; no reload persistence claim (isolated browser storage reset on reload).
- ✔ `innerHTML` not used in settings code; returned unmount and Escape/Back teardown were exercised.
- ✔ Settings fields have labels, shared styles provide visible focus, and contrast tests source real CSS tokens.
- ✔ Trainer progress has polite live-region semantics and rating controls show key names; review queue screen-reader pass remains for AG.

Findings: None known; awaiting AG independent verification.

## Verify (for AG)
In `wt/T12`: `npm test`, `npm run build` (paste counts), `npm run dev`.
1. Settings demo with keyboard only: Tab through all controls, change each, reload, values kept. Screenshot normal and colour-safe: `docs/shots/T12-1.png`, `T12-2.png`.
2. Trainer demo: run a screen reader or Chrome's accessibility tree; "N left" is announced; every button has a name.
3. **Mutation check**: change `--muted` in `src/style.css` to `#444b55`; `contrast.test.ts` must fail; undo.
4. Red-team `src/redteam/T12.test.ts`: at least 5 attacks on `sanitizeSettings` (arrays, prototype keys like `__proto__`, huge numbers, extra unknown keys dropped, NaN).
Write "Verification" as TASKS.md says.

## Verification (round 1)
Verdict: PASS
Evidence: npm test -> "pass 34, fail 0"; npm run build -> ok (built in 76ms); screenshots: docs/shots/T12-1.png, docs/shots/T12-2.png; red-team: src/redteam/T12.test.ts
Acceptance:
- ✔ `npm test` and `npm run build` pass: npm test passes (pass 34, fail 0); tsc && vite build succeeds cleanly with 0 errors
- ✔ Demo http://localhost:5173/settings-demo.html: every control works with keyboard only; reload keeps the settings: verified via browser CDP driving radio options, checkboxes, and Esc key exit; values persisted in localStorage across page reload
- ✔ No user text through `innerHTML`. Unmount removes listeners: code audit verified createElement/textContent/createTextNode only; document.removeEventListener('keydown') called and screen.remove() executed on unmount
Findings: none

Attacks tried that failed:
1. Arrays, Date objects, regexes, functions, numbers, booleans, strings passed to sanitizeSettings: correctly rejected and replaced with full DEFAULTS
2. Prototype pollution and prototype inheritance: inherited properties on prototype chain ignored via Object.hasOwn; __proto__ injected keys dropped
3. Out-of-bounds numeric values, negative values, floats, NaN, and Infinity in glideMs: safely fallback to 600 default, while exact valid GLIDE_OPTIONS (0, 300, 600, 1000) are preserved
4. Malicious and unexpected extra keys: stripped from output object, returning strictly contract keys without mutating input object
5. Boolean type coercion attacks: truthy/falsy non-booleans (e.g. 1, 0, 'true', 'false', [], {}) resisted and replaced with valid boolean defaults
6. applySettings toggle behavior: verified toggle('color-safe', on) idempotency and proper classList management
7. Trainer accessibility audit via browser CDP: aria-live="polite" confirmed on progress element, 53/53 buttons have accessible text/labels (0 empty), rating buttons announce keys "Again (1)", "Hard (2)", "Good (3)", "Easy (4)"

Mutation checks:
- Mutant: `--muted: #444b55` in `src/style.css`: KILLED (contrast.test.ts failed with `--muted on --panel has contrast 2.01, expected >= 4.5`)
