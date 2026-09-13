/**
 * The single reducer.
 *
 * All state transitions live here as pure functions so the interesting
 * behaviour — mastery updates, XP awards, review scheduling — is testable
 * without mounting a component. `now` is threaded through every dated action as
 * a parameter rather than read from the clock inside, which is what makes the
 * streak and spaced-repetition tests able to assert on specific dates.
 */
import { BKT, scheduleReview, updateKnown } from "@/lib/mastery";
import { executeTrade, initialPortfolio } from "@/lib/portfolio";
import { recordActiveDay, XP } from "@/lib/progress";
import { LESSONS_BY_ID } from "@/lib/curriculum";
import { ITEMS_BY_ID } from "@/lib/items";
import { TRADING_DAYS } from "@/lib/market";
import { initialState } from "@/lib/storage";
import type { GoalId, LearnerState, SkillId } from "@/lib/types";

/** One answered question, as handed back by the diagnostic or a practice set. */
export interface AnsweredItem {
  itemId: string;
  correct: boolean;
}

export type Action =
  | { type: "set-name"; name: string }
  | { type: "set-goal"; goal: GoalId }
  | { type: "submit-diagnostic"; answers: AnsweredItem[]; now: Date }
  | { type: "mark-read"; lessonId: string; now: Date }
  | { type: "submit-practice"; lessonId: string; answers: AnsweredItem[]; now: Date }
  | { type: "trade"; ticker: string; side: "buy" | "sell"; shares: number; now: Date }
  | { type: "advance-days"; days: number }
  | { type: "set-income"; income: number }
  | { type: "set-allocation"; categoryId: string; amount: number }
  | { type: "post-reply"; threadId: string; body: string; now: Date }
  | { type: "reset" };

/** Trade failures surface through here rather than by throwing. */
export interface ReducerResult {
  state: LearnerState;
  error?: string;
}

