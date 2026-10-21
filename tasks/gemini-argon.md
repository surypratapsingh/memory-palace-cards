# Gemini 4 Argon: big task (about 8-10 hours, 3 prompts)

Gemini works in chat only. It cannot see the repo, so each prompt carries every name and number it needs.
The prompts are independent; run them in any order, one at a time.

How to run:
1. Paste one prompt (everything inside its box) into Gemini.
2. Save each code block it returns as its own file in `wt/` (any file name; the first line of each block says the real path).
3. Tell the Lead "Argon A done" (or B, C). The Lead checks the files against the prompt, runs tests, build and a browser check, and commits to main.
4. If Gemini stops part-way, reply "continue from <last file>".

Who wires them in: A goes into T7/T11 (UI screens), B and C into T9 (art). The Lead adds the wiring lines to those task packets when the files land.

| Prompt | Files | Size |
|---|---|---|
| A. UI motion kit (Emil Kowalski rules) | `src/ui/motion.css`, `src/ui/motion.ts`, test, demo page | about 3 h |
| B. Procedural room textures | `src/scene/textures.ts`, test, demo page | about 2-3 h |
| C. Room decor (character without blocking loci) | `src/scene/decor.ts`, test, demo page | about 3-4 h |

---

## Prompt A: UI motion kit

````text
You are a senior design engineer. Write a small UI motion kit for a browser game.

PROJECT
"Memory Palace" trains the method of loci with a 52-card deck: the player walks a 3D palace and places cards at 52 objects. Vite + TypeScript, plain DOM (no framework), desktop first, dark theme.

RULES FOR EVERY FILE
- TypeScript strict, with erasableSyntaxOnly (no enum, namespace or parameter properties) and verbatimModuleSyntax (types imported with `import type`). Relative imports end in `.ts`.
- No new npm packages.
- Tests use node:test and node:assert/strict and run in Node 24 straight from .ts. Node has no DOM: use small hand-made fakes, no jsdom. No wall-clock timing assertions. Restore every global you stub.
- Every function must work in Node without throwing: no matchMedia, no document, no Element.animate there.
- Output each file in its own code block. The first line of each file is a comment `FILE: <path>`.
- Short comments, only where the reason is not obvious.
- End with a list of anything you guessed or could not do, and the command to run your tests.

WHAT EXISTS (do not rewrite)
- src/style.css :root tokens: --bg #0b0f19, --panel #111827, --border #334155, --text #f8fafc, --muted #94a3b8, --accent #38bdf8, --gold #fbbf24, --danger #f43f5e, --ok #10b981. A base `button` style (panel background, 1px border, radius 6px, padding 8px 14px; hover and focus-visible set border-color to --accent). `.card-face`: a white playing card 3.5em x 5em.
- src/ui/cardFace.ts: `export function cardFace(id: CardId): HTMLElement` (CardId strings look like 'AS', 'QH', 'TD', '7C').
- Settings have `glideMs: number`; 0 means reduced motion. The app will put class `reduce-motion` on <html> when glideMs is 0, and `color-safe` on <html> for the colour-blind palette.

MOTION RULES (Emil Kowalski). Follow all of them.
1. Animate only transform and opacity (plus filter: blur up to 4px if a crossfade needs it). Never width, height, top, left, margin or padding. Never `transition: all`.
2. Easing tokens:
   --ease-out: cubic-bezier(0.23, 1, 0.32, 1)
   --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)
   --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)
   Enter, exit and feedback use ease-out. Movement on screen uses ease-in-out. Hover colour uses `ease`. Never ease-in.
3. Durations (ms): press 140, small (hover/colour) 160, reveal 140, feedback 220, enter 240, exit 160 (exit is faster than enter), stagger step 40 with total stagger capped at 240, countUp 600 (rare: end of a drill). Every other animation is 300 ms or less.
4. Keyboard actions get no movement. The trainer reveal (Space) and rating keys (1-4) are pressed about 50 times a session, so reveal() is opacity only. The focus-visible outline appears at once (never transition outline).
5. Pressable elements: `transform: scale(0.97)` on :active, `transition: transform 140ms var(--ease-out)`. Hover effects only inside `@media (hover: hover) and (pointer: fine)`, and hover changes colour or border only, never position.
6. Nothing enters from scale(0). Smallest start scale is 0.96, always together with opacity.
7. Interruptible: a new animation from this kit on an element cancels the kit's running animation on that element (track them in a WeakMap). Use WAAPI `el.animate()`. The end state of every animation is the element's normal CSS state (use fill 'none' or 'backwards', never 'forwards'), so a cancel never leaves an element half-way.
8. Reduced motion = `matchMedia('(prefers-reduced-motion: reduce)').matches` OR <html> has class `reduce-motion`. Then: no transform animation at all; opacity and colour changes stay but take 160 ms or less; stagger has no delays; countUp shows the final value at once.
9. Never block input: no helper disables pointer events, and no helper delays the next screen by more than the exit animation (160 ms).
10. Numbers that change (scores, timers) use `font-variant-numeric: tabular-nums`.

FILE 1: src/ui/motion.css
- :root tokens: --ease-out, --ease-in-out, --ease-drawer, --dur-press, --dur-small, --dur-reveal, --dur-feedback, --dur-enter, --dur-exit.
- `button` and `.press`: press scale from rule 5. `:disabled` never scales. Focus-visible: `outline: 2px solid var(--accent); outline-offset: 2px`, no transition on outline.
- `[data-result="correct"]` and `[data-result="wrong"]` (set by feedback()): border-color plus a 2px box-shadow ring in --ok / --danger, colour transition 160 ms ease. Add a corner marker with ::after ('✓' for correct, '✗' for wrong) so colour is never the only signal.
- `.progress` (track, role="progressbar") with one child `span` (the fill): fill uses `transform: scaleX(...)` with transform-origin left, transition transform 240ms var(--ease-out). JS sets the transform on the fill itself (never a CSS variable on the parent; inherited variables recalculate all children).
- `.tabular { font-variant-numeric: tabular-nums; }`
- One reduced-motion block for both `@media (prefers-reduced-motion: reduce)` and `:root.reduce-motion`: no press scale, progress fill without transition.

