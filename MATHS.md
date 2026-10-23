# Maths spec

Every formula in the game. Code must match this file. Numbers marked "measured" were checked by the Lead on 2026-10-20 with the code in `src/`.
If you find an error, write it under "Questions" in your task file with a counterexample. Only the Lead edits this file.

## 1. Shuffle and Daily Deck (`src/deck.ts`)

- `rng(seed)`: FNV-1a 32-bit hash of the seed string, then mulberry32. Deterministic on every machine.
- `shuffle`: Fisher-Yates on a copy. With a perfect uniform source every one of the 52! orders has probability 1/52!.
- Known ceiling: mulberry32 has 2^32 states, so at most 2^32 ≈ 4.3e9 different decks can come out (52! ≈ 8.07e67). Fine for a game, never use it for real gambling.
- Daily Deck seed = local date `YYYY-MM-DD` (`localDay()`), so everyone gets the same deck on the same calendar day.

**Uniformity test** (chi-square goodness of fit, 52 bins, df = 51):
`χ² = Σ (O_k − E)² / E`. Reject when `χ² > 87.97` (α = 0.001; Wilson-Hilferty approximation gives 88.04).
Expected χ² for a good shuffle is about 51 (the mean of χ²₅₁), standard deviation √102 ≈ 10.1.

| Check | Samples | E per bin | Measured χ² |
|---|---|---|---|
| First card of `deal(1, 's'+i)`, i < 10400 | 10400 | 200 | 37.99 |
| Position of `AS` in `deal(52, 'p'+i)`, i < 10400 | 10400 | 200 | 42.29 |
| First card of the Daily Deck, 1092 consecutive days from 2026-01-01 | 1092 | 21 | 63.05 |

**Independence of neighbours**: P(card 2 has the same suit as card 1) = 12/51 = 0.2353. Measured 0.2383 over 20000 deals (standard error √(p(1−p)/n) = 0.0030, so within 1 SE). Test bound: within ±0.015.

## 2. Score (`score` in `src/deck.ts`)

- `correct` = number of i with `answers[i] === sequence[i]`.
- `run` = index of the first wrong or skipped answer, or `sequence.length` if none (memory-sports rule: you score the cards before your first error).
- Always `0 ≤ run ≤ correct ≤ total`.
- Accuracy for charts = `correct / total`.

## 3. Card-image memory: FSRS-6 (`src/srs.ts`, ts-fsrs 5.4.2)

Forgetting curve, t = days since last review, S = stability in days, w20 = 0.1542 (ts-fsrs default):

`R(t, S) = (1 + F · t / S) ^ (−w20)`, where `F = 0.9 ^ (−1 / w20) − 1`

So `R(S, S) = 0.9` exactly: stability is the number of days until recall probability falls to 90%.
ts-fsrs counts elapsed time in whole days (floor), so the testable invariant is:

- **Bracket**: `recall(s, last + ⌊S⌋ days) ≥ 0.9 ≥ recall(s, last + ⌈S⌉ days)`. Measured: holds for 32 review histories (all 4 grades, 8 reviews each).
- **Monotone**: recall never increases while time passes without a review.
- **Range**: `0 ≤ recall ≤ 1`; `recall = 0` for a card never reviewed (State.New), by our definition.
- Measured R exactly at t = S: 0.9095 (S = 2.3), 0.9062 (S = 11.0), 0.9004 (S = 163), 0.9001 (S = 1348). The error comes only from the whole-day rounding.

Why not the Gemini prototype's `R = e^(−t/S)`: it says S is the 90% point, but `e^(−1) = 0.37`.

**Strength colours** (`strength()`): `new` (never reviewed) / `fading` (recall < 0.8) / `gilded` (S ≥ 180 days) / `solid` (S ≥ 30) / `learning` (other). Checked in this order.

## 4. Difficulty staircase (`stepLevel`, `recommendedLevel` in `src/progress.ts`, task T5)

