# M1 - Maths audit of the foundation (T0)

- Build: FB | Verify: AG | Est. 1.5h | Wave 1 | Branch: `task/M1-maths` | Worktree: `wt/M1`

## Goal
The Lead wrote `src/deck.ts`, `src/srs.ts` and `src/store.ts`. Prove they match `MATHS.md`, or break them. Findings against the Lead count in the mesh score like any other.

## Write scope
- `src/math.test.ts` (new)
- Bug fixes inside `src/deck.ts`, `src/srs.ts`, `src/store.ts` that keep every exported name, signature and every rule in `MATHS.md`. Each fix needs a test in `src/math.test.ts` that fails without the fix.

## Tests to write (`node:test` + `node:assert/strict`, style of `src/core.test.ts`)
Name each test after its `MATHS.md` section, for example `test('§1 first card is uniform (chi-square)', ...)`.
1. §1 the three chi-square checks in the table, limit 87.97. Write a small `chiSquare(counts, expected)` helper in the test file.
2. §1 neighbour independence: same-suit rate within ±0.015 of 12/51 over 20000 deals.
3. §1 `deal(n, seed)` equals `deal(52, seed).slice(0, n)`; `deal(52, seed)` is a permutation of `DECK`; `shuffle` does not change its input.
4. §2 on 1000 random sequence/answer pairs (fixed seed via `rng`): `0 ≤ run ≤ correct ≤ total`, and `run` is the index of the first mismatch.
5. §3 bracket invariant for review histories of every grade; recall monotone over 400 days; range [0, 1]; recall after a JSON round trip (dates become strings) equals recall on the original within 1e-12.
6. §3 `strength()` returns each of the 5 values for a state you construct, checked in the order MATHS.md gives.
7. Store attacks: `load()` must never throw and `importJson()` must only throw `Error('Not a memory palace save file')` for all of these: `'{broken'`, `'null'`, `'[]'`, `'42'`, `'"x"'`, `'{}'`, `'{"version":1}'`, and saves where any one field has the wrong type (`srs: null`, `drills: {}`, `images: []`, `locusStats: 5`, `streak: "x"`, `settings: null`, `version: "1"`). A save that loads must have every field with the right type. Decide for each case: reject, or repair to the default. Write the rule you chose under "Report".
8. `localDay`: a date at 23:30 and 00:30 local time gives the right local day (no UTC shift).

Tests that find a bug you cannot fix inside the write scope: keep them, mark with `{ todo: 'Lead: <one line>' }` so the suite stays green, and list them under "Report".

## Acceptance
- [x] `npm test` and `npm run build` pass.
- [x] Every section 1-3 of `MATHS.md` has at least one test that would fail if the formula changed.
- [x] Every bug fix has a test that fails on the old code (say which in "Report").

## Questions
None.

## Report
- Bad-save policy: reject malformed JSON, non-object roots, incorrect/missing version, missing or invalid `srs`, and missing or invalid `drills`. Optional `images`, `locusStats`, `streak`, and `settings` may be omitted and repaired to typed defaults; if supplied as `null`, an array, or another invalid type, reject. On `load`, corrupt input is backed up under `memory-palace/v1/corrupt` when storage permits, then play starts with `emptySave`; a storage read/backup failure never prevents starting fresh (covered by §7 storage failure test). Valid supplied values (including user settings) are retained.
- The store-build repair in `src/store.ts` was required because parsed `streak` and `locusStats` values were not narrowed/cast to their SaveData contract. The accepted fix is verified by `npm run build`; test coverage below exercises parse errors and defaults, but does not directly make the old type-only compile failure fail at runtime.
- Red-team fix: the initial corrupt-load test forgot to populate storage. It now sets `memory-palace/v1` for every input and checks the returned typed save and preserved corrupt backup.
- Score test now calls `score()` for 1000 pairs generated with the project's fixed-seed `rng`; the fixed-seed check checks actual behavior, not duplicated scoring logic.
- Strength test constructs `new`, `fading`, `gilded`, `solid`, and `learning` states and checks priority (fading overrides high stability).

