import type { DrillResult, Streak } from './types.ts';
import { LADDER, score } from './deck.ts';

/** Ladder index of a drill: LADDER.indexOf(d.sequence.length), or -1 if not a ladder size. */
export function levelOf(d: DrillResult): number {
  return LADDER.indexOf(d.sequence.length);
}

/** A drill is perfect when score(d.sequence, d.answers).run === d.sequence.length. */
export function isPerfect(d: DrillResult): boolean {
  return score(d.sequence, d.answers).run === d.sequence.length;
}

/** Highest unlocked ladder index. Level 0 is always unlocked. Level k+1 unlocks after a perfect drill at level k. Max LADDER.length - 1. */
export function unlockedLevel(drills: readonly DrillResult[]): number {
  let highest = 0;
  for (const d of drills) {
    const level = levelOf(d);
    if (level >= 0 && isPerfect(d)) highest = Math.max(highest, Math.min(LADDER.length - 1, level + 1));
  }
  return highest;
}

/** Staircase state, MATHS.md section 4. */
export interface Stair {
  level: number;
  wins: number;
}

/** One staircase step. Drills at a level other than s.level return s unchanged. Never mutates s. */
export function stepLevel(s: Stair, levelPlayed: number, perfect: boolean): Stair {
  if (levelPlayed !== s.level) {
    return s;
  }
  if (perfect) {
    const newWins = s.wins + 1;
    if (newWins >= 2) {
      return { level: Math.min(LADDER.length - 1, s.level + 1), wins: 0 };
    }
    return { level: s.level, wins: newWins };
  }
  return { level: Math.max(0, s.level - 1), wins: 0 };
}

/** Fold stepLevel from { level: 0, wins: 0 } over drills in array order (oldest first). Drills with levelOf -1 are skipped. Returns the level. */
export function recommendedLevel(drills: readonly DrillResult[]): number {
  let stair: Stair = { level: 0, wins: 0 };
  for (const d of drills) {
    const level = levelOf(d);
    if (level >= 0) stair = stepLevel(stair, level, isPerfect(d));
  }
  return stair.level;
}

/** For each level index, the perfect drill with the lowest memorizeMs. Levels without a perfect drill are absent. */
export function personalBests(drills: readonly DrillResult[]): Record<number, DrillResult> {
  const bests: Record<number, DrillResult> = {};
  for (const d of drills) {
    const idx = levelOf(d);
    if (idx >= 0 && isPerfect(d)) {
      if (!(idx in bests) || d.memorizeMs < bests[idx].memorizeMs) {
        bests[idx] = d;
      }
    }
  }
  return bests;
}

/** Whole days from day a to day b, both "YYYY-MM-DD". MATHS.md section 9. dayDiff('2026-03-01','2026-03-02') === 1 */
export function dayDiff(a: string, b: string): number {
  const utcDay = (s: string) => {
    const [year, month, day] = s.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return (utcDay(b) - utcDay(a)) / 86400000;
}

/** Call when the daily goal is met (one finished drill) on local day `today`. Rules in MATHS.md section 9. Never mutates s. */
export function updateStreak(s: Streak, today: string): Streak {
  const lastDay = s.lastDay;
  let count = s.count;
  let freezes = s.freezes;

  if (lastDay === '') {
    // First day ever
    count = 1;
  } else {
    const g = dayDiff(lastDay, today);

    if (g < 0) {
      // Clock moved back - return unchanged
      return s;
    }

    if (g === 0) {
      // Same day - return unchanged
      return s;
    }

    if (g === 1) {
      // Consecutive day
      count = count + 1;
    } else if (g >= 2 && g - 1 <= freezes) {
      // Gap within freeze limit
      freezes = freezes - (g - 1);
      count = count + 1;
    } else {
      // Gap too large, no freezes left
      count = 1;
    }
  }

  if (count % 7 === 0 && count > s.count) {
    freezes = Math.min(2, freezes + 1);
  }

  return {
    lastDay: today,
    count,
    freezes,
  };
}

/** Title for the highest level with a perfect drill (-1 = none). */
// -1 'Newcomer', 0 'Novice', 1 'Apprentice', 2 'Journeyman', 3 'Adept', 4 'Expert', 5 'Master', 6 'Grandmaster', 7 'Palace Keeper'
export function rankTitle(bestLevel: number): string {
  if (bestLevel < 0) return 'Newcomer';
  const titles = ['Novice', 'Apprentice', 'Journeyman', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Palace Keeper'];
  return titles[Math.min(bestLevel, titles.length - 1)] ?? 'Newcomer';
}

/** Share text. Must never contain card names or symbols (no spoilers). */
export function shareText(d: DrillResult): string {
  const { correct, run, total } = score(d.sequence, d.answers);
  const header = d.daily ? `Memory Palace · Daily Deck ${d.seed}` : 'Memory Palace · Practice';
  const elapsedSeconds = Math.floor(d.memorizeMs / 1000);
  const time = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const squares = d.sequence.map((card, i) => d.answers[i] === card ? '🟩' : '🟥');
  const lines: string[] = [];
  for (let i = 0; i < squares.length; i += 13) lines.push(squares.slice(i, i + 13).join(''));
  return [header, `${total} cards · ${correct}/${total} · run ${run} · ${time}`, ...lines].join('\n');
}

/** Today's Daily Deck drill, if any. Daily drills are seeded with the local day ("YYYY-MM-DD"); `at` is UTC, so it cannot be compared with a local day. */
export function dailyDrillOn(drills: readonly DrillResult[], today: string): DrillResult | undefined {
  return drills.find((d) => d.daily && d.seed === today);
}
