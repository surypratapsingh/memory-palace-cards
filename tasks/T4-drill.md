# T4 - Drill: memorize and recall in 3D

- Builder: Sonnet 5.5 | Verifier: Antigravity | Wave 2 (start after T1 is merged into main) | Branch: `task/T4-drill` | Worktree: `../mp-T4`

## Goal
The core game: the player memorizes a shuffled sequence of N cards by gliding locus to locus in the palace, then recalls the order at each locus.

## Write scope
- `src/ui/drill.ts`, `src/ui/drill.css`, `src/ui/cardPicker.ts` (new)
- `drill-demo.html` + `src/ui/drill-demo.ts` (new, dev harness)

## Use (do not edit)
`PalaceView` from `src/types.ts` (created with `createPalaceView` from `src/scene/palaceView.ts`), `deal`, `localDay`, `LADDER`, `score`, `cardLabel` from `src/deck.ts`, `imageFor`, `save` from `src/store.ts`, `cardFace` from `src/ui/cardFace.ts`.

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
2. **Memorize**: `n = LADDER[level]`. Sequence = `deal(n, seed)`, seed = `localDay()` when daily, else `crypto.randomUUID()`. Timer starts. At step i: `view.glideTo(i)`, `view.showCard(i, card, { caption: imageFor(data, card) })`, clear the previous card. Right/Space = next, Left = back. H = toggle captions. Enter on the last card or a Done button ends memorizing.
3. **Recall**: `view.clearCards()`, `view.glideTo(0)`. At each locus the player picks a card:
   - `cardPicker`: 4 rows (suits) x 13 columns (ranks), clickable, uses `cardLabel`.
   - Keyboard: rank key (A, 2-9, T or 0, J, Q, K) then suit key (S, H, D, C).
   - Cards already used are greyed and cannot be picked twice. `-` = skip (null). Backspace = go back one locus and change it.
   - Picked card shows at the locus as a ghost for confirmation, then glide to the next locus.
4. **Results**: `score()` -> correct, run, memorize time. List per locus: locus name, correct card, your answer, right/wrong. Wrong loci get `setLocusMood(i, 'weak')` while the results are shown (reset on unmount). Push the `DrillResult` to `data.drills`, update `data.locusStats[i]` (tries + 1, misses + 1 if wrong), `save(data)`. Buttons: Again (same level, new seed), Back (`onExit(data, result)`).
- Esc during memorize or recall: confirm dialog, then `onExit(data, null)` without saving a result.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Level 0 (3 cards) and level 7 (52 cards) both playable keyboard-only from start to results.
- [ ] Daily drill deals the same cards after a page reload on the same day.
- [ ] Picker blocks duplicates. Backspace correction works.
- [ ] Result saved in `localStorage['memory-palace/v1']` and survives reload.
- [ ] No user or image text through `innerHTML`. Unmount leaves no listeners, cards, or moods.
- [ ] Demo: http://localhost:5173/drill-demo.html with a level selector.

## Questions
## Report

## Verify (for the verifier)
In `../mp-T4`: `npm install`, `npm test`, `npm run build`, `npm run dev`, open http://localhost:5173/drill-demo.html.
1. Play level 0 fully with keyboard only. Then play 13 cards with one deliberate mistake: results show it, that locus turns weak.
2. Play the daily drill, reload, start again: same first cards.
3. Try to pick the same card twice: blocked. Use Backspace to fix an answer.
4. Esc mid-recall: confirm, exit, no result saved.
5. Check `localStorage['memory-palace/v1']`: `drills` and `locusStats` updated correctly.
6. Play 52 cards (you may skip with `-` in recall): no slowdown, no console errors.
7. Read `src/ui/drill.ts`: listeners removed on unmount, no `innerHTML` with dynamic text.
Write "Verification" with PASS or CHANGES and numbered findings.
