import type { DrillResult, Streak } from './types.ts';
import { LADDER } from './deck.ts';

export function levelOf(d: DrillResult): number {
  return LADDER.indexOf(d.sequence.length);
}

export function isPerfect(d: DrillResult): boolean {
  const { sequence, answers } = d;
  let correct = 0;
  sequence.forEach((c, i) => {
    if (answers[i] === c) correct++;
  });
  return correct === sequence.length;
}

export function unlockedLevel(drills: readonly DrillResult[]): number {
  let level = 0;
  for (const d of drills) {
    if (isPerfect(d)) {
      level = Math.min(7, level + 1);
    }
  }
  return level;
}

export interface Stair {
  level: number;
  wins: number;
}

export function stepLevel(s: Stair, levelPlayed: number, perfect: boolean): Stair {
  if (levelPlayed !== s.level) {
    return s;
  }
  if (perfect) {
    const newWins = Math.min(2, s.wins + 1);
    if (newWins === 2) {
      return { level: s.level + 1, wins: 0 };
    }
    return { level: s.level, wins: newWins };
  }
  return { level: Math.max(0, s.level - 1), wins: 0 };
}

export function recommendedLevel(drills: readonly DrillResult[]): number {
  let level = 0;
  for (const d of drills) {
    const idx = levelOf(d);
    if (idx >= 0) {
      if (isPerfect(d)) {
        level = Math.min(7, level + 1);
      } else {
        level = 0;
      }
    }
  }
  return level;
}

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

export function dayDiff(a: string, b: string): number {
  const parseYYYYMMDD = (s: string): Date => {
    const year = parseInt(s.substring(0, 4), 10);
    const month = parseInt(s.substring(5, 7), 10) - 1;
    const day = parseInt(s.substring(8, 10), 10);
    return new Date(Date.UTC(year, month, day));
  };
  const da = parseYYYYMMDD(a);
  const db = parseYYYYMMDD(b);
  const diffMs = db.getTime() - da.getTime();
  return Math.round(diffMs / 86400000);
}

export function updateStreak(s: Streak, today: string): Streak {
  const lastDay = s.lastDay;
  let count = s.count;
  let freezes = s.freezes;

  if (lastDay === '') {
    count = 1;
  } else {
    const g = dayDiff(lastDay, today);
    if (g < 0) {
      // clock moved back: return unchanged
      return s;
    }
    if (g === 0) {
      // same day
      return s;
    }
    if (g === 1) {
      count = count + 1;
    }
    if (g >= 2 && g - 1 <= freezes) {
      freezes = freezes - (g - 1);
      count = count + 1;
    } else {
      count = 1;
    }
  }

  if (count > 0 && count % 7 === 0) {
    freezes = Math.min(2, freezes + 1);
  }

  return {
    lastDay: today,
    count,
    freezes,
  };
}

export function rankTitle(bestLevel: number): string {
  const titles: string[] = [
    'Newcomer',
    'Novice',
    'Apprentice',
    'Journeyman',
    'Adept',
    'Expert',
    'Master',
    'Grandmaster',
    'Palace Keeper',
  ];
  if (bestLevel < 0 || bestLevel >= titles.length) return titles[0];
  return titles[bestLevel + 1];
}

export function shareText(d: DrillResult): string {
  const seqLen = d.sequence.length;
  const correct = isPerfect(d) ? seqLen : seqLen; // we need actual score
  // Calculate score
  let correctCount = 0;
  d.sequence.forEach((c, i) => {
    if (d.answers[i] === c) correctCount++;
  });
  const run = correctCount; // simplified - actual would use score()
  const memorizeMs = d.memorizeMs;
  const minutes = Math.floor(memorizeMs / 1000);
  const sec = memorizeMs % 1000;

  const datePart = d.daily ? d.seed : 'Memory Palace · Practice';
  const cardsText = seqLen === 52 ? '4 square lines' : `${seqLen} cards`;
  const streakPrefix = d.daily ? `Daily Deck ${d.seed} ` : '';

  return `Memory Palace · ${cardsText} ${datePart}      ${streakPrefix}run ${run} · ${minutes}:${sec
    .toString()
    .padStart(2, '0')}`;
}