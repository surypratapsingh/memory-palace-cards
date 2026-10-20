# T6 - Home screen

- Builder: Antigravity | Verifier: Sonnet 5.5 | Wave 2 (start after T5 is merged into main) | Branch: `task/T6-home` | Worktree: `../mp-T6`

## Goal
The screen players see every day. It must make the next action obvious and show progress, so people come back (see "Retention" in plan.md).

## Write scope
- `src/ui/home.ts`, `src/ui/home.css` (new)
- `home-demo.html` + `src/ui/home-demo.ts` (new, dev harness with an empty save and a fake save of 30 drills)

## Use (do not edit)
`src/progress.ts` (`unlockedLevel`, `personalBests`, `rankTitle`, `shareText`, `isPerfect`, `levelOf`), `src/srs.ts` (`isDue`, `strength`), `src/deck.ts` (`DECK`, `LADDER`, `localDay`), `src/store.ts` (`exportJson`, `importJson`), types from `src/types.ts`.

## API
```ts
export function mountHome(
  root: HTMLElement,
  data: SaveData,
  actions: {
    train(): void;
    drill(level: number, daily: boolean): void;
    replaceSave(next: SaveData): void;   // called after a confirmed import
  },
): () => void;
```

## Content (desktop layout, panel over the dimmed 3D palace)
1. **Header**: rank title (from the best perfect level), streak count with flame and freezes (`data.streak`).
2. **First run** (no drills and no srs): one big card "Memorize 3 cards in 60 seconds" -> `drill(0, false)`. Hide the rest except a small "Learn card images" link.
3. **Today**: "Daily Deck" button -> `drill(unlockedLevel, true)`. If a daily drill exists for `localDay()`, show its `shareText` and a Copy button (`navigator.clipboard.writeText`).
4. **Card images**: due count, new count (cards with no srs), mini grid of 52 tiles coloured by `strength()` (new grey, fading red, learning blue, solid green, gilded gold), Train button -> `train()`.
5. **Ladder**: 8 levels (3 to 52 cards). Locked ones show a lock. Unlocked show best memorize time and a Practice button -> `drill(i, false)`. Highlight the next level to unlock: "Next: perfect 8 cards to unlock 13".
6. **Progress**: inline SVG sparkline of accuracy (correct/total) for the last 20 drills. No chart library.
7. **Save**: Export downloads `memory-palace-YYYY-MM-DD.json` (Blob + `a[download]`). Import (`input type=file`): parse with `importJson`, show the error message if it throws, `confirm()` before `replaceSave`.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Demo renders correctly with the empty save and the 30-drill save.
- [ ] Keyboard: every button reachable with Tab, visible focus.
- [ ] No user text through `innerHTML`.
- [ ] Import of a bad file shows an error and changes nothing.

## Questions
## Report

## Verify (for the verifier)
In `../mp-T6`: `npm test`, `npm run build`. If you have a browser tool, run `npm run dev` and open http://localhost:5173/home-demo.html; otherwise review the code only.
1. Each content item 1-7 present and wired to the right action.
2. First-run state shows only the 3-card offer.
3. Ladder, next-unlock text and bests match `progress.ts` for the fake save.
4. Import: bad JSON shows error, good JSON asks confirm. Export file name format.
5. No `innerHTML` with dynamic text. Unmount removes listeners.
Write "Verification" with PASS or CHANGES and numbered findings.
