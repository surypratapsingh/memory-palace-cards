# Q1-AG Playtest Bug Bash Report

Playtest charter performed across fresh profile onboarding, 52-card keyboard drill, date/timezone shifts, malformed imports, rapid input, and screen resizing.

## AG-1 [S1] applyResult drops SaveData.journey causing complete loss of journey progress
Steps:
1. Complete journey training or import a save with existing journey loci state.
2. Complete any drill in the palace.
Expected: `data.journey` state is preserved across drills.
Actual: `applyResult` constructs a new `SaveData` object omitting `data.journey`, permanently wiping journey progress upon saving.
Evidence: src/drill-logic.ts:42-50

## AG-2 [S1] Malformed drill record in imported save causes unhandled TypeError crashing Home screen
Steps:
1. Import a save file where `drills` contains a malformed entry (e.g. `null`, `{}`, or missing `sequence`).
2. Reload Home.
Expected: Malformed drill records are safely ignored or rejected on import.
Actual: `unlockedLevel` and `personalBests` pass elements to `levelOf(d)`, which accesses `d.sequence.length`, throwing an unhandled `TypeError` that crashes the entire application mount.
Evidence: src/progress.ts:6, src/store.ts:91

## AG-3 [S2] Daily Deck "done today" check mixes UTC ISO timestamps with local dates
Steps:
1. Set client timezone west of UTC (e.g. PST, UTC-8).
2. Complete a Daily Deck drill in the evening (local day N-1, UTC day N).
3. Open the game next morning (local day N).
Expected: Daily Deck for day N is available to play.
Actual: `src/ui/home.ts` checks `d.seed === today || d.at.startsWith(today)`. Because `d.at` was recorded with UTC day N, it matches `today`, incorrectly treating yesterday's drill as completed today and locking the button to "Replay Daily Deck".
Evidence: src/ui/home.ts:166

## AG-4 [S2] skipCurrent in drill recall phase wipes all placed 3D cards from the palace
Steps:
1. Start a recall drill with 3 or more cards.
2. Recall the first 2 cards, placing them on their respective loci in the 3D palace.
3. Press '-' to skip the 3rd card.
Expected: Only the 3rd card is omitted; previously placed cards remain visible at loci 0 and 1.
Actual: `skipCurrent()` executes `view.clearCards()`, removing all previously recalled cards from the 3D scene.
Evidence: src/ui/drill.ts:653

## AG-5 [S3] Double-clicking "Start Memorizing" creates duplicate intervals and listeners
Steps:
1. Open any drill.
2. Rapidly double-click the "Start Memorizing" button.
Expected: Single click handler execution; button disabled after first click.
Actual: Multiple clicks invoke `showMemorize()`, creating duplicate `setInterval` timers (leaking the first timer handle) and duplicate `keydown` listeners on `window`.
Evidence: src/ui/drill.ts:240-248
