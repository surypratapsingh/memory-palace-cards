# T4 - Drill: memorize and recall in 3D

- Build: AG | Verify: FB | Est. 3h | Wave 2 (start after T1 is verified) | Branch: `task/T4-drill` | Worktree: `wt/T4`

## Goal
The core game: the player memorizes a shuffled sequence of N cards by gliding locus to locus in the palace, then recalls the order at each locus.

## Write scope
- `src/drill-logic.ts`, `src/drill-logic.test.ts` (new, pure, no DOM)
- `src/ui/drill.ts`, `src/ui/drill.css`, `src/ui/cardPicker.ts` (new)
- `drill-demo.html` + `src/ui/drill-demo.ts` (new, dev harness)
- `docs/shots/T4-*.png`

## Use (do not edit)
`PalaceView` from `src/types.ts` (`createPalaceView` from `src/scene/palaceView.ts`); `deal`, `localDay`, `LADDER`, `score`, `cardLabel`, `RANKS`, `SUITS` from `src/deck.ts`; `imageFor`, `save` from `src/store.ts`; `cardFace` from `src/ui/cardFace.ts`.

## Pure logic: `src/drill-logic.ts`
```ts
/** Keyboard card entry: rank key then suit key. Keys: A 2-9 T 0(=T) J Q K, then S H D C. Case-insensitive. Returns null for anything else. */
export function cardFromKeys(rankKey: string, suitKey: string): CardId | null;
/** New SaveData with the result appended to drills and locusStats updated: tries + 1 at every locus 0..n-1, misses + 1 where answers[i] !== sequence[i]. Never mutates data. */
export function applyResult(data: SaveData, result: DrillResult): SaveData;
/** Seed for a drill: localDay(now) when daily, else a random id. */
export function drillSeed(daily: boolean, now: Date): string;
```
Test all three in `src/drill-logic.test.ts`, including `applyResult` on a save that came through `JSON.parse(JSON.stringify(...))` (locusStats keys become strings).

## API
```ts
export function mountDrill(
  root: HTMLElement,            // DOM overlay above the 3D canvas
  view: PalaceView,
  data: SaveData,
  opts: { level: number; daily: boolean },
  onExit: (data: SaveData, result: DrillResult | null) => void,
): () => void;                  // unmount: removes DOM and listeners, clears cards and moods it set
```

## Phases
1. **Ready**: "Level 3 · 8 cards" (+ "Daily Deck" if daily). Space to start.
2. **Memorize**: `n = LADDER[level]`, sequence = `deal(n, drillSeed(daily, new Date()))`. Timer starts. At step i: `view.glideTo(i)`, `view.showCard(i, card, { caption })`, clear the previous card. Caption = `imageFor(data, card)` when captions are on; start value `data.settings.captions`, H toggles it for this drill. Right/Space = next, Left = back. Enter on the last card or a Done button ends memorizing.
3. **Recall**: `view.clearCards()`, `view.glideTo(0)`. At each locus the player picks a card:
   - `cardPicker`: 4 rows (suits) x 13 columns (ranks), clickable, uses `cardLabel`.
   - Keyboard: `cardFromKeys`. Show the pending rank key on screen.
   - Used cards greyed and cannot be picked twice. `-` = skip (null). Backspace = back one locus to change it.
   - The picked card shows at the locus with `opacity: 0.5` for confirmation, then glide to the next locus.
4. **Results**: `score()` -> correct, run, memorize time. List per locus: locus name, correct card, your answer, right/wrong. Wrong loci get `setLocusMood(i, 'weak')` while results show (reset on unmount). `data = applyResult(data, result)`, `save(data)`. Buttons: Again (same level, new seed), Back (`onExit(data, result)`).
- Esc during memorize or recall: confirm dialog, then `onExit(data, null)` without saving.
- A drill result is never saved twice (Again after results must not re-apply the old result).

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Level 0 (3 cards) and level 7 (52 cards) both playable keyboard-only from start to results.
- [ ] Daily drill deals the same cards after a reload on the same day.
- [ ] Picker blocks duplicates. Backspace correction works.
- [ ] Result saved in `localStorage['memory-palace/v1']` and survives reload.
- [ ] No user or image text through `innerHTML`. Unmount leaves no listeners, cards, or moods.
- [ ] Demo: http://localhost:5173/drill-demo.html with a level selector. Screenshots of memorize, recall and results.

## Questions
## Report

## Verify (for FB)
In `wt/T4`: `npm install`, `npm test`, `npm run build`, paste counts.
1. Red-team `src/redteam/T4.test.ts` on `drill-logic.ts`: `cardFromKeys` with every rank and suit, `'0'`, lower case, `'1'`, `'10'`, empty strings, `'TT'`; `applyResult` with answers shorter than the sequence, all null answers, a 52-card drill, string keys, mutation of the input checked with `structuredClone` + `deepEqual`.
2. **Mutation check**: in `applyResult` make misses count skipped (null) answers as correct; confirm a test fails; undo with `git checkout -- src`.
3. Code review of `src/ui/drill.ts`: every `addEventListener` removed on unmount; no `innerHTML` with dynamic text; timers cleared; the result is saved exactly once; Esc path saves nothing; `glideTo` promises do not act after unmount (check a flag); Again does not leak the first round's listeners.
4. Check the screenshots against "Phases".
Write "Verification" as TASKS.md says. The Lead plays it at merge.
