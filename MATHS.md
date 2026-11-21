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

## 12. Insights (`src/insights.ts`, task T19)

### Confusions
For every valid, non-null wrong answer at index `i`, record `(expected = sequence[i], given = answers[i])`. A given card is a **swap** if it occurs at any other sequence index `j` with `|j − i| ≤ 2`; otherwise it is a **substitution**. Null, missing, malformed and correct answers add no confusion. For a swap, sort the two card IDs into deck order before grouping, so the same pair in either direction has one count. Substitutions keep their direction. Sort by count descending, then most recent occurrence timestamp descending; for equal timestamps, later drill/answer order wins. Apply the non-negative integer `limit` after sorting (default 5).

### Weak cards
Count valid tries for each valid card in all drills; a missing or null answer is a miss, and an invalid non-null answer is ignored. The player's mean is `m = total misses / total tries`. With `PRIOR_K = 5`, the posterior miss rate for card `c` is `r_c = (misses_c + PRIOR_K·m) / (tries_c + PRIOR_K)`. Include cards only when `tries_c ≥ WEAK_MIN_TRIES = 3` and `r_c − m ≥ WEAK_MARGIN = 0.15` (with the same `1e-9` boundary tolerance as weak loci). Sort by posterior rate descending, then deck order; apply the non-negative integer `limit` (default 8). No valid tries means no weak cards. The `now` argument is validated; drill history is otherwise counted without a time window.

### Speed trend
For each non-Speed-Cards drill at the requested ladder level, calculate `y = memorizeMs / 1000 / sequence.length` seconds per card. Ignore invalid timestamps, invalid card sequences, non-finite or negative times, and other levels. Sort chronologically (input order breaks equal-time ties), then retain the latest 20 values as points `y_i`, oldest first. The least-squares slope per drill is `Σ(i − x̄)(y_i − ȳ) / Σ(i − x̄)²`, for `i = 0..n−1`; with fewer than two points the slope is 0. `improving` is true only when `n ≥ 5` and slope < 0. Empty or invalid-level input returns `{ points: [], slope: 0, improving: false }`.

### Worked example (also in `src/insights.test.ts`)
All drills use sequence `[AS, 2S, 3S, 4S, 5S]`:

| Drill | Memorize time | Answers |
|---|---:|---|
| 1 | 10,000 ms | `[2S, AS, 9S, 4S, 5S]` |
| 2 | 8,000 ms | `[2S, AS, 3S, 4S, 5S]` |
| 3 | 6,000 ms | `[2S, AS, 3S, 4S, 5S]` |

There are six swapped errors for the order-free pair `(AS, 2S)` and one substitution `(3S, 9S)`, so `confusions` returns those pairs with counts 6 and 1, in that order. Seven of 15 card tries are misses, so `m = 7/15`; AS and 2S each have 3 tries and 3 misses, and their posterior rates are `(3 + 5·(7/15)) / (3 + 5) = 2/3`. Both exceed the mean by 0.2 and are weak; the other cards are not. At level 1 (five cards), the speed points are `[2, 1.6, 1.2]` seconds/card; the slope is `−0.4` seconds/card/drill and `improving` is false because there are only three points.

### Tests
`worked example: swap pairs are order-free and blanks are not confusions`; `worked example: weak cards use the global mean and Beta prior strength five`; `worked example: speed points are seconds per card and slope is per drill`; `confusions classifies a card within two loci as swap, but a more distant card as substitution`; `confusions preserve substitution direction and group repeated pairs`; `confusions on a reversed 52-card deck only classifies nearby placements as swaps`; `Speed Cards remain in confusion and weak-card aggregates`; `confusions breaks equal-frequency ties by most recent timestamp`; `confusions handles short and long answers without indexing beyond the sequence`; `all-null answers create no confusion pairs and count as weak-card misses`; `confusions ignores unknown ids, correct answers, nulls, empty drills, and invalid records`; `confusions limit is floored, clamped, and safe for non-finite values`; `weakCards needs three tries and an inclusive relative margin; blanks count as misses`; `weakCards ignores invalid card ids and invalid answers instead of throwing`; `weakCards ranks worst first, breaks ties in deck order, and applies its limit`; `weakCards returns an empty result for an invalid now date`; `speedTrend excludes speed drills and invalid times, and requires five samples to say improving`; `speedTrend retains only the last 20 chronologically sorted drills at the level`; `speedTrend excludes mismatched levels, malformed sequences, NaN times and negative durations`; `speedTrend is neutral for empty histories and invalid levels`.