Transformed up-down staircase (Levitt 1971), "2 up / 1 down":
- State `{ level, wins }`, start `{ 0, 0 }`. Only drills played at exactly `level` change the state.
- Perfect drill: `wins + 1`. When `wins` reaches 2: `level = min(7, level + 1)`, `wins = 0`.
- Imperfect drill: `level = max(0, level − 1)`, `wins = 0`.

From `wins = 0` the next change is up with probability p² (two wins) and down with probability 1 − p² (a loss on the first or second try). The staircase settles where up and down are equally likely, `p² = 1 − p²`, that is **p = √0.5 = 0.7071**. The player practises where they succeed about 70% of the time: hard enough to learn, easy enough to keep playing (desirable difficulty).

Invariant: `recommendedLevel(drills) ≤ unlockedLevel(drills)` for every history (a level rise needs a perfect drill at the level below, which unlocks it).

**Simulation test**: player succeeds at level L with `p(L) = 1 / (1 + e^(L − 3.5))`, so p = 0.7071 at `L* = 3.5 + ln(√2 − 1) = 2.619`. 20000 drills, fixed-seed RNG (Park-Miller: `x = 16807·x mod 2147483647`). Over the second half: success rate in [0.67, 0.74], mean level in [2.0, 3.0]. Measured with 3 seeds: success 0.702-0.703, mean level 2.43-2.44 (below L* because levels are whole numbers and level 0 is a floor).

## 5. Weak loci: empirical Bayes (`weakLoci` in `src/living.ts`, task T8a)

Raw miss rates lie for small samples (1 miss in 1 try = 100%). Shrink each locus toward the player's global miss rate with a Beta prior:

- Global miss rate `m = Σ misses / Σ tries` over all loci. If `Σ tries = 0`: no weak loci.
- Prior `Beta(k·m, k·(1 − m))` with prior strength `k = 5` tries.
- Posterior mean for locus i: **`r_i = (misses_i + k·m) / (tries_i + k)`**.
- Locus i is **weak** when `tries_i ≥ 3` and `r_i − m ≥ 0.15` (compare with a 1e-9 tolerance).
- Return at most 5 weak loci, sorted by `r_i` descending, then by index ascending.

Weak is relative to the player, so a beginner who misses 50% everywhere does not get a red palace.

Worked example (k = 5):

| Locus | tries | misses | r_i | weak? |
|---|---|---|---|---|
| 0 | 10 | 8 | (8 + 1.37255) / 15 = 0.62484 | yes (0.62484 − 0.27451 = 0.350) |
| 1..9 | 10 | 2 | (2 + 1.37255) / 15 = 0.22484 | no |
| 10 | 2 | 2 | (2 + 1.37255) / 7 = 0.48179 | no, tries < 3 |

Here `m = 28 / 102 = 0.27451`, `k·m = 1.37255`. Second example: 10 loci each 5 misses in 10 tries: `m = 0.5`, every `r_i = 0.5`, no weak loci.

Note: `locusStats` keys are strings after a JSON round trip (`"17"`, not `17`). Convert with `Number(key)`.

## 6. Ghosts: exponential fade (`ghostOpacity` in `src/living.ts`, task T8a)

After a drill its cards stay at their loci as faint ghosts. In memory sports, reusing a journey too soon causes proactive interference (old images mix with new ones). The ghost shows that risk.

- `h` = hours since the drill started (`DrillResult.at`). If `h < 0` (clock moved back), use `h = 0`.
- **`opacity(h) = 0.35 · 2^(−h / 2)`**: half-life 2 hours. 0.35 at once, 0.175 after 2 h, 0.0875 after 4 h.
- Hidden when `opacity < 0.05`, that is after `h > 2·log₂(7) = 5.615` hours.
- Warning before a new drill when the latest drill's `opacity ≥ 0.15`, that is for `h < 2·log₂(7/3) = 2.445` hours: "Fresh ghosts can mix you up. Rest a little or play anyway."
- Only the most recent drill leaves ghosts.

