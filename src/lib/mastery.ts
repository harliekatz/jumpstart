/**
 * Mastery estimation.
 *
 * The app tracks P(the learner has mastered this skill) with Bayesian Knowledge
 * Tracing, the standard model in intelligent tutoring systems (Corbett &
 * Anderson, 1995). Four parameters:
 *
 *   pInit     prior probability of mastery before any evidence
 *   pTransit  probability of learning the skill on any given attempt
 *   pSlip     probability of getting an item wrong while having mastered it
 *   pGuess    probability of getting an item right without having mastered it
 *
 * Why this rather than percent-correct: percent-correct treats the tenth answer
 * like the first and cannot distinguish "got it right by luck on an easy item"
 * from "got it right on a hard one". BKT separates the observation from the
 * latent skill, which is exactly the distinction the learning path needs to make.
 *
 * Item difficulty modulates slip and guess. A hard item is easier to slip on and
 * harder to guess, so a correct answer on a hard item moves the estimate more
 * than a correct answer on an easy one. That is the whole reason the diagnostic
 * can be twelve questions instead of forty.
 */
import type { SkillState } from "./types";

export const BKT = {
  pInit: 0.2,
  pTransit: 0.18,
  /** Slip and guess at difficulty 0.5. Adjusted per item below. */
  baseSlip: 0.1,
  baseGuess: 0.25,
} as const;

/** Mastery at or above this counts as "known" for prerequisite purposes. */
export const MASTERY_THRESHOLD = 0.75;

export function initialSkillState(): SkillState {
  return {
    known: BKT.pInit,
    attempts: 0,
    correct: 0,
    ease: 2.5,
    intervalDays: 0,
    dueAt: null,
    lastSeenAt: null,
  };
}

/**
 * Slip rises and guess falls as an item gets harder.
 *
 * Guess is also floored by the number of choices: with four options, pure
 * chance already yields 0.25, so claiming a lower guess rate would overstate
 * what a correct answer tells us.
 */
export function itemParameters(difficulty: number, choiceCount = 4) {
  const d = clamp(difficulty, 0, 1);
  const slip = clamp(BKT.baseSlip + (d - 0.5) * 0.16, 0.02, 0.35);
  const chance = choiceCount > 0 ? 1 / choiceCount : 0.25;
  const guess = clamp(BKT.baseGuess - (d - 0.5) * 0.22, 0.05, 0.5);
  return { slip, guess: Math.max(guess, chance * 0.6) };
}

/**
 * One BKT update.
 *
 * Step 1 is the posterior given the observation (Bayes). Step 2 adds the chance
 * that the attempt itself taught the learner something. Both steps matter:
 * without step 2 a learner who answers wrong could never recover, which is wrong
 * for a tutor that shows the explanation straight afterwards.
 *
 * `transit` is a parameter rather than a constant because assessment and
 * practice are different situations. During the diagnostic no teaching happens —
 * no explanations are shown until the end — so transit is zero and the update is
 * pure measurement. During practice the learner reads the explanation after each
 * answer, so the standard learning rate applies.
 *
 * This distinction is not cosmetic. With transit fixed at 0.18, three wrong
 * answers in a row still leave the estimate near 0.2, because the model keeps
 * assuming the learner is picking it up as they go. A diagnostic that cannot
 * report low mastery is not a diagnostic.
 */
export function updateKnown(
  prior: number,
  correct: boolean,
  difficulty: number,
  choiceCount = 4,
  transit: number = BKT.pTransit,
): number {
  const { slip, guess } = itemParameters(difficulty, choiceCount);
  const p = clamp(prior, 0.001, 0.999);

  const posterior = correct
    ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess)
    : (p * slip) / (p * slip + (1 - p) * (1 - guess));

  return clamp(posterior + (1 - posterior) * clamp(transit, 0, 1), 0.001, 0.999);
}

/**
 * How much to trust the estimate.
 *
 * BKT gives a probability but not an error bar. Rather than invent one, this
 * reports evidence volume on a saturating curve: a learner who has answered
 * twelve items in a track has a well-supported estimate, one who has answered
 * two does not. The UI shows this as "low / moderate / high confidence" so the
 * number is never presented as more certain than it is.
 */
export function confidence(state: SkillState): number {
  return 1 - Math.exp(-state.attempts / 6);
}

export function confidenceLabel(state: SkillState): "low" | "moderate" | "high" {
  const c = confidence(state);
  if (c < 0.45) return "low";
  if (c < 0.8) return "moderate";
  return "high";
}

/**
 * SM-2 style review scheduling.
 *
 * `quality` is the practice score on the session, 0-1, mapped onto SM-2's 0-5
 * scale. Anything below 0.6 resets the interval: a skill you just failed is not
 * a skill to revisit in three weeks. The ease factor floor of 1.3 is from the
 * original algorithm and stops a repeatedly-failed skill from collapsing to
 * daily forever.
 */
export function scheduleReview(
  state: SkillState,
  quality: number,
  now: Date,
): Pick<SkillState, "ease" | "intervalDays" | "dueAt"> {
  const q = clamp(quality, 0, 1) * 5;

  const ease = Math.max(
    1.3,
    state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  let intervalDays: number;
  if (q < 3) {
    intervalDays = 1;
  } else if (state.intervalDays === 0) {
    intervalDays = 1;
  } else if (state.intervalDays === 1) {
    intervalDays = 4;
  } else {
    intervalDays = Math.round(state.intervalDays * ease);
  }

  const due = new Date(now);
  due.setDate(due.getDate() + intervalDays);

  return { ease, intervalDays, dueAt: due.toISOString().slice(0, 10) };
}

/** Days overdue. Negative means not yet due; 0 means due today. */
export function daysOverdue(state: SkillState, today: Date): number {
  if (!state.dueAt) return 0;
  const due = new Date(`${state.dueAt}T00:00:00Z`).getTime();
  const ref = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((ref - due) / 86_400_000);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
