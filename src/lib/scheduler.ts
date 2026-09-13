/**
 * What to study next, and why.
 *
 * The scheduler ranks every lesson and returns the top few with the reasoning
 * attached. Showing the reasoning is a product decision, not a debugging aid:
 * an app that says "do this next" and cannot say why is asking for trust it has
 * not earned, and a learner who disagrees with the recommendation has no way to
 * tell whether the system is wrong or they are.
 *
 * Four contributions, in descending priority:
 *
 *   1. Overdue review     a skill past its spaced-repetition due date
 *   2. Foundation gap     a prerequisite that is blocking other lessons
 *   3. Goal alignment     the track the learner said they care about
 *   4. Room to improve    low mastery means more to gain
 *
 * Lessons whose prerequisites are unmet are excluded entirely rather than
 * down-weighted. Serving capital gains to somebody who has not met compounding
 * produces a bad first experience that no amount of ranking finesse recovers.
 */
import { GOALS, LESSONS, LESSONS_BY_ID, SKILLS } from "./curriculum";
import { MASTERY_THRESHOLD, daysOverdue } from "./mastery";
import type { GoalId, LearnerState, Lesson, Recommendation, SkillId } from "./types";

/** How much each contribution can add to a lesson's score. */
const WEIGHTS = {
  overdueReview: 60,
  perDayOverdue: 3,
  maxOverdueBonus: 30,
  foundation: 25,
  goal: 20,
  roomToImprove: 30,
  unreadLesson: 8,
} as const;

export function goalWeights(goal: GoalId | null): Record<SkillId, number> {
  const found = GOALS.find((candidate) => candidate.id === goal);
  return found?.weights ?? { budgeting: 0.6, credit: 0.6, investing: 0.6, taxes: 0.6 };
}

/** A lesson is available once every prerequisite has been completed. */
export function prerequisitesMet(lesson: Lesson, state: LearnerState): boolean {
  return lesson.prerequisites.every(
    (id) => (state.lessons[id]?.bestScore ?? 0) >= 0.6,
  );
}

export function missingPrerequisites(lesson: Lesson, state: LearnerState): Lesson[] {
  return lesson.prerequisites
    .filter((id) => (state.lessons[id]?.bestScore ?? 0) < 0.6)
    .map((id) => LESSONS_BY_ID.get(id))
    .filter((found): found is Lesson => found !== undefined);
}

/**
 * How many downstream lessons a given lesson unblocks.
 *
 * Counted transitively: clearing "compounding" opens risk-return, fees, and
 * everything behind those. This is what makes the scheduler prefer a foundation
 * over an equally-weak leaf lesson.
 */
export function unlockCount(lessonId: string): number {
  const seen = new Set<string>();
  const queue = [lessonId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const lesson of LESSONS) {
      if (lesson.prerequisites.includes(current) && !seen.has(lesson.id)) {
        seen.add(lesson.id);
        queue.push(lesson.id);
      }
    }
  }

  return seen.size;
}

/** A lesson counts as done once practice has been passed at 80 percent or better. */
export function isComplete(lessonId: string, state: LearnerState): boolean {
  return (state.lessons[lessonId]?.bestScore ?? 0) >= 0.8;
}

export function recommend(
  state: LearnerState,
  today = new Date(),
  limit = 3,
): Recommendation[] {
  const weights = goalWeights(state.goal);
  const goalName = GOALS.find((candidate) => candidate.id === state.goal)?.name ?? null;

  const scored = LESSONS.filter((lesson) => prerequisitesMet(lesson, state))
    .map((lesson): Recommendation | null => {
      const skill = state.skills[lesson.skill];
      const progress = state.lessons[lesson.id];
      const complete = isComplete(lesson.id, state);

      // A skill with no review scheduled is not "due today" — it has never been
      // scheduled at all. Treating a null due date as zero days overdue made
      // finished lessons reappear at the top of the list forever.
      const scheduled = skill.dueAt !== null;
      const overdue = scheduled ? daysOverdue(skill, today) : Number.NEGATIVE_INFINITY;

      // A finished lesson only comes back when its skill falls due for review.
      if (complete && overdue < 0) return null;

      const reasons: string[] = [];
      let score = 0;
      let kind: Recommendation["kind"] = "next";

      if (scheduled && overdue >= 0) {
        const bonus =
          WEIGHTS.overdueReview +
          Math.min(overdue * WEIGHTS.perDayOverdue, WEIGHTS.maxOverdueBonus);
        score += bonus;
        kind = "review";
        const track = SKILLS[lesson.skill].name;
        reasons.push(
          overdue === 0
            ? `${track} is due for review today`
            : `${track} is ${overdue} day${overdue === 1 ? "" : "s"} overdue for review`,
        );
      }

      const unlocks = unlockCount(lesson.id);
      if (unlocks > 0 && !complete) {
        score += Math.min(unlocks, 5) * (WEIGHTS.foundation / 5);
        if (unlocks >= 2 && kind === "next") kind = "foundation";
        reasons.push(
          `Unlocks ${unlocks} later lesson${unlocks === 1 ? "" : "s"}`,
        );
      }

      const goalPull = weights[lesson.skill];
      if (goalPull >= 0.7) {
        score += goalPull * WEIGHTS.goal;
        if (kind === "next") kind = "goal";
        // Names the goal. "Matches your goal" on a taxes lesson reads as a
        // mistake to somebody who picked "start investing", when in fact the
        // tax track is weighted at 0.7 for exactly that goal.
        reasons.push(
          goalName ? `${SKILLS[lesson.skill].name} feeds your goal: ${goalName.toLowerCase()}` : "Matches your goal",
        );
      }

      if (!complete) {
        const room = 1 - skill.known;
        score += room * WEIGHTS.roomToImprove;
        if (skill.attempts >= 2) {
          reasons.push(
            `${Math.round(skill.known * 100)}% estimated mastery in ${SKILLS[lesson.skill].name}`,
          );
        }
      }

      if (!progress?.read) {
        score += WEIGHTS.unreadLesson;
      }

      // Tie-break toward shorter lessons, so an equal-scoring pair puts the
      // quicker win first. Small enough that it never overturns a real signal.
      score += Math.max(0, 6 - lesson.minutes) * 0.4;

      if (reasons.length === 0) reasons.push("Next in this track");

      return { lesson, score, kind, reasons };
    })
    .filter((entry): entry is Recommendation => entry !== null);

  scored.sort((a, b) => b.score - a.score || a.lesson.id.localeCompare(b.lesson.id));
  return scored.slice(0, limit);
}

/** Skills currently past their review date, most overdue first. */
export function dueSkills(state: LearnerState, today = new Date()): SkillId[] {
  return (Object.keys(state.skills) as SkillId[])
    .filter((skill) => state.skills[skill].dueAt !== null)
    .filter((skill) => daysOverdue(state.skills[skill], today) >= 0)
    .sort((a, b) => daysOverdue(state.skills[b], today) - daysOverdue(state.skills[a], today));
}

/** Share of the curriculum completed, 0-1. */
export function curriculumProgress(state: LearnerState): number {
  const done = LESSONS.filter((lesson) => isComplete(lesson.id, state)).length;
  return LESSONS.length === 0 ? 0 : done / LESSONS.length;
}

/** Lessons that are available now but not yet finished. */
export function availableLessons(state: LearnerState): Lesson[] {
  return LESSONS.filter(
    (lesson) => prerequisitesMet(lesson, state) && !isComplete(lesson.id, state),
  );
}

export { MASTERY_THRESHOLD };