FILE 2: src/ui/motion.ts (exact API)
```ts
export const EASE: { readonly out: string; readonly inOut: string; readonly drawer: string };
export const DUR: { readonly press: 140; readonly small: 160; readonly reveal: 140; readonly feedback: 220; readonly enter: 240; readonly exit: 160; readonly staggerStep: 40; readonly staggerMax: 240; readonly count: 600 };
export function reducedMotion(): boolean;
// opacity 0->1 and translateY(8px)->none, DUR.enter, EASE.out. Reduced: opacity only, 160 ms.
export function enter(el: HTMLElement, delayMs?: number): Animation | null;
// opacity 1->0, DUR.exit, EASE.out. Resolves on finish OR cancel, never rejects; resolves at once when el.animate is missing.
export function exit(el: HTMLElement): Promise<void>;
// await exit(from); from.remove(); mount(to); enter(to). from may be null.
// If swap is called while an earlier swap is still running, finish the earlier one at once
// (cancel its exit, remove its from, mount its to) before starting the new one.
export function swap(from: HTMLElement | null, to: HTMLElement, mount: (el: HTMLElement) => void): Promise<void>;
// enter() each element with delay min(i * DUR.staggerStep, DUR.staggerMax), fill 'backwards'. Reduced: no delays.
export function stagger(els: readonly HTMLElement[]): void;
// opacity 0->1 only, DUR.reveal, EASE.out. Never transform, even when motion is allowed.
export function reveal(el: HTMLElement): Animation | null;
// Sets el.dataset.result = result (deletes it for null), then:
// correct: scale 1 -> 1.03 -> 1, DUR.feedback, EASE.out.
// wrong: translateX 0, -6px, 5px, -3px, 2px, 0 (a short damped shake), DUR.feedback, EASE.out.
// null or reduced motion: attribute only, returns null.
export function feedback(el: HTMLElement, result: 'correct' | 'wrong' | null): Animation | null;
// requestAnimationFrame loop, ease-out cubic on the value, integers by default. Sets el.textContent each frame.
// At the start sets aria-label to format(to) so screen readers get the final value.
// Returns cancel(), which jumps to the final value. Non-finite numbers count as 0. Reduced: final value at once.
export function countUp(el: HTMLElement, to: number, opts?: { from?: number; ms?: number; format?: (n: number) => string }): () => void;
// bar is the fill span. style.transform = `scaleX(f)` with f clamped to [0, 1]; NaN counts as 0.
// If bar.parentElement has role="progressbar", set its aria-valuenow to Math.round(f * 100).
export function setProgress(bar: HTMLElement, fraction: number): void;
```

FILE 3: src/ui/motion.test.ts (at least 12 tests)
Fake element: { dataset: {}, style: {}, textContent: '', attributes map, setAttribute, getAttribute, removeAttribute, remove(), parentElement, animate(keyframes, options) } where animate records its arguments and returns a fake Animation { cancel(), finished: Promise, playState }. Cast with `as unknown as HTMLElement`. Stub globalThis.matchMedia, globalThis.document (documentElement.classList.contains), globalThis.requestAnimationFrame and performance.now per test, and restore them.
Must check:
- every keyframe of every helper only uses the keys transform, opacity, filter, offset, easing, composite.
- every duration is 300 ms or less except countUp, and exit is shorter than enter.
- reveal never uses transform.
- a second feedback() on the same element cancels the first animation.
- reduced motion through matchMedia AND through the html class: no keyframe has transform; feedback returns null but still sets data-result; countUp sets the final value at once.
- exit resolves when the animation finishes, when it is cancelled, and at once without animate.
- stagger on 10 elements gives delays 0, 40, ..., 240, 240, 240.
- setProgress: -1 -> scaleX(0), 2 -> scaleX(1), NaN -> scaleX(0), aria-valuenow set.
- countUp with stubbed rAF and clock: final textContent equals format(to); cancel jumps to it; aria-label set at start.
- swap: from is removed before mount is called; works with from = null; a second swap during the first ends with only the newest screen mounted.
- no helper throws when animate, matchMedia or document are missing.

FILE 4: motion-demo.html (project root) and FILE 5: src/ui/motion-demo.ts
A gallery page for a human check. The html links /src/style.css, has <div id="app"></div> and <script type="module" src="/src/ui/motion-demo.ts"></script>. The TS imports './motion.css' and builds these sections:
1. Buttons: normal, `.press` div, disabled.
2. A card from cardFace('QH') with buttons Correct / Wrong / Clear that call feedback().
3. A Reveal button that switches a second card between '?' and cardFace('AS') with reveal().
4. Two panels A and B and a "Swap screen" button that uses swap().
5. A list of 6 rows with "Replay stagger".
6. A "Score" number with a "Count to 48" button (countUp from 0, class tabular).
7. A progress bar with - and + buttons that step by 1/13.
8. A "Reduce motion" checkbox that toggles class reduce-motion on <html>.
Clicking any button very fast must never leave anything half-way or broken.
````

---

## Prompt B: Procedural room textures

````text
You are a senior graphics engineer. Write seamless procedural textures for the four rooms of a 3D memory palace.

PROJECT
"Memory Palace" trains the method of loci with a 52-card deck: the player walks a 3D palace of 4 rooms and places cards at 52 brightly coloured objects (loci). Vite + TypeScript, three.js r186, desktop first.

RULES FOR EVERY FILE
- TypeScript strict, with erasableSyntaxOnly (no enum, namespace or parameter properties) and verbatimModuleSyntax (types imported with `import type`). Relative imports end in `.ts`. `import * as THREE from 'three'`.
- No new npm packages.
- Tests use node:test and node:assert/strict and run in Node 24 straight from .ts. Node has no DOM, canvas or WebGL (three.js itself imports fine in Node). No wall-clock timing assertions.
- Output each file in its own code block. The first line of each file is a comment `FILE: <path>`.
- Short comments, only where the reason is not obvious.
- End with a list of anything you guessed or could not do, and the command to run your tests.

WHAT EXISTS
- src/deck.ts: `export function rng(seed: string): () => number` (deterministic, returns [0, 1)). Use it; no Math.random.
- Today every room uses flat colours. Floor and walls are PlaneGeometry meshes; floors are 14 x 14 m, walls are 4 m high and of different widths (split around door openings).

FILE 1: src/scene/textures.ts (exact API)
```ts
export type TextureKind =
  | 'library-floor' | 'library-wall' | 'kitchen-floor' | 'kitchen-wall'
  | 'greenhouse-floor' | 'greenhouse-wall' | 'observatory-floor' | 'observatory-wall';
export const TEXTURE_KINDS: readonly TextureKind[];
export const TILE_METERS: Readonly<Record<TextureKind, number>>; // world size of one texture tile
export interface Pixels { size: number; color: Uint8ClampedArray; bump: Uint8ClampedArray } // both RGBA, size*size*4; bump is grey (r = g = b), alpha always 255
// Pure: no three.js objects, no DOM. Default seed = kind.
export function generate(kind: TextureKind, size: 256 | 512, seed?: string): Pixels;
// Cached per kind (size 512, seed = kind). THREE.DataTexture for both.
export function texturesFor(kind: TextureKind): { map: THREE.DataTexture; bumpMap: THREE.DataTexture };
// Cached per room. room 0 Library, 1 Kitchen, 2 Greenhouse, 3 Observatory.
export function roomMaterials(room: 0 | 1 | 2 | 3): { floor: THREE.MeshStandardMaterial; wall: THREE.MeshStandardMaterial };
// Multiplies the geometry's uv attribute so one tile covers tileMeters of world space
// (u *= widthM / tileMeters, v *= heightM / tileMeters). Lets one material serve walls of any width.
export function scaleUVs(geom: THREE.BufferGeometry, widthM: number, heightM: number, tileMeters: number): void;
// Disposes every cached texture and material and clears the caches.
export function disposeTextures(): void;
```

