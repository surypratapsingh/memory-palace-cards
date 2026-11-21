// Achievements: a short list of milestones derived from the save. Nothing is stored; ids are stable.
import { DECK, LADDER } from './deck.ts';
import { journeyStrength } from './journey.ts';
import { isPerfect, levelOf } from './progress.ts';
import { speedScore } from './speed.ts';
import { strength, type Strength } from './srs.ts';
import type { DrillResult, SaveData } from './types.ts';

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  earned: boolean;
  /** `at` of the drill that earned it. Absent when no single drill did (streaks, card states). */
  earnedAt?: string;
  progress?: [done: number, of: number];
}

const AT_LEAST_LEARNING: readonly Strength[] = ['learning', 'solid', 'gilded'];

function badge(
  id: string,
  title: string,
  detail: string,
  done: number,
  of: number,
  earnedAt?: string,
): Achievement {
  const count = Number.isFinite(done) ? Math.max(0, done) : 0;
  const earned = count >= of;
  return {
    id,
    title,
    detail,
    earned,
    ...(earned && earnedAt ? { earnedAt } : {}),
    progress: [Math.min(count, of), of],
  };
}

/** Every badge, earned or not, in the order a player usually earns them. */
export function achievements(save: SaveData, now: Date): Achievement[] {
  const drills: readonly DrillResult[] = save.drills;
  const firstAt = (match: (d: DrillResult) => boolean): string | undefined => drills.find(match)?.at;
  const out: Achievement[] = [];

  out.push(badge('first-drill', 'First drill', 'Finish one drill', drills.length, 1, drills[0]?.at));

  LADDER.forEach((cards, index) => {
    const at = firstAt((d) => levelOf(d) === index && isPerfect(d));
    out.push(badge(`perfect-${cards}`, `Perfect at ${cards} cards`, `Recall all ${cards} cards in one drill`, at ? 1 : 0, 1, at));
  });

  const streak = save.streak.count;
  out.push(badge('streak-7', 'Week streak', '7 days in a row', streak, 7));
  out.push(badge('streak-30', 'Month streak', '30 days in a row', streak, 30));

  const states = DECK.map((card): Strength => {
    const state = save.srs[card];
    return state ? strength(state, now) : 'new';
  });
  const learning = states.filter((s) => AT_LEAST_LEARNING.includes(s)).length;
  const gilded = states.filter((s) => s === 'gilded').length;
  out.push(badge('cards-learning', 'All 52 cards learning', 'Every card image at learning or better', learning, DECK.length));
  out.push(badge('cards-gilded', '13 gilded cards', 'Thirteen card images at gilded', gilded, 13));

  const journey = journeyStrength(save, now);
  const journeyTotal = journey.new + journey.fading + journey.learning + journey.solid + journey.gilded;
  const journeyDone = journey.learning + journey.solid + journey.gilded;
  out.push(badge('journey-learning', 'Whole journey learning', 'Every journey locus at learning or better', journeyDone, journeyTotal));

  const speedAt = (limitSeconds: number) => firstAt((d) => {
    const score = speedScore(d);
    return score.perfect && score.seconds < limitSeconds;
  });
  const perfectSpeed = firstAt((d) => speedScore(d).perfect);
  out.push(badge('speed-perfect', 'Perfect speed deck', 'Recall all 52 cards in Speed Cards', perfectSpeed ? 1 : 0, 1, perfectSpeed));
  const under5 = speedAt(5 * 60);
  out.push(badge('speed-under-5', 'Speed deck under 5 minutes', 'Memorize a perfect deck in under 5 minutes', under5 ? 1 : 0, 1, under5));
  const under2 = speedAt(2 * 60);
  out.push(badge('speed-under-2', 'Speed deck under 2 minutes', 'Memorize a perfect deck in under 2 minutes', under2 ? 1 : 0, 1, under2));

  return out;
}
