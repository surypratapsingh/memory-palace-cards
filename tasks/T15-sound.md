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
- [x] `npm test` and `npm run build` pass (335 passed, 0 failed; Vite build clean in 727ms).
- [x] A test proves no `play`/`ambience` call starts audio with sound off (stub `AudioContext` and count constructions in `src/ui/soundWiring.test.ts`).
- [x] In "Report": a table of every call site (file:line, event, sfx).
- [x] Browser: sound on, play a 5-card drill end to end; sound off mid-drill stops the ambience at once.

## Questions
None.

## Report
Wired sound effects and dynamic room ambience across Drill, Onboarding, Trainer, Shadow Walk, and Main application lifecycle, respecting `settings.sound` at every call site.

### Call Sites
| File:Line | Event | Sfx / Audio Action |
|---|---|---|
| `src/main.ts:51` | `syncSettings()`: player turns sound off in Settings | `stopAll()` |
| `src/main.ts:134` | `render()`: screen changes / transitions | `stopAll()` |
| `src/ui/drill.ts:243` | `showReady`: Esc keydown | `stopAll()` |
| `src/ui/drill.ts:251` | `showReady`: Back button click | `stopAll()` |
| `src/ui/drill.ts:378` | `showMemorize` -> `updateStepView`: glide crosses door boundary (`room !== lastRoom`) | `play('whoosh', on)` |
| `src/ui/drill.ts:382` | `showMemorize` -> `updateStepView`: player standing at locus `currentStep` | `ambience(room, on)` |
| `src/ui/drill.ts:385` | `showMemorize` -> `updateStepView`: card appears | `play('flip', on)` |
| `src/ui/drill.ts:453` | `showMemorize` -> `handleQuit`: quit confirmed | `stopAll()` |
| `src/ui/drill.ts:604` | `showRecall` -> `updateStepView`: player standing at recall locus | `ambience(room, on)` |
| `src/ui/drill.ts:688` | `showRecall` -> `handleQuit`: quit confirmed | `stopAll()` |
| `src/ui/drill.ts:783` | `showResults`: results screen reveal (never during picking) | `play(correct === total ? 'correct' : 'wrong', on)` |
| `src/ui/drill.ts:946` | `showResults`: Shadow Walk button click | `stopAll()` |
| `src/ui/drill.ts:957` | `showResults`: Back to Palace exit button or Esc | `stopAll()` |
| `src/ui/drill.ts:1028` | `showGhostWarning`: Back button or Esc | `stopAll()` |
| `src/ui/drill.ts:1066` | `mountDrill`: unmount cleanup | `stopAll()` |
| `src/ui/onboarding.ts:22` | `leave()`: exit/skip onboarding | `stopAll()` |
| `src/ui/onboarding.ts:80` | `showStep1`: standing at locus 0 | `ambience(LOCI[0].room, on)` |
| `src/ui/onboarding.ts:114` | `showStep1`: skip link ("I know the method") / Esc | `stopAll()` |
| `src/ui/onboarding.ts:161` | `showStep2`: standing at locus `idx` during guided memorize | `ambience(LOCI[idx].room, on)` |
| `src/ui/onboarding.ts:162` | `showStep2`: guided card appears | `play('flip', on)` |
| `src/ui/onboarding.ts:345` | `showStep3`: standing at recall locus `recallIndex` | `ambience(room, on)` |
| `src/ui/onboarding.ts:417` | `showStep4`: result screen reveal (never during picking) | `play(perfect ? 'correct' : 'wrong', on)` |
| `src/ui/onboarding.ts:495` | `showStep4`: Continue button click / Enter / Esc | `stopAll()` |
| `src/ui/onboarding.ts:529` | `mountOnboarding`: unmount cleanup | `stopAll()` |
| `src/ui/shadowWalk.ts:136` | `handleLocusClick`: click on palace locus | `ambience(locus.room, on)` |
| `src/ui/shadowWalk.ts:157` | `leave()`: Exit button / Esc | `stopAll()` |
| `src/ui/shadowWalk.ts:182` | `mountShadowWalk`: unmount cleanup | `stopAll()` |
| `src/ui/trainer.ts:266` | `exit()`: session complete or Esc | `stopAll()` |
| `src/ui/trainer.ts:295` | `onKeyDown`: Space on recall screen reveals card | `play('flip', on)` |
| `src/ui/trainer.ts:311` | `mountTrainer`: unmount cleanup | `stopAll()` |

- `src/sound.ts`: Kept unmodified; all gain constants and guards verified.
- `src/ui/soundWiring.test.ts`: Added 11 automated unit tests verifying zero `AudioContext` allocations when sound is off, correct/wrong/whoosh/flip sound triggers with sound on, recall answer isolation, and `stopAll()` on all exit paths.

## Verify (for FB)
In `wt/T15`: `npm test`, `npm run build`, paste counts.
1. Code review: every call passes the setting, not `true`; no correct/wrong cue during recall; `stopAll()` on every exit path (Esc, Quit button, route change, result Continue).
2. Red-team `src/redteam/T15.test.ts`: at least 5 tests, for example sound off never constructs `AudioContext`; `ambience` with the same room twice starts one pad; `stopAll()` twice does not throw; `stopAll()` then `play` with sound on works again; `ambience(null, true)` stops the pad.
Write "Verification" as TASKS.md says.

## Verification (round 1)
Verdict: PASS
Evidence: `npm test` -> "tests 341, pass 341, fail 0" (335 builder + 6 red-team); `npm run build` -> exit 0.
Mutation: `src/ui/drill.ts:385` changed to `play('flip', true)` (sound ignored) -> `npm test` "pass 340, fail 1" (caught). Undone with `git checkout -- src/ui/drill.ts`.
Acceptance: ✔ tests and build pass; ✔ no-audio-with-sound-off test (`src/ui/soundWiring.test.ts`, plus `src/redteam/T15.test.ts` 1); ✔ call-site table present; browser playtest not repeated here (builder evidence only).
Code review: every `play`/`ambience` call passes `settings.sound` (only `true` is in `trainer.ts` `addImageDisplay`, unrelated). Correct/wrong cue only on results or reveal screens, never during recall picking. `stopAll()` on Esc, Quit, Back, Shadow Walk, Continue, unmount, and every `render()`. `src/sound.ts` unchanged.
Findings:
1. [S3] Report call-site table: several line numbers are off by 1-2 (e.g. drill quit `452` not `453`, ghost warning `1026` not `1028`, onboarding result `415` not `417`, trainer `293` not `295`, main `133` not `134`). Fix the table. DEFER Q1 is also acceptable.
Attacks tried that failed: sound off builds no AudioContext for any sfx or ambience; stopAll twice; ambience(null, true); repeated ambience with sound off; sound on with AudioContext undefined; stopAll then sound off stays silent; hardcoded sound-on flip caught by existing tests.
