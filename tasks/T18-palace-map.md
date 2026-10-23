# T18 - Palace map component

- Build: AG | Verify: FB | Est. 1.5h | Wave 7 (filler: may start any time AG has no other job) | Branch: `task/T18-map` | Worktree: `wt/T18`

## Goal
A small top-down map of the palace that any screen can show: the 4 rooms, doors, the 52 loci in route order, the route line, and an optional colour per locus. Used later by the progress screen (T24, weak-locus heat), the journey trainer (T26, "where is stop 17?") and optionally Shadow Walk ("you are here").

## Write scope
- `src/ui/palaceMap.ts`, `src/ui/palaceMap.css`, `src/ui/palaceMap.test.ts` (new)
- `src/ui/palaceMap-demo.ts` and `palaceMap-demo.html` (new, dev harness like the other demos)
- `docs/shots/T18-*.png`
- Read only: `src/data/palace.ts` (`ROOMS`, `DOORS`, `LOCI`, `WALL`)

## Requirements
1. API (change it if a simpler one does the job):
   ```ts
   export interface PalaceMapOptions {
     /** 0..1 per locus index, for example a shrunk miss rate. Missing = neutral. */
     heat?: ReadonlyMap<number, number>;
     /** Loci drawn larger with a ring, for example "you are here". */
     highlight?: readonly number[];
     /** Show the locus number next to each dot. Default true. */
     numbers?: boolean;
     /** Makes dots keyboard-focusable buttons and calls back with the locus index. */
     onPick?: (index: number) => void;
   }
   export function palaceMap(opts?: PalaceMapOptions): { element: SVGSVGElement; update(opts: PalaceMapOptions): void; destroy(): void };
   ```
2. Built with `document.createElementNS` only, no `innerHTML`. The SVG `viewBox` is derived from the room rectangles (x right, z down), scales to its container width, and keeps its aspect ratio.
3. Heat uses the strength/danger tokens from `src/style.css` and, when `<html>` has class `color-safe`, also a shape or pattern difference, never colour alone (MATHS.md section 10 contrast rule for text labels).
4. With `onPick`: each dot is `role="button"`, `tabindex="0"`, `aria-label` like "Stop 12: Red armchair, Library"; Enter/Space picks; arrow keys move focus along the route. `destroy()` removes every listener.
5. Readable at 320 px wide and at 900 px wide.

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] Tests: 52 dots in route order; every dot inside its room rectangle in SVG space; `update()` changes heat without rebuilding the SVG; `destroy()` leaves no listeners (count with a stub); no `innerHTML` in the file.
- [ ] Screenshots at 320 px and 900 px, normal and colour-safe, with heat and highlight.

## Questions
## Report

## Verify (for FB)
In `wt/T18`: `npm test`, `npm run build`, paste counts.
1. Code review: no `innerHTML`; listeners removed; heat values outside 0..1 or NaN clamp or show neutral.
2. Red-team `src/redteam/T18.test.ts`: at least 5 tests, for example heat with index 99 or -1 is ignored, highlight empty, `update()` after `destroy()` does not throw, route order matches `LOCI`, aria-labels are unique.
Write "Verification" as TASKS.md says.