## 13. Speed Cards (`src/speed.ts`, task T20)

The app models a single 52-card deck and the IAM Speed Cards rules as the default. `SPEED_MEMORIZE_LIMIT_MS = 300000` and `SPEED_RECALL_LIMIT_MS = 300000` (5 minutes each). A valid result must be a permutation of all 52 cards, have one 52-entry recalled deck, and have finite non-negative memorization and recall times no greater than the limits.

After recall, compare the memorized and recalled decks from the chosen end (top or bottom). A **perfect** deck is exactly correct and its result is the memorization time in seconds. If not perfect, stop at the first mismatch from the chosen end; `cards` is the count of correct cards before that mismatch. Use the better of the top-down and bottom-up prefixes as the partial-card score. For personal-best ordering, any perfect deck beats every partial deck; among perfect decks, lower memorization time wins; among partial decks, more correct cards wins. When tied, retain the earlier stored result; the IAM and WMSC materials reviewed do not specify an individual tie-break.

The required pure return shape is `{ perfect, cards, seconds }`: `seconds = memorizeMs / 1000` in all valid results. `seconds` is used as ranking time only for a perfect deck; partial results rank by `cards` (the IAM scoring formula converts partial cards to points, but does not make time a partial-deck tiebreak).

**Sources, checked 2026-10-23:**

- IAM, *The IAM Rulebook*, November 2019. The [official Downloads page](https://www.iam-memory.org/downloads/) identifies the rulebook as updated Nov 2019, and the [IAM announcement](https://www.iam-memory.org/2019/11/new-iam-rulebook/) says it is intended to cover participation and scoring. [Official PDF](https://www.iam-memory.org/wp-content/uploads/2019/11/IAM_Rulebook_Nov2019.pdf). The PDF endpoint was not extractable during this implementation; section text was checked in an accessible transcription at [Scribd](https://www.scribd.com/document/796343583/IAM-Rulebook-Nov2019). IAM specifies 5-minute memorization and recall, compares decks from either end, records cards up to the first mistake, and scores a full deck with `8030 / time_seconds^0.75` or a partial deck with `(cards / 52) × 111.4`. This implementation returns the underlying time/cards rather than IAM championship points.
- WMSC, Phil Chambers, [“The Speed Cards Discipline,” 31 May 2020](https://web.archive.org/web/20231003204252id_/https://www.worldmemorychampionships.com/the-speed-cards-discipline/), archived capture of the [official page](https://www.worldmemorychampionships.com/the-speed-cards-discipline/). It describes 52 cards as the goal, stops checking at the first error, assigns a five-minute time when fewer than 52 cards are correct, and allows checking either end; its example makes the error card excluded from the count. The [WMSC 2021 Millennium Standards](https://web.archive.org/web/20240425080544id_/https://www.worldmemorychampionships.com/2021-millennium-standards/) (effective Jan 31 2021) lists a 5-minute Speed Cards benchmark of 16.02 seconds and formula `8007.5 / time_seconds^0.75`, versus IAM's coefficient 8030. The partial score factors differ in presentation: IAM provides a partial-deck scoring formula; the cited WMSC standards table does not. IAM's explicit choice of checking direction is followed as the app default. The WMSC live pages returned 403, so archived WMSC captures were used.
- Neither cited IAM Speed Cards rules nor the cited WMSC Speed Cards materials specify an individual personal-best tie-break. Exact ties preserve the earlier result in input order; no extra competition rule is inferred.

**Worked example:** For the deck `DECK` with `answers = DECK` and `memorizeMs = 42000`, `speedScore` returns `{ perfect: true, cards: 52, seconds: 42 }`. If the first recalled card is wrong but the last 51 are correct, the opposite-end check gives `{ perfect: false, cards: 51, seconds: 42 }`; the perfect result ranks first regardless of time. If both the first and last cards are wrong, neither end starts with a correct card, so the scored correct prefix is 0.

**Tests:** see `src/speed.test.ts` (13 tests) and `src/progress.test.ts` Speed Cards ladder/share tests.

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
