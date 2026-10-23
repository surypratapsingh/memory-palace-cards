# Design rubric (Wave 6 UI rounds, and any UI verify)

Score each criterion 1 to 5. Total out of 50. Every score needs evidence: a screenshot path, a file:line, or a measured number. A score without evidence counts as 1 for the rater (the Lead rejects it: -1 mesh score).

Read before rating: `.claude/skills/emil-design-eng/SKILL.md`, `.claude/skills/impeccable/SKILL.md`, `.claude/skills/taste-skill/SKILL.md`, `.claude/skills/break-ui/SKILL.md`, `.claude/skills/review-animations/SKILL.md`.

| # | Criterion | 1 (poor) | 3 (fine) | 5 (excellent) | How to check |
|---|---|---|---|---|---|
| 1 | Hierarchy | Everything shouts; the main action is not obvious | Main action clear after a look | One obvious next action per screen, in under 1 s | 5-second test: screenshot, cover it, name the main action |
| 2 | Typography | Random sizes and weights | A scale, mostly followed | One type scale (at most 5 sizes), tabular numbers for timers and scores, line length 45-75 characters | List every font-size in the CSS diff |
| 3 | Colour and contrast | Text under 4.5:1, colour is the only signal | AA everywhere | AA everywhere, colour-safe mode keeps every meaning (shape or text too), tokens only | MATHS.md section 10 contrast check; `grep` for hex colours outside `:root` |
| 4 | Spacing and alignment | Ad-hoc margins, ragged edges | Mostly on a grid | One 4 px or 8 px spacing scale, everything aligned to it | Measure 5 gaps in DevTools |
| 5 | Motion | Animations on keyboard actions, `transition: all`, `ease-in` | Purposeful, under 300 ms | Emil rules: transform/opacity only, strong ease-out, interruptible, nothing on 100x-a-day keyboard actions, reduced motion respected | Read the CSS/WAAPI diff; test with reduced motion |
| 6 | Feedback states | No hover, focus or pressed states | Hover and focus | Press `scale(0.97)`, `:focus-visible` ring, disabled look, loading and error states | Tab through; click and hold |
| 7 | Keyboard and accessibility | Mouse needed somewhere | Keyboard works | Full keyboard flow, visible focus, labels on every control, live regions for score/timer changes where useful | Unplug the mouse (keyboard only) |
| 8 | Fit with the 3D palace | UI hides the locus or the card | Locus visible | HUD reads over every room's lighting, never covers the locus object or the floating card, feels part of the palace | Screenshots in all 4 rooms |
| 9 | Robustness | Breaks with long text or small screens | Survives normal data | `break-ui` worst cases pass at 1280x720 and 2560x1440: long image captions, 52-card results, 999-day streak, empty states | Run the break-ui skill's checklist |
| 10 | Character and taste | Generic template look ("AI slop") | Pleasant | Memorable and coherent with a memory palace (calm, a little magical), no gratuitous gradients or glassmorphism | taste-skill anti-slop checklist |

Evidence pack for every entry (builder) and every rating (rater): screenshots at 1366x768 and 1920x1080, plus colour-safe and reduced-motion, in `docs/shots/<ID>-*.png`.
