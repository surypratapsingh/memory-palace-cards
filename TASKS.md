# Task Board

Project: 3D memory palace game for memorizing card order. Read plan.md for the design.
`gemini-code-1792500128878.html` is a reference prototype from Gemini, not app code. Do not edit or import it.
Integrator: Opus 5.5 (Claude Code) or the user. Only the integrator edits this board, merges branches, and changes `src/types.ts`, `src/deck.ts`, `src/srs.ts`, `src/store.ts`.

| ID | Task | Builder | Verifier | Wave | Needs | Branch | Status |
|---|---|---|---|---|---|---|---|
| T0 | Foundation: contracts, deck, SRS, storage, tests | Opus 5.5 | - | 0 | - | main | done |
| T1 | 3D palace world | Sonnet 5.5 | Antigravity | 1 | T0 | task/T1-scene | todo |
| T2 | 52 default card images | Haiku 5.5 | Sonnet 5.5 | 1 | T0 | task/T2-card-images | todo |
| T3 | Card-image trainer screen | Freebuff | Antigravity | 1 | T0 | task/T3-trainer | todo |
| T5 | Progress logic: ladder, streak, share text | Haiku 5.5 | Sonnet 5.5 | 1 | T0 | task/T5-progress | todo |
| T4 | Drill: memorize and recall in 3D | Sonnet 5.5 | Antigravity | 2 | T1 merged | task/T4-drill | blocked |
| T6 | Home screen | Antigravity | Sonnet 5.5 | 2 | T5 merged | task/T6-home | blocked |
| T7 | Integration: routing, playable v1 | Sonnet 5.5 | Opus 5.5 | 3 | T2-T6 merged | task/T7-integrate | blocked |
| T8 | Living palace effects | Sonnet 5.5 | Antigravity | 4 | T7 merged | task/T8-living | blocked |
| T9 | Art and sound pass | Antigravity | Sonnet 5.5 | 4 | T7 merged | task/T9-art | blocked |
| T10 | Deploy to GitHub Pages | Haiku 5.5 | Freebuff | 4 | T7 merged, GitHub remote | task/T10-deploy | blocked |

Status flow: `todo` -> `in-progress` -> `review` -> `verified` or `changes` -> `done` (merged into main).
Wave 1 tasks have no shared files and can run at the same time.

## Rules for every agent

1. Read this file, your task file in `tasks/`, `plan.md`, and `src/types.ts`. Do not do other tasks.
2. Work in your own git worktree. Never switch branches in the main project folder, other agents use it. From the project root:
   ```
   git worktree add ../mp-T1 -b task/T1-scene
   cd ../mp-T1
   npm install
   ```
   (Replace T1 and the branch name with your task's values from the board.)
3. Edit only the files in your task's "Write scope". If you need any other file changed, stop and write the request under "Questions" in your task file.
4. No new npm dependencies unless your task says so.
5. Code style: like `src/deck.ts`. Small functions, short comments only where the reason is not obvious, no frameworks. Never put user or image text into `innerHTML`; use `textContent`.
6. Done means: `npm test` passes, `npm run build` passes, every acceptance item is met. Then fill the "Report" section of your task file and commit on your branch: `git add -A && git commit -m "T1: <summary>"`. Do not merge. Do not push.
7. Verifiers: work in the builder's worktree folder (for example `../mp-T1`). Do not change code. Run the task's "Verify" checklist. Append a "Verification" section to the task file: `PASS` or `CHANGES`, then numbered findings as `file:line - problem - suggested fix`. Commit: `git commit -am "V1: PASS"`.
8. If the verifier says `CHANGES`, the builder fixes them in the same worktree, adds a line to "Report", and asks for verification again.

## How the user dispatches a task

Builder prompt:
> Project folder: C:\Users\surya\Documents\memory_palace-game. Read TASKS.md, then do task T1 described in tasks/T1-scene.md. Follow the rules in TASKS.md exactly.

Verifier prompt:
> Project folder: C:\Users\surya\Documents\memory_palace-game. Read TASKS.md, then do ONLY the "Verify" section of tasks/T1-scene.md as the verifier, in the folder ../mp-T1. Do not change code.

## How the integrator merges (main project folder, branch main)

```
git merge --no-ff task/T1-scene
npm test
npm run build
git worktree remove ../mp-T1
```
Then set the task to `done` here, unblock the next tasks, and add an entry to progress.md.