export function reduce(state: LearnerState, action: Action): ReducerResult {
  switch (action.type) {
    case "set-name":
      return { state: { ...state, displayName: action.name.slice(0, 40) } };

    case "set-goal":
      return { state: { ...state, goal: action.goal } };

    case "submit-diagnostic": {
      // Placement, not teaching: no explanations are shown between items, so
      // the learning term is switched off and the update is pure measurement.
      const next = applyAnswers(state, action.answers, action.now, { learning: false });
      return {
        state: {
          ...next,
          diagnosticDone: true,
          xp: next.xp + XP.diagnosticComplete,
          activeDays: recordActiveDay(next.activeDays, action.now),
        },
      };
    }

    case "mark-read": {
      const existing = state.lessons[action.lessonId];
      if (existing?.read) return { state };

      return {
        state: {
          ...state,
          xp: state.xp + XP.lessonRead,
          activeDays: recordActiveDay(state.activeDays, action.now),
          lessons: {
            ...state.lessons,
            [action.lessonId]: {
              read: true,
              bestScore: existing?.bestScore ?? 0,
              attempts: existing?.attempts ?? 0,
              completedAt: existing?.completedAt ?? null,
            },
          },
        },
      };
    }

    case "submit-practice": {
      const lesson = LESSONS_BY_ID.get(action.lessonId);
      if (!lesson || action.answers.length === 0) return { state };

      const correct = action.answers.filter((answer) => answer.correct).length;
      const score = correct / action.answers.length;

      const withMastery = applyAnswers(state, action.answers, action.now);
      const previous = state.lessons[action.lessonId];
      const bestScore = Math.max(previous?.bestScore ?? 0, score);

      // Review scheduling is per skill, not per lesson: the thing that decays
      // is the underlying knowledge, and a track's lessons all draw on it.
      const skill = withMastery.skills[lesson.skill];
      const review = scheduleReview(skill, score, action.now);

      // The on-time bonus only applies when a review was actually due, so it
      // cannot be farmed by repeating a lesson that was never at risk.
      const wasDue = state.skills[lesson.skill].dueAt !== null;
      const earned =
        (score >= 0.8 ? XP.practicePassed : 0) +
        (score === 1 ? XP.practicePerfect : 0) +
        (wasDue && score >= 0.8 ? XP.reviewOnTime : 0);

      return {
        state: {
          ...withMastery,
          xp: withMastery.xp + earned,
          activeDays: recordActiveDay(withMastery.activeDays, action.now),
          skills: {
            ...withMastery.skills,
            [lesson.skill]: { ...skill, ...review },
          },
          lessons: {
            ...withMastery.lessons,
            [action.lessonId]: {
              read: previous?.read ?? true,
              bestScore,
              attempts: (previous?.attempts ?? 0) + 1,
              completedAt:
                bestScore >= 0.8
                  ? previous?.completedAt ?? action.now.toISOString()
                  : previous?.completedAt ?? null,
            },
          },
        },
      };
    }

    case "trade": {
      const result = executeTrade(
        state.portfolio,
        { ticker: action.ticker, side: action.side, shares: action.shares },
        action.now,
      );

      if (!result.ok) return { state, error: result.reason };

      const firstTrade = state.portfolio.trades.length === 0;
      return {
        state: {
          ...state,
          portfolio: result.state,
          xp: state.xp + (firstTrade ? XP.firstTrade : 0),
          activeDays: recordActiveDay(state.activeDays, action.now),
        },
      };
    }

    case "advance-days": {
      const day = Math.max(
        0,
        Math.min(state.portfolio.day + action.days, TRADING_DAYS),
      );
      return { state: { ...state, portfolio: { ...state.portfolio, day } } };
    }

    case "set-income":
      return {
        state: {
          ...state,
          budget: {
            ...state.budget,
            monthlyIncome: clampMoney(action.income),
          },
        },
      };

    case "set-allocation":
      return {
        state: {
          ...state,
          budget: {
            ...state.budget,
            allocations: {
              ...state.budget.allocations,
              [action.categoryId]: clampMoney(action.amount),
            },
          },
        },
      };

    case "post-reply": {
      const body = action.body.trim();
      if (!body) return { state };

      return {
        state: {
          ...state,
          activeDays: recordActiveDay(state.activeDays, action.now),
          threads: state.threads.map((thread) =>
            thread.id === action.threadId
              ? {
                  ...thread,
                  replies: [
                    ...thread.replies,
                    {
                      id: `mine-${action.threadId}-${action.now.getTime()}`,
                      author: state.displayName || "You",
                      level: 1,
                      body: body.slice(0, 1200),
                      at: action.now.toISOString(),
                      mine: true,
                    },
                  ],
                }
              : thread,
          ),
        },
      };
    }

    case "reset":
      return { state: { ...initialState(), portfolio: initialPortfolio() } };

    default:
      return { state };
  }
}

/**
 * Runs a batch of answers through the mastery model.
 *
 * Order matters and is preserved: BKT is sequential, so answering an easy item
 * then a hard one does not land in the same place as the reverse. Batching the
 * update would lose that, and the diagnostic's whole premise is that twelve
 * ordered observations are informative.
 */
function applyAnswers(
  state: LearnerState,
  answers: AnsweredItem[],
  now: Date,
  options: { learning: boolean } = { learning: true },
): LearnerState {
  const skills = { ...state.skills };
  const seen = new Set(state.seenItems);
  const transit = options.learning ? BKT.pTransit : 0;

  for (const answer of answers) {
    const item = ITEMS_BY_ID.get(answer.itemId);
    if (!item) continue;

    const skillId: SkillId = item.skill;
    const current = skills[skillId];

    skills[skillId] = {
      ...current,
      known: updateKnown(
        current.known,
        answer.correct,
        item.difficulty,
        item.choices.length,
        transit,
      ),
      attempts: current.attempts + 1,
      correct: current.correct + (answer.correct ? 1 : 0),
      lastSeenAt: now.toISOString(),
    };

    seen.add(item.id);
  }

  return { ...state, skills, seenItems: [...seen] };
}

function clampMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), 1_000_000));
}
