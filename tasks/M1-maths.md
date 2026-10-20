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
- [ ] `npm test` and `npm run build` pass.
- [ ] Every section 1-3 of `MATHS.md` has at least one test that would fail if the formula changed.
- [ ] Every bug fix has a test that fails on the old code (say which in "Report").

## Questions
## Report

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