LOOKS. "base" is the room's current flat colour. The mean colour of each colour map must stay within 10 (of 255) per channel of its base, so every room keeps its identity.
- library-floor, base #3d2817, tile 2 m: oak planks 0.18 m wide, lengths 0.9-2.4 m, staggered end joints, thin dark gaps, grain along the plank, tone varies about 8% plank to plank.
- library-wall, base #2b1d14, tile 1.2 m: dark wood panelling, vertical panels 0.6 m wide with a raised frame (in the bump map), faint grain.
- kitchen-floor, base #d8e2dc, tile 1.2 m: 0.3 m checker tiles in two close tones, thin darker grout. Compensate the grout so the mean stays on base.
- kitchen-wall, base #94a3b8, tile 0.6 m: subway tiles 0.15 x 0.075 m in running bond, light grout, slight glaze variation.
- greenhouse-floor, base #4a5d4e, tile 2 m: irregular flagstones (Voronoi cells about 0.4 m), slightly green moss in the cracks.
- greenhouse-wall, base #1b4332, tile 1 m: painted glazing frame, mullions every 0.5 m vertical and 1.0 m horizontal (raised in the bump map), panes a little lighter with a soft vertical gradient.
- observatory-floor, base #0f172a, tile 1.2 m: polished slate tiles 0.6 m with faint veins.
- observatory-wall, base #0a0f1d, tile 2 m: dark plaster with very faint speckles (1% of pixels or fewer, at most +60 brighter).

QUALITY RULES
- Seamless: each texture tiles without a visible seam. Use periodic noise (the lattice wraps at the period), Voronoi with wrapped distance, and patterns whose period divides the tile. Test: mean |difference| between column 0 and column size-1 (and between row 0 and row size-1) is at most 1.5 x the mean |difference| between neighbouring columns (rows) across the image.
- Low contrast, so the coloured locus objects stand out: per-channel standard deviation of each colour map is 24 or less.
- Deterministic: the same (kind, size, seed) gives identical bytes; another seed gives different bytes.
- Fast: no allocation per pixel; precompute lattices and gradients.
- texturesFor: `new THREE.DataTexture(data, size, size, THREE.RGBAFormat)`; map.colorSpace = THREE.SRGBColorSpace, bumpMap.colorSpace = THREE.NoColorSpace; wrapS and wrapT RepeatWrapping; magFilter LinearFilter; minFilter LinearMipmapLinearFilter; generateMipmaps true; anisotropy 4; needsUpdate true.
- roomMaterials: MeshStandardMaterial with color 0xffffff (the map carries the colour), map, bumpMap, bumpScale 1. Roughness: library floor 0.55, kitchen floor 0.35, greenhouse floor 0.8, observatory floor 0.3, every wall 0.8. Metalness 0.

FILE 2: src/scene/textures.test.ts (at least 10 tests; use size 256 to keep it quick)
- sizes, array lengths, alpha always 255, bump grey (r = g = b).
- determinism and seed change.
- seamless rule for every kind.
- mean colour within 10 of base for every kind.
- standard deviation 24 or less for every kind.
- texturesFor returns the same objects twice; colorSpace and wrap values are right.
- disposeTextures calls dispose on every texture and material (spy on dispose), and the next texturesFor builds new objects.
- scaleUVs multiplies u and v as specified on a PlaneGeometry(4, 2).

FILE 3: textures-demo.html (project root) and FILE 4: src/scene/textures-demo.ts
A page for a human check: for each kind, a canvas showing the colour map tiled 2 x 2 (to see seams), the bump map next to it, and the kind, mean colour and standard deviation as text. Use ImageData + putImageData; dark page background #0b0f19.
````

---

## Prompt C: Room decor

````text
You are a senior 3D level designer and graphics engineer. Give each room of a 3D memory palace its own character with decor, without ever blocking or competing with the 52 memory objects (loci).

PROJECT
"Memory Palace" trains the method of loci with a 52-card deck: the player walks a 3D palace of 4 rooms and places cards at 52 objects (loci). The camera glides between "viewpoints" in front of each locus; there is also free WASD walking at eye height 1.6 m. Vite + TypeScript, three.js r186, desktop first.

RULES FOR EVERY FILE
- TypeScript strict, with erasableSyntaxOnly (no enum, namespace or parameter properties) and verbatimModuleSyntax (types imported with `import type`). Relative imports end in `.ts`. `import * as THREE from 'three'`.
- No new npm packages. mergeGeometries comes from 'three/examples/jsm/utils/BufferGeometryUtils.js'.
- Tests use node:test and node:assert/strict and run in Node 24 straight from .ts. Node has no DOM or WebGL (building three.js geometry works in Node). No wall-clock timing assertions.
- Output each file in its own code block. The first line of each file is a comment `FILE: <path>`.
- Short comments, only where the reason is not obvious.
- End with a list of anything you guessed or could not do, and the command to run your tests.