## 7. Camera motion (`src/scene/ease.ts`, task T1)

- `easeInOutCubic(t) = t < 0.5 ? 4t³ : 1 − (−2t + 2)³ / 2`, for t in [0, 1].
  Properties to test: e(0) = 0, e(1) = 1, e(0.5) = 0.5, monotone, symmetric `e(1 − t) = 1 − e(t)`, slope 0 at both ends, slope 3 from both sides at t = 0.5 (C¹ continuous).
- Glide over duration T = `glideMs`: `p(t) = p0 + (p1 − p0) · e(t / T)`. T = 0 means jump at once.
- Camera yaw takes the shortest turn: `lerpAngle(a, b, t) = a + d · t` with `d = atan2(sin(b − a), cos(b − a))`, so d is in [−π, π].
  Example: from 170° to −170° turns 20°, not 340°.
- Between loci in different rooms the glide goes through the door centre (2 segments), so the camera never passes through a wall.

## 8. Palace geometry (`src/data/palace.ts`, task T1)

Units are metres. x and z are floor coordinates, y is up. Data shape is defined in `tasks/T1-scene.md`.

- G1: 52 loci; `LOCI[i].index === i`; 13 per room; rooms in route order Library, Kitchen, Greenhouse, Observatory.
- G2: names unique; the pair (kind, color) unique; `kind[i] !== kind[i + 1]`; at least 15 different kinds.
- G3: every pair of loci at least 2.0 m apart (1326 pairs).
- G4: `|face| = 1` (±1e-6). Viewpoint `v_i = pos_i + 1.8 · face_i` lies inside its room shrunk by 0.3 m.
- G5: walkable area = every room rectangle shrunk by 0.2 m (walls), plus the door rectangles. Each glide path (section 7, same room: straight line; different rooms: through the door centre) stays in the walkable area, checked every 0.05 m.
- G6: inside each room the route goes around once: the angle of `pos_i` around the room centre always turns the same way and the total turn is at most 360°.

## 9. Days and streaks (`src/progress.ts`, task T5)

- `dayDiff(a, b)` = `(Date.UTC(b) − Date.UTC(a)) / 86400000` from the `YYYY-MM-DD` parts. Never `new Date('YYYY-MM-DD')` mixed with local time; DST must not change the result.
- `updateStreak(s, today)`, with `g = dayDiff(s.lastDay, today)`:
  - `s.lastDay === ''`: count = 1.
  - `g < 0` (clock moved back): return `s` unchanged.
  - `g = 0`: return `s` unchanged.
  - `g = 1`: count + 1.
  - `g ≥ 2` and `g − 1 ≤ freezes`: freezes − (g − 1), count + 1.
  - otherwise: count = 1.
  - Then `lastDay = today`. If the count went up and the new count is a multiple of 7: `freezes = min(2, freezes + 1)`.

## 10. Colour contrast (task T12)

WCAG 2 contrast ratio: `(L1 + 0.05) / (L2 + 0.05)`, L1 the lighter colour. Relative luminance `L = 0.2126·R + 0.7152·G + 0.0722·B` with each sRGB channel `c = v/255` linearised: `c ≤ 0.04045 ? c/12.92 : ((c + 0.055)/1.055)^2.4`.
Text needs at least 4.5 (WCAG AA). Measured on the current tokens: text/bg 18.30, text/panel 16.96, muted/panel 6.92, accent/panel 8.28, danger/panel 4.83, red card #d11 on white 5.04.
Strength colours are never the only signal: `:root.color-safe` swaps to the Okabe-Ito palette (safe for the common colour-vision deficiencies) and adds a shape marker (`!`, `✓`, `★`).

## 11. How many bugs are left? Capture-recapture (task Q1)

