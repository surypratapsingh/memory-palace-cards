# T15 - Sound wiring

- Build: AG | Verify: FB | Est. 1.5h | Wave 4 (start after T11 is verified) | Branch: `task/T15-sound` | Worktree: `wt/T15`

## Goal
Quiet, useful sound: a soft flip when a card appears, a whoosh on a long glide, a clear correct/wrong cue in recall, and a low room ambience that changes with the room. Off by default; never plays before the player turns it on.

## Write scope
- `src/ui/drill.ts`, `src/ui/onboarding.ts`, `src/ui/shadowWalk.ts`, `src/ui/trainer.ts`: only `play(...)` / `ambience(...)` / `stopAll()` call lines and their imports
- `src/main.ts`: stop sound when the screen changes and when the sound setting is turned off
- `src/sound.ts`: already in main (Gemini, checked by the Lead). Change it only to fix a bug, and say which bug in "Report".
- New test: `src/ui/soundWiring.test.ts` (or tests next to the module you change)
- Not in scope: `src/scene/**`, `src/ui/cardPicker.ts` (T13).

## Requirements
1. Calls, always with `data.settings.sound` as the `on` argument:
   - memorize: `play('flip', on)` when a card appears; `play('whoosh', on)` when the glide crosses a door (the locus room changes)
   - recall: `play('correct', on)` / `play('wrong', on)` only on the results screen reveal, not while picking (no answer leak during recall)
   - trainer: `play('flip', on)` on reveal
   - `ambience(LOCI[i].room, on)` when the drill or onboarding stands at locus `i`; in Shadow Walk, the room of the last checked locus
2. `stopAll()` when leaving the drill, onboarding, trainer or Shadow Walk, and when the player turns sound off in Settings (main.ts `syncSettings`). Turning sound back on starts nothing until the next event.
3. No `AudioContext` is created while sound is off (sound.ts already guards this; keep it so).
4. Volume stays low: no change to the gains in `sound.ts` unless you write why in "Report".

## Acceptance
- [ ] `npm test` and `npm run build` pass.
- [ ] A test proves no `play`/`ambience` call starts audio with sound off (stub `AudioContext` and count constructions).
- [ ] In "Report": a table of every call site (file:line, event, sfx).
- [ ] Browser: sound on, play a 5-card drill end to end; sound off mid-drill stops the ambience at once.

## Questions
## Report

## Verify (for FB)
In `wt/T15`: `npm test`, `npm run build`, paste counts.
1. Code review: every call passes the setting, not `true`; no correct/wrong cue during recall; `stopAll()` on every exit path (Esc, Quit button, route change, result Continue).
2. Red-team `src/redteam/T15.test.ts`: at least 5 tests, for example sound off never constructs `AudioContext`; `ambience` with the same room twice starts one pad; `stopAll()` twice does not throw; `stopAll()` then `play` with sound on works again; `ambience(null, true)` stops the pad.
Write "Verification" as TASKS.md says.