WHAT EXISTS (import it, do not copy it)
src/data/palace.ts:
```ts
export interface Rect { x0: number; z0: number; x1: number; z1: number }
export const VIEW_DIST = 1.8;
export const EYE_HEIGHT = 1.6;
export const WALL = 0.2;
export const ROOMS: readonly { name: string; rect: Rect; light: number }[];
//   Library     x 0-14,      z 0-14
//   Kitchen     x 14.5-28.5, z 0-14
//   Greenhouse  x 29-43,     z 0-14
//   Observatory x 43.5-57.5, z 0-14
export const DOORS: readonly Rect[];
//   { x0: 13.8, z0: 5.5, x1: 14.7, z1: 8.5 }, { x0: 28.3, z0: 5.5, x1: 29.2, z1: 8.5 }, { x0: 42.8, z0: 5.5, x1: 43.7, z1: 8.5 }
export const LOCI: readonly { index: number; name: string; room: string; kind: string; color: number; pos: [number, number]; face: [number, number] }[];
export function viewpoint(i: number): [number, number]; // pos + VIEW_DIST * face
export function glidePath(from: number, to: number): [number, number][]; // [viewpoint(from), door centres between the rooms..., viewpoint(to)], straight segments
```
LOCI has 52 entries, 13 per room; locus i of room r is LOCI[r * 13 + i]. Positions relative to the room's (x0, z0), the same in every room, with the facing direction (towards the viewpoint):
 0 (0.8, 3.0) face (1, 0)    1 (2.2, 0.8) (0, 1)    2 (4.8, 0.8) (0, 1)    3 (7.2, 0.8) (0, 1)
 4 (9.6, 0.8) (0, 1)         5 (12.0, 0.8) (0, 1)   6 (13.2, 3.0) (-1, 0)  7 (13.2, 11.0) (-1, 0)
 8 (11.5, 13.2) (0, -1)      9 (8.5, 13.2) (0, -1)  10 (5.5, 13.2) (0, -1) 11 (2.5, 13.2) (0, -1)
 12 (0.8, 11.0) (1, 0)
Locus models are at most 1.5 x 1.0 m in footprint and 2.1 m tall, centred on pos. Their kinds are: armchair, bookshelf, globe, globe_celestial, fireplace, clock, desk, stove, refrigerator, cabinet, table, sink, cauldron, plant, fountain, bench, planter, pedestal, telescope, armillary, orrery, astrolabe. Decor must never be one of these kinds or look like one: a second bookshelf would confuse the player's memory.

src/deck.ts: `export function rng(seed: string): () => number` (deterministic). No Math.random.

