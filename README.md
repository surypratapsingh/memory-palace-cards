# Memory Palace: Cards

A desktop web game that teaches the method of loci (the "memory palace") by memorizing the order of a shuffled deck of playing cards.
You walk a 3D palace, place one vivid card image on each locus, then walk it again and recall the order.
Spaced repetition (FSRS) keeps the card images in long-term memory, and the palace shows what you are forgetting.

Status: foundation done, game in development by a mesh of AI agents. See `TASKS.md`.

## Run

Needs Node 24.

```
npm install
npm run dev
npm test
npm run build
```

## Docs
- `plan.md`: goal, game design, architecture, milestones
- `MATHS.md`: every formula, with tests and measured numbers
- `TASKS.md`: task board and the agent verification mesh
- `tasks/`: one packet per task (build and verify)
- `research.md`: evidence behind the design
- `decisions.md`, `progress.md`: decision log and progress log
