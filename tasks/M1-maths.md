# M1 - Maths audit of the foundation (T0)

- Build: FB | Verify: AG | Est. 1.5h | Wave 1 | Branch: `task/M1-maths` | Worktree: `../mp-M1`

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
- [ ] `npm test` and `npm run build` pass.
- [ ] Every section 1-3 of `MATHS.md` has at least one test that would fail if the formula changed.
- [ ] Every bug fix has a test that fails on the old code (say which in "Report").

## Questions
## Report

## Verify (for AG)
In `../mp-M1`: run `npm test` and `npm run build`, paste the counts.
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
