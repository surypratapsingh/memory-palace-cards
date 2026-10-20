# Progress Log
Newest entry first. Each entry: Done / In progress / Next / Blockers.

## 2026-10-20 - Mesh replan for Antigravity + Freebuff, MATHS.md, GitHub
- Done: Replaced the Sonnet/Haiku assignment with a two-lane mesh: AG builds 3D/UI, FB builds logic/maths/settings/integration/CI, each verifies the other (TASKS.md "The mesh": red-team tests, mutation checks, severity, evidence, mesh score). New packets: M1 maths audit, T8a living rules, T8b living palace, T9, T10, T11 first 90 s, T12 settings, Q1 bug bash; T1-T7 rewritten. MATHS.md written and numbers checked against the code. Contracts: SaveData.settings, showCard opacity, setGlideMs, save() never throws, strength colour tokens in style.css. 6 tests pass, build passes. Old unrelated README moved to docs/agent-orchestrator-README.md. GitHub repo created (private) and pushed.
- In progress: nothing.
- Next: User dispatches Wave 1 in parallel: AG builds T1; FB builds M1, then T5, T2, T3 (in that order). AG verifies FB's tasks as they finish; FB verifies T1. When a task is verified, the user tells the Lead "merge <ID>". At the T1 merge the Lead adds `src/data/palace.lock.test.ts` (frozen loci positions, see T9) and does the browser check.
- Blockers: none.

## 2026-10-20 - Cards-first replan, foundation (T0), task packets
- Done: Replanned for cards + order + 3D + desktop (plan.md). Reviewed Gemini prototype (decisions.md). Built T0: Vite + TS scaffold, `src/types.ts` contracts, `src/deck.ts`, `src/srs.ts`, `src/store.ts`, `src/ui/cardFace.ts`, 6 passing tests (`npm test`), build passes. Wrote TASKS.md board + rules and packets in tasks/. git repo initialised on main.
- In progress: nothing.
- Next: User dispatches Wave 1 in parallel: T1 (Sonnet), T2 (Haiku), T3 (Freebuff), T5 (Haiku). Then their verifiers. Integrator merges verified branches, then unblocks T4 and T6.
- Blockers: GitHub remote not set up (needed for push and T10).

## 2026-10-20 - Research and plan
- Done: Researched method of loci evidence, VR palace study, FSRS, existing apps (research.md). Wrote plan.md, decisions.md.
- Next: Start M1.
- Note: README.md in this folder describes an unrelated "Agent Orchestrator" skill. Left untouched.

## 2026-10-20 - Project started
- Done: memory files created
- Next: fill in plan.md
