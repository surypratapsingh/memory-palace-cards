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
