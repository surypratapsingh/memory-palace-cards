# T12 - Settings screen and accessibility

- Build: FB | Verify: AG | Est. 1.5h | Wave 2 (start after T3 is merged; it edits the trainer) | Branch: `task/T12-settings` | Worktree: `../mp-T12`

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
- [ ] `npm test` and `npm run build` pass.
- [ ] Demo http://localhost:5173/settings-demo.html: every control works with keyboard only; reload keeps the settings.
- [ ] No user text through `innerHTML`. Unmount removes listeners.

## Questions
## Report

## Verify (for AG)
In `../mp-T12`: `npm test`, `npm run build` (paste counts), `npm run dev`.
1. Settings demo with keyboard only: Tab through all controls, change each, reload, values kept. Screenshot normal and colour-safe: `docs/shots/T12-1.png`, `T12-2.png`.
2. Trainer demo: run a screen reader or Chrome's accessibility tree; "N left" is announced; every button has a name.
3. **Mutation check**: change `--muted` in `src/style.css` to `#444b55`; `contrast.test.ts` must fail; undo.
4. Red-team `src/redteam/T12.test.ts`: at least 5 attacks on `sanitizeSettings` (arrays, prototype keys like `__proto__`, huge numbers, extra unknown keys dropped, NaN).
Write "Verification" as TASKS.md says.
