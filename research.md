# Research: Memory Palace (Method of Loci) for a Learning Game

Date: 2026-10-20

## 1. What the technique is
- Method of loci: bind each item to a specific location along a familiar route; recall by mentally walking the route. Also called memory palace, journey method, mind palace. Source: Wikipedia "Method of loci".
- Classical rules (Rhetorica ad Herennium, Cicero): loci must be distinct, well lit, spaced out, and in a fixed order; images must be vivid, striking, absurd, active.
- Used by memory athletes for cards, digits, word lists. Usually combined with an image system (Major System, Person-Action-Object) to turn abstract items into pictures.

## 2. Evidence it works
| Finding | Source |
|---|---|
| Meta-analysis of 13 RCTs: medium effect, g = 0.65. Mostly university students, mostly list recall. | Twomey & Kroneisen 2021, Q J Exp Psychol 74(8), PMID 33535926 |
| 6 weeks of loci training changed brain connectivity toward the pattern of memory athletes; gains held up to 4 months. | Dresler et al. 2017, Neuron, PMID 28279356 |
| Virtual palaces work. Head-mounted VR gave 8.8% better recall than the same palace on a desktop screen. Desktop still works; immersion adds a bit. | Krokos, Plaisant, Varshney 2019, Virtual Reality 23(1), doi 10.1007/s10055-018-0346-3 |

## 3. Supporting learning science (well established, used in the design)
- **Retrieval practice (testing effect):** recalling beats re-reading. The game must ask questions, not just show items.
- **Spaced repetition:** reviews at growing intervals. Modern open algorithm: FSRS (Free Spaced Repetition Scheduler). TypeScript library `ts-fsrs` (MIT, v6, FSRS-7 default, needs Node >= 24 to build). It models each item with stability, difficulty and retrievability R (probability you can recall it now).
- **Generation effect:** images the learner invents stick better than images handed to them. The app should prompt the user to create the image, not generate it for them by default.
- **Familiar places work best as loci:** a palace built from the user's own home or route gives free, strong spatial memory.

## 4. Limits and risks (design must respect these)
- Evidence is strongest for **ordered lists and discrete facts** (vocab, dates, names, card sequences). Weak for deep conceptual understanding. Position the app for fact-heavy material.
- **Moving items between loci breaks the cue.** The location IS the retrieval cue. A palace that reshuffles itself by memory strength would cause interference. "Self-changing" must change appearance and route, not item positions (see decisions.md).
- Encoding takes effort; users quit if creating images is slow. Make adding an item fast.
- Reusing the same palace for different lists causes interference. One item per locus; new material gets new rooms.

## 5. Existing products (gap analysis)
- Mnemorium (mnemorium.com): photos of your real spaces, place concepts in 3D, FSRS-5, local-only.
- Lociplace, Memory Palace Builder (several), CINDER memory palace tool, various AI "palace generators".
- Pattern: most are static builders + flashcards. Gap this project targets: **the palace visibly reacts to your memory state** (fading items, guided daily walk, leech repair, growth by mastery) and is **built by asking you questions about your own places**.

## 6. Sources
- https://en.wikipedia.org/wiki/Method_of_loci
- https://pubmed.ncbi.nlm.nih.gov/33535926/
- https://pubmed.ncbi.nlm.nih.gov/28279356/
- https://link.springer.com/article/10.1007/s10055-018-0346-3
- https://github.com/open-spaced-repetition/ts-fsrs
- https://www.mnemorium.com