Two testers search independently (AG playtests, FB audits code). n1 = bugs AG found, n2 = bugs FB found, m = bugs both found (same root cause).
Chapman estimator of the total: **`N = (n1 + 1)(n2 + 1) / (m + 1) − 1`** (works when m = 0, unlike Lincoln-Petersen `n1·n2/m`).
Estimated bugs still hidden = `N − (n1 + n2 − m)`.
Rule: if hidden ≥ 25% of found, run another bug-bash round after the fixes.
Example: n1 = 12, n2 = 8, m = 4: N = 13·9/5 − 1 = 22.4, found 16, hidden ≈ 6.4 = 40% of found, so run another round.
Caveat: AG and FB use different methods, so they find different kinds of bugs; m is then small and N overestimates. Treat N as an upper guide, not a fact.

## 14. Journey practice (`src/journey.ts`, task T21)

### Questions
A scheduled locus `i` generates one prompt using seeded `rng(seed)`. Before it has 3 FSRS reviews, use **next** (route-order practice), except locus 51 where "next" is impossible and it becomes **number**. After 3 reviews choose uniformly from `next`, `number`, `where` (at locus 51, replace `next` with `number`).

- `next`: “What comes after <name of i>?”; answer is `i + 1`; never select this at locus 51.
- `number`: “Which stop is <name of i>?”; answer is `i`.
- `where`: “What is at stop <i>?”; answer is `i`.

The route is zero-indexed internally; the stop number in the prompt uses the same `i` as the answer contract.

### Queue
For valid FSRS journey states, due loci are sorted by due timestamp ascending, then locus index ascending. Return up to `size` due loci first. Fill remaining capacity with up to `min(5, size − dueCount)` new loci, in ascending route order, chosen only from the first room in `ROOMS` that still has any unintroduced loci. Never duplicate an index. The next room becomes eligible only when every locus in the prior room has a valid saved journey state (including a state that is not currently due). Invalid keys/states are ignored and therefore do not count as introduced. A due-only queue may use more than five existing reviewed loci; the 5-new cap applies to newly introduced loci.

### Choices
The correct answer locus and three distinct distractor loci form the options. Prefer candidates in the answer's room at absolute route-index distance ≤ 3, excluding the answer; if there are fewer than 3, draw from all other loci. A seeded Fisher-Yates shuffle chooses distractors and shuffles the four final options. Choice labels use the locus names; `correct` marks the one answer.

### FSRS grading and strength
`grade(save, i, correct, ms, now)` returns a shallow-copied save with only a valid `journey[i]` state reviewed; other valid journey records are preserved and corrupt journey keys are discarded. Map a wrong response to `Rating.Again`. A correct response under **4,000 ms** maps to `Rating.Good`; a correct response taking 4,000 ms or longer maps to `Rating.Hard`. Four seconds is a short recall window that rewards fluent route retrieval while allowing deliberate but correct recall to receive a lower grade. Invalid locus or `now` returns the original save unchanged.

`journeyStrength` counts all 52 loci exactly once by `strength(state, now)`; absent or invalid states count as `new`. Invalid `now` returns all 52 as new.

**Worked example:** With an empty save and `size = 10`, the queue is `[0,1,2,3,4]`: the first five route loci are introduced and the session introduces no more than five new items. If loci 0 and 1 are due at 09:00 and 10:00 and all later loci are new, at noon the queue is `[0,1,2,3,4,5,6]` (two due items first, then the five-new cap). For a correct answer at locus 0 after 3,999 ms, FSRS receives `Good`; at exactly 4,000 ms it receives `Hard`; a wrong answer receives `Again` regardless of time.

**Tests:** `src/journey.test.ts` covers queue order, first-room gating, at-most-five new items, due order, size and invalid input, invalid keys/states, prompt kinds, seeding, choice locality/uniqueness, all grading categories, immutability, 52-locus strength totals, and export/import persistence.
