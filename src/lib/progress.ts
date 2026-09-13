/**
 * Levels, XP and streaks.
 *
 * The gamification layer is deliberately thin and tied to real progress. XP is
 * awarded for evidence of learning — reading a lesson, passing practice, keeping
 * a review schedule — and never for opening the app or tapping through a screen.
 * A points system that rewards presence rather than progress inflates the number
 * the learner is using to judge themselves, which in a financial-literacy
 * product is worse than having no number at all.
 *
 * Levels use a quadratic curve: level n requires 50·n·(n−1) XP. Early levels
 * arrive quickly and later ones take real work, without the exponential blowup
 * that makes a level number meaningless after a fortnight.
 */
export const XP = {
  lessonRead: 20,
  practicePassed: 40,
  practicePerfect: 25,
  reviewOnTime: 30,
  diagnosticComplete: 60,
  firstTrade: 25,
  budgetBalanced: 35,
} as const;

/** Total XP needed to reach a level. Level 1 starts at 0. */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return 50 * n * (n - 1);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  /** 0-1 through the current level. */
  fraction: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = ceiling - floor;

  return {
    level,
    xpIntoLevel: xp - floor,
    xpForNext: ceiling - xp,
    fraction: span === 0 ? 0 : (xp - floor) / span,
  };
}

/** ISO date (YYYY-MM-DD) in local time, which is what a streak is measured in. */
export function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Consecutive days ending today or yesterday.
 *
 * Allowing the streak to survive until the end of the following day is
 * deliberate: a streak that breaks at midnight punishes time zones and late
 * shifts rather than lapsed effort.
 */
export function streakLength(activeDays: string[], today = new Date()): number {
  if (activeDays.length === 0) return 0;

  const unique = [...new Set(activeDays)].sort();
  const todayKey = isoDay(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = isoDay(yesterday);

  const last = unique[unique.length - 1];
  if (last !== todayKey && last !== yesterdayKey) return 0;

  let streak = 1;
  for (let i = unique.length - 1; i > 0; i -= 1) {
    const current = unique[i];
    const previous = unique[i - 1];
    if (!current || !previous) break;

    const gap =
      (new Date(`${current}T00:00:00`).getTime() -
        new Date(`${previous}T00:00:00`).getTime()) /
      86_400_000;

    if (Math.round(gap) === 1) streak += 1;
    else break;
  }

  return streak;
}

/** Adds today to the active-day list, keeping it sorted, unique and bounded. */
export function recordActiveDay(activeDays: string[], today = new Date()): string[] {
  const key = isoDay(today);
  if (activeDays.includes(key)) return activeDays;
  // A year of history is more than the streak calculation can use.
  return [...activeDays, key].sort().slice(-400);
}
