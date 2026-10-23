# U1 - UI round 1: visual language (AG entry vs FB entry)

- Rows: `U1-AG` (AG builds, FB rates) and `U1-FB` (FB builds, AG rates) | Est. 2h build + 1h improve each | Wave 6 (after R1, the v1.0 release) | Branches: `ui/U1-AG`, `ui/U1-FB` | Worktrees: `wt/U1-AG`, `wt/U1-FB`
- This packet is shared by both rows. Each entry writes its own report section below; never edit the other entry's section.

## How a Wave 6 round works (U1 to U5)
1. **Build** (`BUILD U1-AG` / `BUILD U1-FB`): both agents design the same screens independently on their own branch. Do not look at the other branch before your build commit.
2. **Rate** (`VERIFY`): each agent rates the other's entry with `docs/design-rubric.md` (10 criteria, /50, evidence for every score) and lists the 5 changes that would raise the score most, as findings: S2 when a criterion scores 1 or 2, S3 otherwise. Tests or build broken, a lost feature, or a broken flow is S1. Round 1 verdict: CHANGES (it is the improvement round) unless the entry already scores 45 or more with no S1/S2.
3. **Improve** (`FIX`): the builder replies under each finding (FIXED / DISPUTE) and improves the entry. Stealing good ideas from the rater's review is allowed; copying the other branch's code is not.
4. **Final rating** (`VERIFY` round 2): new score with evidence. PASS when there are no open S1/S2 (S3 may stay). The score is advisory.
5. **Pick** (`U1-PICK`, Lead row): the Lead compares both entries in the browser, picks the winner (or merges the best parts of both, saying which), merges it to main and marks both rows done. Winner +5 mesh score. The next round starts from main with the winner in it.
- Rules for every round: keep every feature and every flow; `npm test`, `npm run build` and `npm run e2e` (T16) must pass; e2e tests select by role and text, so changing a visible label means updating that e2e test in the same commit (say so in your report). Only the write scope below.
- A rater who scores the rival low without evidence loses mesh score (-1 per rejected finding). The Lead's pick weighs the screenshots more than the numbers.
- The rater still follows "The mesh" in TASKS.md: run the commands, write `src/redteam/<ID>.test.ts` with at least 5 checks (for example every new text colour pair passes 4.5:1, no hex colour outside `:root`, every button has `:focus-visible`, no `transition: all`, no `innerHTML`), and append the rubric table to the packet's "Verification" section.

## U1 goal
One visual language for the whole game: colour tokens, type scale, spacing scale, radius, elevation, buttons, panels, inputs, focus rings, and the motion tokens. It must feel like a calm, slightly magical memory palace at night, readable over the 3D scene.

## Write scope
- `src/style.css` (tokens and base components). Keep every existing token name working (other files use them), or rename it in every file that uses it in this same entry.
- `src/ui/motion.css` tokens (not `motion.ts` logic)
- `src/ui/*.css` only to switch hard-coded values to the new tokens (no layout changes; layouts are U2-U5)
- `index.html` (font loading: system fonts or one self-hosted font in `public/fonts/`, licence noted in `ASSETS.md`; no font CDN)
- `docs/design-tokens.md` (new): the tokens with a one-line rule for each
- `src/ui/style-demo.ts` + `style-demo.html` (new): every component in every state on one page
- `docs/shots/U1-AG-*.png` or `docs/shots/U1-FB-*.png`

## Requirements
1. Colour: background, surface, raised surface, border, text, muted text, accent, gold (the "gilded" reward), danger, ok; the 5 strength colours and their colour-safe set (MATHS.md section 10: every text pair at least 4.5:1, add a test case to `src/ui/contrast.test.ts` for each new pair).
2. Type: at most 5 sizes, tabular numbers for timers and scores.
3. Spacing: one scale (4 px or 8 px base). Radius: at most 3 values.
4. Buttons: primary, secondary, quiet; hover, `:focus-visible`, pressed `scale(0.97)`, disabled. Motion on press only; nothing animates on keyboard-driven drill actions.
5. Over the 3D canvas: a HUD panel style that stays readable in the brightest and darkest room.

## Acceptance
- [ ] `npm test`, `npm run build`, `npm run e2e` pass.
- [ ] `style-demo.html` shows every component and state; screenshots per the rubric's evidence pack.
- [ ] `docs/design-tokens.md` complete.

## Verify (rater)
Rate the other agent's entry as steps 2 and 4 of "How a Wave 6 round works" in `tasks/U1-visual-language.md` say: `npm test`, `npm run build`, `npm run e2e` (paste counts), the rubric table in `docs/design-rubric.md` with evidence, the 5 best changes as findings, and `src/redteam/<ID>.test.ts` with at least 5 checks. Write "Verification" as TASKS.md says.

## Questions

## Report (U1-AG)

## Report (U1-FB)
