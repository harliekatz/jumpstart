/**
 * Domain types.
 *
 * The whole app is a pure function of `LearnerState` plus the static content in
 * curriculum.ts and items.ts. Nothing here reaches a network, and no type
 * carries a value that a real deployment would need to keep secret.
 */

/** The four tracks the curriculum is organized into. */
export type SkillId =
  | "budgeting"
  | "credit"
  | "investing"
  | "taxes";

export const SKILL_IDS: readonly SkillId[] = [
  "budgeting",
  "credit",
  "investing",
  "taxes",
] as const;

export interface Skill {
  id: SkillId;
  name: string;
  blurb: string;
}

/** What the learner said they were here for. Goals reweight the scheduler. */
export type GoalId =
  | "emergency-fund"
  | "pay-off-debt"
  | "start-investing"
  | "understand-paycheck";

export interface Goal {
  id: GoalId;
  name: string;
  blurb: string;
  /** Relative pull this goal exerts on each track, 0-1. */
  weights: Record<SkillId, number>;
}

/** A single practice question. */
export interface Item {
  id: string;
  skill: SkillId;
  /** 0 = trivial, 1 = hard. Drives the slip/guess adjustment in mastery.ts. */
  difficulty: number;
  prompt: string;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
  /** Shown after answering, whether right or wrong. */
  explanation: string;
  /** Lessons this item belongs to. An item may be reused across lessons. */
  lessons: string[];
}

export interface LessonSection {
  heading: string;
  body: string;
  /** Optional worked figure rendered as a callout. */
  callout?: string;
}

export interface Lesson {
  id: string;
  skill: SkillId;
  title: string;
  summary: string;
  /** Lesson ids that should be mastered first. Forms a DAG. */
  prerequisites: string[];
  /** Rough reading time, minutes. */
  minutes: number;
  sections: LessonSection[];
  /** Item ids drilled after the reading. */
  items: string[];
}

/**
 * Bayesian Knowledge Tracing state for one skill, plus the spaced-repetition
 * fields. `known` is P(the learner has mastered this skill), the number every
 * recommendation in the app is ultimately derived from.
 */
export interface SkillState {
  /** P(mastered), 0-1. */
  known: number;
  /** Total items answered in this skill. Drives the confidence readout. */
  attempts: number;
  correct: number;
  /** SM-2 ease factor. Starts at 2.5, floored at 1.3. */
  ease: number;
  /** Current review interval in days. 0 means never reviewed. */
  intervalDays: number;
  /** ISO date the skill next falls due for review. */
  dueAt: string | null;
  /** ISO timestamp of the last answered item. */
  lastSeenAt: string | null;
}

export interface LessonState {
  /** Completed the reading. */
  read: boolean;
  /** Best practice score on this lesson, 0-1. */
  bestScore: number;
  attempts: number;
  completedAt: string | null;
}

/** One paper-trading position. */
export interface Holding {
  ticker: string;
  shares: number;
  /** Volume-weighted average cost per share. */
  costBasis: number;
}

export interface Trade {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  /** Simulated trading day index the trade was filled on. */
  day: number;
  at: string;
}

export interface PortfolioState {
  cash: number;
  holdings: Holding[];
  trades: Trade[];
  /** How far into the simulated series the learner has advanced. */
  day: number;
}

export interface BudgetState {
  monthlyIncome: number;
  /** Category id to monthly dollars. */
  allocations: Record<string, number>;
}

export interface Reply {
  id: string;
  author: string;
  level: number;
  body: string;
  at: string;
  /** Set on replies the learner wrote, so they render as theirs. */
  mine?: boolean;
}

export interface Thread {
  id: string;
  skill: SkillId;
  author: string;
  level: number;
  title: string;
  body: string;
  at: string;
  replies: Reply[];
}

/** The complete persisted state. Everything else is derived. */
export interface LearnerState {
  /** Bumped when the shape changes, so a stale save is discarded not crashed. */
  version: number;
  displayName: string;
  goal: GoalId | null;
  /** Set once the diagnostic has been taken. */
  diagnosticDone: boolean;
  skills: Record<SkillId, SkillState>;
  lessons: Record<string, LessonState>;
  xp: number;
  /** ISO dates, most recent last. Drives the streak count. */
  activeDays: string[];
  portfolio: PortfolioState;
  budget: BudgetState;
  threads: Thread[];
  /** Ids of items answered, so the diagnostic is not re-served as practice. */
  seenItems: string[];
}

/** A scheduler recommendation, carrying the reason it was chosen. */
export interface Recommendation {
  lesson: Lesson;
  /** Higher is more urgent. */
  score: number;
  kind: "review" | "next" | "goal" | "foundation";
  /** Plain-language justification shown in the UI. */
  reasons: string[];
}
