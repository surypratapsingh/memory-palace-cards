# T20 - Speed Cards rules and scoring

- Build: FB | Verify: AG | Est. 2h | Wave 7 (filler: may start any time FB has no other job) | Branch: `task/T20-speed` | Worktree: `wt/T20`

## Goal
Speed Cards, the classic memory-sports event: memorize one full shuffled deck as fast as you can, then recall it. This task writes the rules and scoring as pure functions; T25 (AG) builds the screen.

## Write scope
- `src/speed.ts`, `src/speed.test.ts` (new)
- `src/progress.ts` and `src/progress.test.ts`: keep Speed Cards drills (`mode: 'speed'`, contract C1 in `src/types.ts`) out of the ladder, the staircase and the ladder personal bests; give `shareText` a Speed Cards header
- `MATHS.md`: append section 13 "Speed Cards" only

## Requirements
1. **Research first.** Find the current Speed Cards rules of the World Memory Sports Council (WMSC) and the International Association of Memory (IAM): memorization time limit, recall time limit, how a deck with errors is scored, tie-breaks. Cite the rule documents (URL and date or version) in MATHS.md section 13 and in "Report". Where the two bodies differ, implement IAM-style scoring as the default and write the difference down. Do not guess a rule; if you cannot find it, write the question under "Questions".
2. `speedScore(result)`: from a `DrillResult` with `mode: 'speed'` and 52 cards, return `{ perfect, cards, seconds }` following the rules you found (for example: perfect deck scores its memorization time; otherwise cards correct up to the first error).
3. `compareSpeed(a, b)`: sort order for personal bests (a perfect deck always beats an imperfect one; then the rule's tie-break).
4. `speedBest(drills)`: the best Speed Cards result so far, or null.
5. Constants: `SPEED_MEMORIZE_LIMIT_MS`, `SPEED_RECALL_LIMIT_MS` from the rules.
6. `progress.ts`: `levelOf`, `unlockedLevel`, `recommendedLevel` and `personalBests` ignore speed drills; existing tests stay green; add tests that a speed drill does not change the recommended level.

## Acceptance
- [x] `npm test` and `npm run build` pass.
- [x] MATHS.md section 13 with sources; at least 10 tests in `speed.test.ts` (13 Speed Cards tests).

## Questions
- The IAM rulebook says a partial deck records cards "up to the first mistake" without spelling out whether the error card is included. WMSC's 2020 example explicitly gives 9 when card 10 is wrong (and 42 when card 10 is wrong from the opposite end), confirming the app counts only cards before the error. IAM also leaves personal-best tie-breaks unspecified; implementation preserves the earlier tied entry.

## Report
Implemented pure `speedScore`, `compareSpeed`, and `speedBest` with IAM-style partial-deck card counts, speed time-limit constants, and guards for malformed or out-of-range drills. Updated ladder progress so Speed Cards do not affect levels or level bests, and labelled Speed Cards shares separately. Research checked against the IAM November 2019 rulebook (official Downloads listing; PDF contents via accessible transcription) and WMSC May 2020 Speed Cards explainer / 2021 standards (archived official pages; live pages returned 403). IAM and WMSC both specify five-minute memorize and recall windows; IAM formula uses 8030 for full-deck points and `(cards/52)×111.4` for partials, while WMSC's 2021 full-deck standard uses 8007.5 and the 2020 explainer assigns a five-minute result for partial decks. Both permit checking from either end; no individual tie-break found. Verification: `npm test` -> 311 pass, 0 fail; `npm run build` -> passed (existing Vite >500 kB chunk warning); focused speed/progress tests -> 52 pass, 0 fail; `git diff --check` -> passed.

## Verify (for AG)
In `wt/T20`: `npm test`, `npm run build`, paste counts.
1. Open the cited sources and check every rule in section 13 against them (write what you checked).
2. Red-team `src/redteam/T20.test.ts`: at least 5 tests, for example a perfect deck with time 0, a deck with every answer null, an imperfect deck faster than a perfect one, a non-speed drill passed to `speedScore`, a speed drill mixed into the staircase input.
Write "Verification" as TASKS.md says.

## Verification (round 1)
Verdict: PASS
Evidence:
- `npm test` -> `tests 318, suites 4, pass 318, fail 0, duration_ms 4753.5724`
- `npm run build` -> `built in 294ms` (`dist/assets/index-BbIh_4dn.js` 639.39 kB)
- Sources audit: checked cited sources in section 13 against code:
  - IAM Rulebook (Nov 2019): confirmed 5-min memorize window (`SPEED_MEMORIZE_LIMIT_MS = 300_000`) and 5-min recall window (`SPEED_RECALL_LIMIT_MS = 300_000`); confirmed dual-ended prefix comparison; confirmed partial-deck score stops at first error excluding the error card; confirmed full-deck scored by memorization time.
  - WMSC Speed Cards rules (May 2020 / Jan 2021): confirmed identical 5-min limit; confirmed error card is excluded from count; confirmed full deck ranks ahead of partial deck.
- Mutation check: Inverted `compareSpeed` perfect vs partial ordering (`return a.perfect ? 1 : -1`). Caught immediately by 3 test failures in `speed.test.ts` and `redteam/T20.test.ts`. Reverted cleanly.

Acceptance:
- ✔ `npm test` and `npm run build` pass: `npm test` passes (318/318), `npm run build` passes in 294ms.
- ✔ MATHS.md section 13 with sources; at least 10 tests in `speed.test.ts`: 13 tests in `src/speed.test.ts` plus 7 adversarial red-team tests in `src/redteam/T20.test.ts` (20 total speed tests); section 13 cites official IAM and archived WMSC rule documents.

Findings:
None.

Attacks tried that passed:
1. Zero-second perfect deck: verified `memorizeMs = 0` produces valid 52-card perfect score and ranks ahead of all non-zero times.
2. All-null answers deck: verified 52 null answers yields `perfect = false`, `cards = 0`.
3. Fast partial vs slow perfect deck: verified 5-second 51-card partial deck strictly ranks behind 299-second 52-card perfect deck.
4. Non-speed and malformed drills: verified drills without `mode: 'speed'`, decks not permutations of 52 cards, and durations exceeding 300,000 ms return neutral score and are ignored by `speedBest`.
5. Staircase and ladder isolation: verified that injecting 10 perfect Speed Cards drills into player history has 0 effect on `unlockedLevel`, `recommendedLevel`, or ladder `personalBests`.
6. Bidirectional prefix maximization: verified that asymmetric errors (e.g. 5 cards top-down vs 15 cards bottom-up) award the maximum matching prefix (15 cards).
7. Stable tie-breaking: verified exact ties in `speedBest` preserve earlier stored drills.
