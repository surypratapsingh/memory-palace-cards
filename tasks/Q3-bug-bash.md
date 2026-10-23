# Q3 - Bug bash for v1.2 (PAO)

- AG and FB, 1h search each | Wave 8 (after T28 and T29) | Branches: `qa/Q3-AG`, `qa/Q3-FB` | Worktrees: `wt/Q3-AG`, `wt/Q3-FB`

Same method as `tasks/Q1-bug-bash.md`. Bugs go to `qa/<AG|FB>-bugs-Q3.md` with ids `AG3-1`, `FB3-1`, and so on. When done: commit `Q3-AG: search done, <n> bugs` (or `Q3-FB: ...`).

## AG: playtest charter
1. Turn PAO on with an existing v1.1 save: nothing lost, normal drills unchanged.
2. PAO trainer: a full first session, then edit 5 parts.
3. PAO drill up its ladder to 52 cards; keyboard only; Backspace across loci.
4. Turn PAO off mid-way: which screens change, does anything break?

## FB: code-audit charter
1. Contract C2 fields through `store.ts`: import, export, a v1.1 save without them.
2. `pao.ts` against MATHS.md section 15; `paoSrs` keys always valid.
3. Locus stats and ghosts after PAO drills (3 cards per locus).
4. Flaky tests (5 runs of `npm test`, 3 of `npm run e2e`).

## Acceptance
- [ ] Both bug lists committed; S1 and S2 fixed and verified or accepted by the Lead.
