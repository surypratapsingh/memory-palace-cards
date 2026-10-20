# T6 - Home screen

- Build: AG | Verify: FB | Est. 2.5h | Wave 2 (start after T5 is verified) | Branch: `task/T6-home` | Worktree: `../mp-T6`

## Goal
The screen players see every day. It must make the next action obvious and show progress, so people come back (see "Retention" in plan.md).

## Write scope
- `src/ui/home.ts`, `src/ui/home.css` (new)
- `src/ui/sparkline.ts`, `src/ui/sparkline.test.ts` (new, pure: data in, SVG path string out)
- `home-demo.html` + `src/ui/home-demo.ts` (new, dev harness with an empty save and a fake save of 30 drills)
- `docs/shots/T6-*.png`

## Use (do not edit)
`src/progress.ts` (`unlockedLevel`, `recommendedLevel`, `personalBests`, `rankTitle`, `shareText`, `isPerfect`, `levelOf`), `src/srs.ts` (`isDue`, `strength`), `src/deck.ts` (`DECK`, `LADDER`, `localDay`, `score`), `src/store.ts` (`exportJson`, `importJson`), types from `src/types.ts`.

## API
```ts
export function mountHome(
  root: HTMLElement,
  data: SaveData,
  actions: {
    train(): void;
    drill(level: number, daily: boolean): void;
    settings(): void;
    replaceSave(next: SaveData): void;   // called after a confirmed import
  },
): () => void;
```

## Content (desktop layout, panel over the dimmed 3D palace)
1. **Header**: rank title (from the best perfect level), streak count and freezes (`data.streak`), a Settings button -> `settings()`.
2. **First run** (no drills and no srs): one big card "Memorize 3 cards in 60 seconds" -> `drill(0, false)`. Hide the rest except a small "Learn card images" link.
3. **Today**: "Daily Deck" button -> `drill(unlockedLevel, true)`. If a daily drill exists for `localDay()`, show its `shareText` and a Copy button (`navigator.clipboard.writeText`).
4. **Practice**: a big "Practice" button -> `drill(recommendedLevel, false)` with the text "Level k · n cards · your 70% zone" (see `MATHS.md` section 4).
5. **Card images**: due count, new count (cards with no srs), mini grid of 52 tiles with `data-strength` and `background: var(--s)` (tokens in `src/style.css`), Train button -> `train()`.
6. **Ladder**: 8 levels (3 to 52 cards). Locked ones show a lock. Unlocked show best memorize time and a button -> `drill(i, false)`. Next unlock text: "Next: perfect 8 cards to unlock 13".
7. **Progress**: inline SVG sparkline of accuracy (`correct / total`) for the last 20 drills. `sparklinePath(values: number[], w: number, h: number): string` returns the `d` attribute: x evenly spaced from 0 to w, y = h · (1 − value). One value = a dot at the middle. No chart library.
8. **Save**: Export downloads `memory-palace-YYYY-MM-DD.json` (Blob + `a[download]`). Import (`input type=file`): parse with `importJson`, show the error message if it throws, `confirm()` before `replaceSave`.

## Acceptance
- [ ] `npm test` and `npm run build` pass, with `src/ui/sparkline.test.ts` covering 0, 1, 2 and 20 values and values 0 and 1.
- [ ] Demo renders correctly with the empty save and the 30-drill save. Screenshots of both.
- [ ] Keyboard: every button reachable with Tab, visible focus.
- [ ] No user text through `innerHTML`.
- [ ] Import of a bad file shows an error and changes nothing.

## Questions
## Report

## Verify (for FB)
In `../mp-T6`: `npm test`, `npm run build`, paste counts.
1. Red-team `src/redteam/T6.test.ts` on `sparklinePath`: NaN or values outside [0, 1] (clamp or reject, but never output `NaN` in the path), 1 value, 1000 values, w = 0.
2. Code review: each content item 1-8 present and wired to the right action; first-run state shows only the 3-card offer; ladder, next-unlock text, bests and recommended level come from `progress.ts` (no copied logic); import error path changes nothing; export file name uses the local date; no `innerHTML` with dynamic text; unmount removes listeners and object URLs (`URL.revokeObjectURL`).
3. Check the screenshots against the content list.
Write "Verification" as TASKS.md says.