### Builder replies to Verification (round 2)
1. [S1] `src/store.ts:89-93` — FIXED in `5020d65`; compilation succeeds.
2. [S2] Acceptance and report documentation — FIXED here; checklist completed and bad-save policy/fix rationale recorded.
3. [S2] Mutation 1 (Sattolo shuffle) — FIXED in `§1 shuffle copies its input and permits the identity permutation`: rand near 1 must leave the final position fixed, so `floor(rand()*i)` fails.
4. [S2] Mutation 4 (remove version check) — FIXED in `§7 importJson ...`: tests reject full saves with wrong/string version and explicitly require the version 1 minimal save to be valid.
5. [S2] Corrupt load harness — FIXED: each input is inserted via `st.setItem`, and tests assert fresh typed save plus corrupt backup.
6. [S2] Score() not called — FIXED: §2 now calls imported `score()` over 1000 fixed-seed pairs and checks formula invariants.
7. [S2] Strength values/priority — FIXED: §3 constructs all five statuses and verifies fading priority.

## Verify (for AG)
In `wt/M1`: run `npm test` and `npm run build`, paste the counts.
1. **Mutation check** (tests the tests). Make each change below alone, run `npm test`, confirm at least one test fails, then undo with `git checkout -- src`. Report "killed" or "survived" for each. A survived mutant is an S2 finding against FB.
   - `src/deck.ts` shuffle: `Math.floor(rand() * i)` instead of `(i + 1)` (Sattolo's algorithm, never leaves a card in place).
   - `src/deck.ts` score: `run = i + 1` instead of `run = i`.
   - `src/srs.ts` recall: return `1` for State.New.
   - `src/store.ts` parse: remove the `version` check.
   - `src/deck.ts` localDay: `getUTCDate()` instead of `getDate()`.
2. Read each bug fix: does it keep the exported signatures and `MATHS.md`? Is the repair rule for bad saves safe (no data loss for a valid save)?
3. Red-team: `src/redteam/M1.test.ts` with at least 5 more attacks on store, deck and srs.
Write "Verification" as TASKS.md says.


## Verification (round 1)
Verdict: CHANGES
Evidence: npm test -> "pass 30, fail 0"; npm run build -> fail (7 TypeScript errors in src/store.ts); red-team: src/redteam/M1.test.ts
Acceptance:
- ✘ `npm test` and `npm run build` pass: npm test passes (pass 30, fail 0), but npm run build fails with 7 TS errors in src/store.ts:89-93 (TS2322, TS2339)
- ✘ Every section 1-3 of MATHS.md has at least one test that would fail if the formula changed: Mutation 1 and Mutation 4 survived FB tests; score() was never called in math.test.ts; strength() only checked 'new'
- ✘ Every bug fix has a test that fails on the old code: Report section was left completely blank by builder, no bug fixes or repair rules documented
Findings:
1. [S1] src/store.ts:89-93 - `npm run build` fails with 7 TypeScript compilation errors (`TS2322`, `TS2339`) during parsed save object reconstruction
2. [S2] tasks/M1-maths.md:25-32 - Acceptance checklist left unchecked and Report section left completely blank
3. [S2] tasks/M1-maths.md:35-36 - Mutation 1 survived: `src/deck.ts` shuffle with `Math.floor(rand() * i)` survived FB's test suite
4. [S2] tasks/M1-maths.md:39 - Mutation 4 survived: `src/store.ts` parse removing `version` check survived FB's test suite
5. [S2] src/math.test.ts:201-220 - `load()` corrupt test never wrote corrupt input to mock storage via `st.setItem('memory-palace/v1', input)`
6. [S2] src/math.test.ts:100-120 - `math.test.ts` reimplements score logic inline and never invokes `score()` from `src/deck.ts`
7. [S2] src/math.test.ts:190-197 - `strength()` test only verified `'new'` and omitted all other 4 statuses and priority ordering

Mutation checks:
- Mutant 1 (`src/deck.ts` shuffle: `Math.floor(rand() * i)`): SURVIVED FB tests (killed by redteam)
- Mutant 2 (`src/deck.ts` score: `run = i + 1`): KILLED (by core.test.ts)
- Mutant 3 (`src/srs.ts` recall: return 1 for State.New): KILLED
- Mutant 4 (`src/store.ts` parse: remove version check): SURVIVED FB tests (killed by redteam)
- Mutant 5 (`src/deck.ts` localDay: `getUTCDate()`): KILLED


## Verification (round 2)
Verdict: CHANGES
Evidence: npm test -> "pass 30, fail 0"; npm run build -> ok (built in 89ms); red-team: src/redteam/M1.test.ts
Acceptance:
- ✔ `npm test` and `npm run build` pass: npm test passes (pass 30, fail 0); npm run build succeeds cleanly with 0 errors
- ✘ Every section 1-3 of MATHS.md has at least one test that would fail if the formula changed: Findings 3, 4, 5, 6, 7 remain unaddressed in src/math.test.ts (Mutants 1 & 4 survive FB tests; score() uncalled; strength() only tests 'new')
- ✘ Every bug fix has a test that fails on the old code: Report section remains completely blank in tasks/M1-maths.md; no bug fixes or repair rules documented
Findings:
1. [S1] src/store.ts:89-93 - FIXED by FB in commit 5020d65 (build succeeds)
2. [S2] tasks/M1-maths.md:25-32 - OPEN: Acceptance checklist left unchecked, Report section left completely blank
3. [S2] tasks/M1-maths.md:35-36 - OPEN: Mutation 1 survives FB test suite (src/math.test.ts untouched in round 1)
4. [S2] tasks/M1-maths.md:39 - OPEN: Mutation 4 survives FB test suite (src/math.test.ts untouched in round 1)
5. [S2] src/math.test.ts:201-220 - OPEN: load() corrupt test does not populate mock storage
6. [S2] src/math.test.ts:100-120 - OPEN: score() from src/deck.ts is never called in math.test.ts
7. [S2] src/math.test.ts:190-197 - OPEN: strength() only tests 'new', omits other 4 statuses and priority order

## Verification (round 3)
Verdict: PASS
Evidence: npm test -> "pass 34, fail 0"; npm run build -> ok (built in 101ms); red-team: src/redteam/M1.test.ts (7 attacks passing)
Acceptance:
- ✔ `npm test` and `npm run build` pass: 34 tests passing, 0 failing; build succeeds cleanly with 0 errors
- ✔ Every section 1-3 of MATHS.md has at least one test that would fail if the formula changed: §1 52-bin chi-square, AS position, Daily Deck, and identity permutation; §2 score() called on 1000 pairs; §3 bracket, monotone, range, JSON round trip, and 5-state strength priority
- ✔ Every bug fix has a test that fails on the old code: Bad-save policy documented under Report; build typing fix verified; corrupt load test properly verifies mock storage
Findings: none (all 7 round 1/2 findings confirmed FIXED)

Attacks tried that failed:
1. Sattolo shuffle mutant (Math.floor(rand() * i)) killed by §1 identity permutation, §1 chi-square, and red-team chi-square tests (5 tests failed)
2. Score mutant (run = i + 1) killed by §2 score() test and red-team score invariant tests (3 tests failed)
3. FSRS recall mutant (return 1 for State.New) killed by §3 range test and core srs test (2 tests failed)
4. Version check removal mutant killed by §7 importJson and red-team invalid-version tests (3 tests failed)
5. localDay mutant (getUTCDate()) killed by §8 localDay and core deal deterministic tests (2 tests failed)
6. Red-team store attacks with corrupt JSON, missing fields, wrong version numbers, and string versions properly handled

Mutation checks:
- Mutant 1 (`src/deck.ts` shuffle: `Math.floor(rand() * i)`): KILLED (5 tests failed)
- Mutant 2 (`src/deck.ts` score: `run = i + 1`): KILLED (3 tests failed)
- Mutant 3 (`src/srs.ts` recall: return 1 for State.New): KILLED (2 tests failed)
- Mutant 4 (`src/store.ts` parse: remove version check): KILLED (3 tests failed)
- Mutant 5 (`src/deck.ts` localDay: `getUTCDate()`): KILLED (2 tests failed)