src/scene/palaceWorld.ts already builds floors (y = 0), a flat ceiling (y = 4.0), walls on the room rect edges, door openings 2.8 m high, 300 star points on the Observatory ceiling, one PointLight per room centre 0.5 m below the ceiling, and one AmbientLight. Its API: `export function buildPalaceWorld(): { root: THREE.Group; dispose(): void }`. Do not rebuild any of that.
Room moods and colours: Library warm amber, dark wood (floor #3d2817, wall #2b1d14). Kitchen cool white, tile (floor #d8e2dc, wall #94a3b8). Greenhouse green, stone, glass (floor #4a5d4e, wall #1b4332). Observatory deep blue, slate, night sky (floor #0f172a, wall #0a0f1d).

FILE 1: src/scene/decor.ts (exact API)
```ts
export type DecorZone = 'floor' | 'ceiling' | 'wall';
export interface DecorItem {
  kind: string;                    // e.g. 'rug', 'beam', 'chandelier'
  room: number;                    // 0-3
  zone: DecorZone;
  min: [number, number, number];   // world-space AABB of the whole item
  max: [number, number, number];
}
// Pure data, no three.js objects, deterministic. Later also used for walk collision.
export function decorLayout(): readonly DecorItem[];
// Builds the meshes for decorLayout(). Merge all parts that share a material into one geometry.
export function buildDecor(): { root: THREE.Group; dispose(): void };
```

ZONE RULES (the tests enforce them)
1. Every item lies inside its room: min.x >= x0 + 0.2, max.x <= x1 - 0.2, the same for z; min.y >= 0, max.y <= 4.0.
2. zone 'floor': max.y <= 0.03 (rugs, inlays, path stones). Allowed anywhere in the room.
3. zone 'ceiling': min.y >= 2.6 (above eye height and above every locus).
4. zone 'wall': everything else. The whole AABB lies within 0.7 m of one room wall; its 2D distance to every locus pos is at least 1.0 m; it does not touch any door rect grown by 1.0 m on every side.
5. Clear route: for every pair of loci i < j, sample glidePath(i, j) every 0.1 m; each sample is at least 0.45 m (2D) from every 'wall' item.
6. Clear sight: for every locus i, the 3D segments from (viewpoint(i), y 1.6) to (pos, y h) for h = 0.3, 1.0 and 1.8 intersect no 'wall' or 'ceiling' item.
7. Doors: no item with min.y < 2.8 touches a door rect grown by 0.5 m on every side.
8. Geometry matches data: every vertex of every built mesh lies inside the AABB of an item of its room (tolerance 0.01 m).

BUDGET
- buildDecor's root holds 12 Mesh objects or fewer in total, 40 000 triangles or fewer, 8 materials or fewer (shared across rooms).
- No lights and no textures. Lamps glow with emissive materials (emissiveIntensity 1.5 or less).
- Ceiling items: castShadow false. Floor items: receiveShadow true.
- Low-poly primitives (Box, Cylinder, Torus with small segment counts). Before merging, convert each part with toNonIndexed() and keep only position and normal attributes, so mixed primitives merge.
- dispose() disposes every geometry and material it created; calling it twice is safe.

IDEAS (pick what reads best; each room must be recognisable at a glance)
- Library: a large rug, deep red with a gold border (two flat layers); dark wood ceiling beams; a brass chandelier with 6 emissive candle tips; wall sconces at 2.7 m.
- Kitchen: a hanging pot rack over the centre; 3 pendant lamps (cord, shade, emissive bulb); a high shelf strip with jars at 2.6 m or more.
- Greenhouse: a glass-roof frame (thin mullion grid just under the ceiling); hanging baskets with vine strands (min.y 2.6); a stone path inlay crossing the room.
- Observatory: two brass meridian arcs across the ceiling; a floor star-map / zodiac ring inlay (emissive faint blue lines, radius about 3 m); small hanging star lamps.
- Any room: corner columns (about 0.5 x 0.5 m, floor to ceiling) if they pass rule 4.

FILE 2: src/scene/decor.test.ts (at least 10 tests)
Rules 1-8 as tests (rule 5 may take about a second, that is fine), the budget (count meshes, triangles and materials under root; no Light objects; no texture on any material), dispose (spy on dispose of every geometry and material; second call does not throw), determinism (two decorLayout() calls are deep-equal), every room has at least 4 items and at least one item in each zone, and no item kind equals a locus kind.

FILE 3: decor-demo.html (project root) and FILE 4: src/scene/decor-demo.ts
A page for a human check: WebGLRenderer, buildPalaceWorld() + buildDecor(), OrbitControls (from 'three/examples/jsm/controls/OrbitControls.js'), buttons "Overview" and one per room (camera at the room centre, eye height 1.6, looking at locus 3 of that room), a checkbox "Show boxes" that draws every item AABB with Box3Helper (green floor, blue ceiling, red wall) and every rule-6 sight line, and a text line with renderer.info.render.calls and triangles.
````

---

## Round 1 review (Lead, 2026-10-21)

All three are merged. Gemini wrote 35 tests and 34 passed first time. One swap test read the wrong animation index; the Lead fixed the test because the code was right. Typecheck is clean. The reply had no `textures-demo.ts`, so the Lead wrote a short one.

Composite check (textures, decor and the 22 props at eye height in all four rooms): a big step up from flat colours, and loci still read clearly. These weak spots feed into Prompt F:
- Kitchen `tile_inlay`: a green runner with red squares down the middle looks like a board game.
- Greenhouse `hanging_basket`: big green cylinders that read as blobs.
- Greenhouse `stone_path`: a dark frame with white slabs that reads as a rail track.
- Observatory `meridian_arc`: stacked boxes form a stepped "ziggurat" across the ceiling.
- Observatory `star_lamp`: large yellow blocks.
- Whole palace: too dark and flat. Ceilings are plain black, nothing casts a shadow, props seem to float (no contact shadow), and lamps have no glow.

---

# Round 2: harder (about 15-20 hours, 3 prompts)

Work the same way as round 1. These prompts need more design work and more maths. Expect to send "continue" more than once.

| Prompt | Files | Size |
|---|---|---|
| D. Playing-card art (52 faces, a back, two themes) | `src/ui/cardArt.ts`, `src/scene/cardTexture.ts`, test, demo page | about 6 h |
| E. Walk collision and controller | `src/scene/collide.ts`, `src/scene/walkInput.ts`, tests | about 5 h |
| F. Atmosphere, lighting and decor v2 | `src/scene/atmosphere.ts`, `src/scene/decor.ts` v2, tests, demo page | about 6-8 h |

For Prompt F, paste the current `src/scene/decor.ts` at the end of the prompt before you send it.

---

## Prompt D: Playing-card art

````text
You are a senior illustrator and front-end engineer. Design and code a complete, original deck of playing cards as SVG, built only from SVG primitives and paths, for a memory-training game.

PROJECT
"Memory Palace" trains the method of loci with a 52-card deck. Cards appear in three places:
- a trainer flashcard, about 250 px wide;
- a card picker grid during recall, about 60 px wide, 52 at once;
- textures on 3D billboards in a palace.
Today a card is just the text "Q♥" on a white rectangle. The stack is Vite + TypeScript, plain DOM, three.js r186, with a dark-theme UI.

RULES FOR EVERY FILE
- TypeScript strict, with erasableSyntaxOnly (no enum, namespace or parameter properties) and verbatimModuleSyntax (types imported with `import type`). Relative imports end in `.ts`. Import three.js as `import * as THREE from 'three'`.
- No new npm packages. No external fonts, images or URLs.
- Tests use node:test and node:assert/strict and run in Node 24 straight from .ts. Node has no DOM. No wall-clock timing assertions.
- Output each file in its own code block. The first line of each file is a comment `FILE: <path>`.
- Write short comments, and only where the reason is not obvious.
- End with a list of anything you guessed or could not do, and the command to run your tests.

WHAT EXISTS (import, do not copy)
src/types.ts:
```ts
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
export type CardId = `${Rank}${Suit}`; // 'TS' = ten of spades, 'QH' = queen of hearts
```
src/deck.ts:
- `export const SUITS: readonly Suit[]` (S, H, D, C)
- `export const RANKS: readonly Rank[]` (A..K)
- `export const DECK: readonly CardId[]` (52, suit by suit)
- `export const isRed: (id: CardId) => boolean`

FILE 1: src/ui/cardArt.ts (pure, no DOM; returns SVG markup strings)
```ts
export type CardTheme = 'classic' | 'four-colour';
export interface Pip { x: number; y: number; flipped: boolean } // centre, in viewBox units
export const CARD_W = 250;
export const CARD_H = 350;
export const SUIT_PATHS: Readonly<Record<Suit, string>>; // path 'd' strings, each drawn in a 100 x 100 box
export function suitColour(suit: Suit, theme: CardTheme): string;
export function cardName(id: CardId): string; // 'Queen of hearts', 'Ten of spades', 'Ace of clubs'
export function pipLayout(rank: Rank): readonly Pip[]; // [] for J, Q, K; one pip for A
export function cardSvg(id: CardId, opts?: { theme?: CardTheme; width?: number }): string; // default theme classic, width 250
export function cardBackSvg(opts?: { width?: number }): string;
```

DESIGN
- Card frame:
  - viewBox `0 0 250 350`. `width` sets the width attribute, and height = width * 1.4.
  - Rounded corners with radius 14.
  - Card face #fffdf8, with a #d6d3d1 border 1.5 units wide.
- Colours:
  - classic: spades and clubs #111827, hearts and diamonds #c81e1e.
  - four-colour: spades #111827, hearts #c81e1e, diamonds #1d4ed8, clubs #15803d. Four colours help colour-blind players and make suits faster to tell apart in the picker.
- Suit symbols: your own clean, balanced paths for heart, spade, diamond and club. Spade and club stems must stay visible at 12 px.
- Corner index:
  - Top-left, and the same index rotated 180° at bottom-right.
  - The rank ('10' for T) sits over a small suit symbol.
  - Bold and readable at a card width of 60 px (the picker). The rank glyph is at least 16% of the card width tall.
  - Draw rank glyphs as <text> with font-family "system-ui, sans-serif", font-weight 700 and text-anchor middle.
- Pip cards 2-10:
  - Use the traditional Anglo-American layouts: two columns plus a centre column.
  - The 7 has its extra pip in the upper half only. The 8 and 10 have upper and lower centre pips. The 9 has one centre pip.
  - Pips in the lower half are rotated 180° (flipped).
  - All pips sit inside a pip field that never touches the corner indices.
- Ace: one large centre pip. The ace of spades is larger and decorated, with an ornamental frame around the spade.
- Court cards J, Q, K:
  - Your own original stylised figures. Do not copy any existing deck art.
  - Double-ended: the upper-half figure is mirrored by 180° rotation into the lower half, inside a framed panel with a thin divider.
  - King: a crown with 5 points and a beard.
  - Queen: a rounded crown with jewels, and a flower.
  - Jack: a cap with a feather, and a younger face.
  - Each figure holds an object, and the suit symbol sits near the figure.
  - The suit colour is the main accent, plus gold #c9a227 and a muted blue #3b5b8c.
  - Use flat colours and clean shapes, like modern minimalist decks.
  - Each court card must stay recognisable at 60 px wide; the crown shape and the big rank index do the work at that size.
- Card back:
  - A symmetric geometric pattern: rotating it by 180° gives the same image.
  - Navy #111827, with accent #38bdf8 and gold #c9a227 lines.
  - A white border 8 units wide.
- Markup:
  - Each SVG starts `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Queen of hearts" ...>`.
  - Use only these elements: svg, g, path, rect, circle, ellipse, line, polyline, polygon, text.
  - No `id=` attributes, because many cards share one page.
  - No defs, gradients, <use>, <script>, foreignObject, href, style elements or event attributes.
  - Each SVG string is 14 kB or less, and all 52 together are 450 kB or less.
- Deterministic: the same inputs always give the same string.

FILE 2: src/scene/cardTexture.ts (browser only)
```ts
// Draws cardSvg into a canvas (via Blob URL + Image) and returns a CanvasTexture: colorSpace SRGBColorSpace,
// anisotropy 8, generateMipmaps true. Size 256 x 358 px. Cached per (id, theme); concurrent calls for the
// same key share one Promise.
export function cardTexture(id: CardId, theme?: CardTheme): Promise<THREE.Texture>;
export function cardBackTexture(): Promise<THREE.Texture>;
export function disposeCardTextures(): void; // disposes every cached texture and revokes Blob URLs
```

FILE 3: src/ui/cardArt.test.ts (at least 14 tests)
- pipLayout: the count equals the rank for 2-10, 1 for A, and [] for J, Q, K.
- 180° symmetry for every rank except 7: for each pip (x, y, f) there is a pip (250 - x, 350 - y, !f). A pip exactly at (125, 175) maps to itself and is not flipped.
- flipped is true exactly for pips with y > 175. Pips on the centre line are not flipped.
- Every pip lies inside the pip field, and the pip field does not overlap either corner-index box.
- Every SVG is well formed: a small tag-stack check (every opened tag is closed or self-closed) finds exactly one root <svg>.
- Only the allowed element names appear. No `id=`, `<script`, `href`, `on...=`, `<style`, `foreignObject`, `<defs` or `<use`.
- aria-label equals cardName(id) for all 52, and cardName('TS') is 'Ten of spades'.
- Size limits per card and for all 52 together.
- Theme colours: four-colour diamonds use #1d4ed8 and clubs use #15803d. Classic uses #c81e1e for both red suits, and classic clubs never contain #15803d.
- Determinism, and all 52 strings are different.
- The width option: width="60" gives height="84".
- SUIT_PATHS use only valid path commands and numbers.

FILE 4: cards-demo.html (project root) and FILE 5: src/ui/cards-demo.ts
A page that shows:
- all 52 cards plus the back, in three sizes (60, 120 and 250 px wide), on the dark page background #0b0f19;
- a theme toggle (classic / four-colour);
- one three.js canvas with a rotating plane that uses cardTexture('QH'), to check the texture path.
````

---

## Prompt E: Walk collision and controller

````text
You are a senior game-physics engineer. Write the collision and movement core for first-person walking in a 3D memory palace. Keep it pure maths and test it heavily.

PROJECT
"Memory Palace" trains the method of loci. The player walks a palace of 4 rooms with 52 objects (loci). Free walking uses WASD at eye height 1.6 m. Today there are two problems:
- Walking only checks walls, so the player walks through furniture.
- Keys are read with KeyboardEvent.key. So Shift or Caps Lock "W" does nothing, and AZERTY keyboards get the wrong keys.
The stack is Vite + TypeScript with three.js r186.

RULES FOR EVERY FILE
- TypeScript strict, with erasableSyntaxOnly (no enum, namespace or parameter properties) and verbatimModuleSyntax (types imported with `import type`). Relative imports end in `.ts`.
- No new npm packages. No three.js import in these files (pure maths).
- Tests use node:test and node:assert/strict and run in Node 24 straight from .ts. No wall-clock timing assertions.
- Output each file in its own code block. The first line of each file is a comment `FILE: <path>`.
- Write short comments, and only where the reason is not obvious.
- End with a list of anything you guessed or could not do, and the command to run your tests.

WHAT EXISTS (import, do not copy)
src/data/palace.ts:
```ts
export interface Rect { x0: number; z0: number; x1: number; z1: number }
export const WALL = 0.2; // walls stand on the room rect edges; the walkable area is the rect inset by WALL
export const ROOMS: readonly { name: string; rect: Rect; light: number }[];
//   Library x 0-14, Kitchen x 14.5-28.5, Greenhouse x 29-43, Observatory x 43.5-57.5; all z 0-14
export const DOORS: readonly Rect[]; // gaps joining neighbour rooms:
//   { x0: 13.8, z0: 5.5, x1: 14.7, z1: 8.5 }, { x0: 28.3, z0: 5.5, x1: 29.2, z1: 8.5 }, { x0: 42.8, z0: 5.5, x1: 43.7, z1: 8.5 }
export const LOCI: readonly { index: number; kind: string; pos: [number, number]; face: [number, number] }[]; // 52
export function viewpoint(i: number): [number, number]; // pos + 1.8 * face: where the camera stands for locus i
export function isWalkable(x: number, z: number): boolean; // inside a room rect inset by WALL, or inside a door rect
```
Each locus model stands at `pos`, with its front towards `face` (a unit vector along x or z). Footprint per kind, as [width across the face direction, depth along the face direction] in metres:
armchair 0.95x0.8, bookshelf 1.1x0.4, globe 1.0x1.0, globe_celestial 1.0x1.0, fireplace 1.5x0.6, clock 0.5x0.45, desk 1.4x0.8, stove 0.9x0.85, refrigerator 0.85x0.9, cabinet 1.0x0.55, table 1.2x0.9, sink 1.0x0.7, cauldron 1.0x1.0, plant 0.9x0.9, fountain 1.2x1.2, bench 1.3x0.5, planter 1.1x0.5, pedestal 0.6x0.6, telescope 0.8x0.6, armillary 0.8x0.8, orrery 0.85x0.85, astrolabe 0.85x0.4.

src/scene/decor.ts:
```ts
export function decorLayout(): readonly {
  kind: string; room: number; zone: 'floor' | 'ceiling' | 'wall';
  min: [number, number, number]; max: [number, number, number];
}[];
```
Items with zone 'wall' are solid. Items with zone 'floor' (rugs) or 'ceiling' are not.

src/deck.ts: `export function rng(seed: string): () => number` (deterministic, in [0, 1)).

FILE 1: src/scene/collide.ts
```ts
export interface Box2 { x0: number; z0: number; x1: number; z1: number }
export const BODY_RADIUS = 0.3;
// Every solid in the palace as axis-aligned boxes: wall segments (each room edge minus its door gaps, 0.2 m thick,
// centred on the edge), locus footprints (rotated by face, grown by 0.05 m), and decor items with zone 'wall'.
// Computed once and cached.
export function solidBoxes(): readonly Box2[];
// True when a circle of BODY_RADIUS at (x, z) overlaps no box and its centre is walkable.
export function isFree(x: number, z: number, boxes?: readonly Box2[]): boolean;
// Moves a circle of BODY_RADIUS from (x, z) by (dx, dz) and returns the end point.
// - Slides along surfaces: the blocked component is removed and the tangential one kept.
// - Handles inside corners without jitter.
// - Splits long moves into substeps no longer than BODY_RADIUS / 2, so nothing tunnels through a 0.2 m wall,
//   even with a 2 m move.
// - Never returns a point that is not free.
// - If the start point is not free (spawned inside something), first pushes out by the shortest way.
export function moveBody(x: number, z: number, dx: number, dz: number, boxes?: readonly Box2[]): [number, number];
// Nearest free point, searched outward in rings of 0.05 m up to 3 m. Returns the input when it is already free.
export function nearestFree(x: number, z: number, boxes?: readonly Box2[]): [number, number];
```

FILE 2: src/scene/walkInput.ts
```ts
export interface WalkKeys { forward: boolean; back: boolean; left: boolean; right: boolean; run: boolean }
// Reads KeyboardEvent.code values (physical keys, layout independent): KeyW/ArrowUp forward, KeyS/ArrowDown back,
// KeyA/ArrowLeft left, KeyD/ArrowRight right, ShiftLeft/ShiftRight run. Anything else is ignored.
export function keysFromCodes(down: ReadonlySet<string>): WalkKeys;
export interface WalkState { x: number; z: number; vx: number; vz: number }
export const WALK_SPEED = 1.6;  // m/s
export const RUN_SPEED = 3.2;   // m/s
export const ACCEL = 14;        // m/s^2 towards the target velocity
export const STOP_TIME = 0.15;  // s: from walk speed to 0 after release
// yaw is the camera heading in radians: yaw 0 looks towards -z, and positive yaw turns left (three.js convention).
// 1. Target velocity from keys and yaw (diagonals normalised).
// 2. Approach it with ACCEL, and brake faster so a full stop takes STOP_TIME or less.
// 3. Move with moveBody.
// dt is clamped to [0, 0.05] so a tab switch cannot teleport the player.
// Velocity into a wall is removed so the player does not "stick" to walls.
export function stepWalk(s: WalkState, keys: WalkKeys, yaw: number, dt: number, boxes?: readonly Box2[]): WalkState;
```

FILE 3: src/scene/collide.test.ts and FILE 4: src/scene/walkInput.test.ts (at least 18 tests in total)
- Every viewpoint(i) and every door centre is free.
- solidBoxes has wall gaps exactly at the doors: walking from (7, 7) towards (50, 7) along z = 7 in 0.1 m steps reaches x > 50.
- The same walk along z = 2 stops before x = 14 (no door there).
- Sliding: walking at 45° into a wall keeps at least 90% of the tangential movement.
- Inside corner: pushing into a corner for 100 steps ends at one point. No jitter: the last 10 positions are equal to within 1e-9.
- Tunnelling: a single moveBody with dx = 2 towards a wall 0.5 m away does not pass it.
- Fuzz: 20 000 random moves (seeded rng; random dx and dz up to 1 m) from random free starts never end at a point that is not free. The room index only changes while z is inside a door's z range.
- Push-out: a start inside a locus footprint ends free and within 1.6 m of the start.
- nearestFree returns the input when it is free, and a free point otherwise.
- Each locus footprint blocks: walking straight from its viewpoint towards pos stops at least BODY_RADIUS from the footprint.
- keysFromCodes: KeyW and ArrowUp give forward. 'w' or 'W' (key values, not codes) give nothing. ShiftLeft gives run.
- Diagonal speed equals straight speed (within 1%).
- Run is twice walk speed after enough steps.
- After all keys are released at walk speed, speed is 0 within STOP_TIME (step with dt 1/60).
- dt clamp: one stepWalk with dt = 5 moves no more than RUN_SPEED * 0.05.
- Yaw convention: yaw 0 with forward moves towards -z; yaw π/2 with forward moves towards -x.
````

---

## Prompt F: Atmosphere, lighting and decor v2

````text
You are a senior technical artist for real-time 3D on the web. Make a 3D memory palace look warm, deep and grounded while it stays fast, and improve its room decor.

PROJECT
"Memory Palace" trains the method of loci. The player walks a palace of 4 rooms (Library, Kitchen, Greenhouse, Observatory) and remembers cards placed at 52 brightly coloured objects (loci). The stack is Vite + TypeScript with three.js r186 (WebGLRenderer). It is desktop first, with a target of 60 fps on a mid-range laptop GPU.

RULES FOR EVERY FILE
- TypeScript strict, with erasableSyntaxOnly (no enum, namespace or parameter properties) and verbatimModuleSyntax (types imported with `import type`). Relative imports end in `.ts`. Import three.js as `import * as THREE from 'three'`.
- No new npm packages. No postprocessing passes (see the budget).
- Tests use node:test and node:assert/strict and run in Node 24 straight from .ts. Node has no DOM or WebGL: building three.js scene objects works in Node, rendering does not. No wall-clock timing assertions.
- Output each file in its own code block. The first line of each file is a comment `FILE: <path>`.
- Write short comments, and only where the reason is not obvious.
- End with a list of anything you guessed or could not do, and the command to run your tests.

THE SCENE TODAY
- src/data/palace.ts (import, do not copy):
  - ROOMS: Library x 0-14, Kitchen x 14.5-28.5, Greenhouse x 29-43, Observatory x 43.5-57.5; all z 0-14.
  - DOORS at x ≈ 14.25, 28.75 and 43.25, with z 5.5-8.5.
  - LOCI: 52 entries, each with `pos: [x, z]`, `face: [dx, dz]`, `kind` and `color`.
  - `viewpoint(i)` and `EYE_HEIGHT = 1.6`.
- src/scene/palaceWorld.ts (`buildPalaceWorld()` returns `{ root, dispose }`) builds:
  - floors at y 0, walls, and a flat plain ceiling at 4.0 m (colour #111827);
  - door frames, a gold route ribbon on the floor, and 300 star points on the Observatory ceiling;
  - one AmbientLight (0xffffff, 0.75);
  - one PointLight per room centre (intensity 1.2, distance 25). Colours: Library 0xffeedd, Kitchen 0xf0f8ff, Greenhouse 0xe8f5e9, Observatory 0x1e293b.
  - No shadows, no tone mapping, no fog.
- Floors and walls get seamless textures with bump maps (src/scene/textures.ts).
- Locus models are low-poly and flat-shaded, with a footprint of at most 1.5 x 1.0 m and a height of at most 2.1 m.
- src/scene/decor.ts (yours, from an earlier prompt; the full file is pasted below this prompt):
  - `decorLayout()` gives pure AABB data with zones floor / ceiling / wall.
  - `buildDecor()` builds the meshes.
  - Its tests cover zone rules, clear sight lines, clear glide routes and doors.

WHAT A REVIEWER SAW AT EYE HEIGHT
- The whole palace is too dark and flat. Ceilings are black, nothing casts a shadow, objects seem to float (no contact shadow), and lamps have no glow.
- Kitchen `tile_inlay`: a green runner with red squares down the middle looks like a board game. Remove it, or make it a subtle woven mat in the kitchen's cool whites.
- Greenhouse `hanging_basket`: big green cylinders read as blobs. Make them small terracotta pots (about 0.45 m) with thin trailing vine strands and small leaf quads.
- Greenhouse `stone_path`: a dark frame with white slabs reads as a rail track. Make irregular stepping stones without a frame, close to the floor tone.
- Observatory `meridian_arc`: stacked boxes form a stepped ziggurat across the ceiling. Use thin smooth arcs (TorusGeometry with arc π and a tube radius of about 0.04 m).
- Observatory `star_lamp`: large yellow blocks. Make small glowing orbs with a soft halo.
- The Library looks good. Give its chandelier candles a visible glow.

FILE 1: src/scene/atmosphere.ts
```ts
export interface RoomMood {
  hemiSky: number; hemiGround: number; hemiIntensity: number;   // HemisphereLight
  keyColor: number; keyIntensity: number;                      // the shadow-casting light for this room
  fogColor: number; fogDensity: number;                        // FogExp2
  exposure: number;                                            // renderer.toneMappingExposure
  ceiling: number;                                             // ceiling colour
}
export const MOODS: readonly RoomMood[]; // 4, one per room, in ROOMS order
// The mood at camera x: the pure mood of a room inside it, and a smooth blend over ±1.5 m around each door x.
export function moodAt(x: number): RoomMood;
export interface Atmosphere {
  update(cameraX: number, cameraZ: number): void; // call once per frame
  dispose(): void;
}
// - Sets renderer tone mapping (ACESFilmicToneMapping) and shadow map type (PCFSoftShadowMap).
// - Adds to `scene`: one HemisphereLight, one shadow-casting DirectionalLight, FogExp2, contact shadows and lamp halos.
// - The DirectionalLight shadow camera covers only the room the camera is in, and moves when the camera changes room.
//   mapSize 2048.
// - Turns castShadow on for the locus objects passed in `casters`, and receiveShadow on for `receivers`.
export function buildAtmosphere(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  opts: { casters: readonly THREE.Object3D[]; receivers: readonly THREE.Object3D[]; lamps: readonly THREE.Vector3[] },
): Atmosphere;
// Contact shadows: one InstancedMesh of 52 soft radial "blob" decals, one per locus. The blob is a generated
// DataTexture (no image file). y 0.005, size = footprint x 1.3, opacity about 0.45, depthWrite false. One draw call.
export function contactShadows(): THREE.InstancedMesh;
// Lamp halos: one THREE.Points with a generated soft radial DataTexture, AdditiveBlending, depthWrite false and
// sizeAttenuation true. One draw call for every halo in the palace.
export function lampHalos(positions: readonly THREE.Vector3[]): THREE.Points;
```
Look targets:
- Library: warm amber; candle-lit, deep shadows, gold highlights.
- Kitchen: bright, cool morning light.
- Greenhouse: soft green daylight, slightly humid fog.
- Observatory: deep night blue, with a cool rim light so objects still read.
Every locus must stay clearly visible from its viewpoint in every room. At the loci, the scene must not be darker overall than it is today.

FILE 2: src/scene/decor.ts (v2 of your earlier file)
- Keep the same API, and every rule of the earlier tests still passes.
- Fix every item in "What a reviewer saw".
- Export `lampPositions(): readonly [number, number, number][]` (every emissive lamp, candle and star orb), for lampHalos.
- The budget stays at 12 meshes or fewer, 40 000 triangles and 8 materials.

BUDGET (whole atmosphere)
- Lights added in total: 2 (the HemisphereLight and the DirectionalLight). Keep the existing per-room PointLights, but buildAtmosphere lowers their intensity to fit the moods, and lowers the AmbientLight. Say what you changed.
- Shadows: only the DirectionalLight casts them, only locus objects are casters, and floors and walls receive.
- 3 extra draw calls or fewer (contact shadows, halos, nothing else).

FILE 3: src/scene/atmosphere.test.ts (at least 12 tests)
- MOODS has 4 entries. Exposure is between 0.6 and 1.6. fogDensity is 0.035 or less, so the far wall of a 14 m room keeps at least 75% visibility: exp(-(14 * d)^2) >= 0.75.
- moodAt gives the pure room mood at each room centre.
- moodAt is continuous across every door: sample x every 0.01 m from 10 to 50; no colour channel or number jumps by more than 2% of its range between samples.
- buildAtmosphere with a fake renderer object { toneMapping, toneMappingExposure, shadowMap: { enabled, type } } and a real THREE.Scene:
  - adds exactly 2 lights;
  - sets ACESFilmicToneMapping and PCFSoftShadowMap;
  - sets castShadow on the casters and receiveShadow on the receivers.
- After update(x, z) for a point in each room, the DirectionalLight shadow camera bounds cover that room, and they change room when x crosses a door.
- contactShadows: one InstancedMesh with 52 instances; its material has depthWrite false and transparent true.
- lampHalos: one Points with positions.length * 3 floats, using AdditiveBlending.
- dispose removes everything it added from the scene, and disposes its geometries, materials and textures (use spies).
- Decor v2:
  - all earlier decor tests still pass (paste them, updated if needed);
  - every lampPosition is inside a room and above 2.0 m;
  - no item of kind 'tile_inlay' keeps the old green colour.

FILE 4: atmosphere-demo.html (project root) and FILE 5: src/scene/atmosphere-demo.ts
- The scene: buildPalaceWorld() + buildDecor() + one simple coloured box per locus at its pos (1 x 1.2 x 0.8 m, in its LOCI colour) as a stand-in, then buildAtmosphere.
- Buttons:
  - one per room: the camera stands at the viewpoint of locus 3 of that room, at eye height 1.6, looking at the locus;
  - "Walk through": the camera glides along z = 7 from x 2 to x 56 in 20 s, so the mood blend across doors can be seen.
- A text line with renderer.info.render.calls, triangles and fps.

THE CURRENT src/scene/decor.ts FOLLOWS (paste the file here before sending).
````
