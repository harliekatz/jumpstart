"use client";

/**
 * Onboarding: name, goal, then the twelve-item placement test.
 *
 * The diagnostic is what lets the app open on something useful instead of
 * lesson one of four. Twelve questions is a deliberate ceiling — long enough for
 * the mastery model to separate the tracks, short enough that people finish it.
 * Nothing is revealed between items, so the answers stay measurement.
 */
import { useMemo, useState } from "react";
import { ArrowRight, Sprout } from "lucide-react";
import { GOALS, SKILLS } from "@/lib/curriculum";
import { DIAGNOSTIC_ITEMS } from "@/lib/items";
import { SKILL_IDS } from "@/lib/types";
import { percent } from "@/lib/format";
import { QuestionCard } from "@/components/ui/QuestionCard";
import { Meter } from "@/components/ui/primitives";
import type { AnsweredItem } from "@/state/reducer";
import type { GoalId, LearnerState } from "@/lib/types";

type Step = "welcome" | "goal" | "quiz" | "results";

export function Onboarding({
  state,
  onName,
  onGoal,
  onFinish,
  onSkip,
}: {
  state: LearnerState;
  onName: (name: string) => void;
  onGoal: (goal: GoalId) => void;
  onFinish: (answers: AnsweredItem[]) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState(state.displayName);
  const [goal, setGoal] = useState<GoalId | null>(state.goal);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});

  const items = DIAGNOSTIC_ITEMS;
  const item = items[index];

  const answers = useMemo(
    (): AnsweredItem[] =>
      items
        .filter((candidate) => picks[candidate.id] !== undefined)
        .map((candidate) => ({
          itemId: candidate.id,
          correct: picks[candidate.id] === candidate.answer,
        })),
    [items, picks],
  );

  const stepIndex = ["welcome", "goal", "quiz", "results"].indexOf(step);

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <div className="onboarding-brand">
          <span className="brand-mark" aria-hidden="true">
            <Sprout size={17} />
          </span>
          <span className="brand-name">JumpStart</span>
        </div>

        <div className="step-dots" role="presentation">
          {[0, 1, 2, 3].map((dot) => (
            <span
              key={dot}
              className={`step-dot ${dot < stepIndex ? "is-done" : dot === stepIndex ? "is-current" : ""}`}
            />
          ))}
        </div>

        {step === "welcome" && (
          <>
            <h1>Financial literacy that adapts to what you already know</h1>
            <p className="onboarding-lede">
              Twelve questions to work out where you stand across budgeting, credit,
              investing and taxes. After that the app builds a path from your answers
              rather than starting everyone at lesson one.
            </p>

            <div className="card">
              <label className="field">
                <span>What should we call you?</span>
                <input
                  className="input"
                  value={name}
                  maxLength={40}
                  placeholder="Your first name"
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && name.trim()) {
                      onName(name.trim());
                      setStep("goal");
                    }
                  }}
                />
              </label>

              <div className="row" style={{ marginTop: "var(--s4)" }}>
                <button
                  type="button"
                  className="button primary"
                  disabled={!name.trim()}
                  onClick={() => {
                    onName(name.trim());
                    setStep("goal");
                  }}
                >
                  Continue
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                <button type="button" className="button ghost" onClick={onSkip}>
                  Skip setup
                </button>
              </div>
            </div>
          </>
        )}

        {step === "goal" && (
          <>
            <h1>What brought you here?</h1>
            <p className="onboarding-lede">
              This weights the recommendations. It does not lock anything — every track
              stays available, and you can change it later.
            </p>

            <div className="choice-grid">
              {GOALS.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={`choice ${goal === candidate.id ? "is-selected" : ""}`}
                  aria-pressed={goal === candidate.id}
                  onClick={() => {
                    setGoal(candidate.id);
                    onGoal(candidate.id);
                  }}
                >
                  <span className="choice-title">{candidate.name}</span>
                  <span className="choice-blurb">{candidate.blurb}</span>
                </button>
              ))}
            </div>

            <div className="row" style={{ marginTop: "var(--s5)" }}>
              <button
                type="button"
                className="button primary"
                disabled={!goal}
                onClick={() => setStep("quiz")}
              >
                Start the placement test
                <ArrowRight size={15} aria-hidden="true" />
              </button>
              <button type="button" className="button ghost" onClick={onSkip}>
                Skip
              </button>
            </div>
          </>
        )}

        {step === "quiz" && item && (
          <>
            <h1 style={{ fontSize: "var(--text-lg)" }}>Placement test</h1>
            <p className="onboarding-lede">
              Answers are not shown as you go — that keeps this a measurement rather
              than a lesson. You will see everything you got wrong at the end.
            </p>

            <QuestionCard
              item={item}
              index={index}
              total={items.length}
              picked={picks[item.id] ?? null}
              reveal={false}
              onPick={(choice) => setPicks((current) => ({ ...current, [item.id]: choice }))}
            />

            <div className="row" style={{ marginTop: "var(--s4)" }}>
              <button
                type="button"
                className="button"
                disabled={index === 0}
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
              >
                Back
              </button>

              {index < items.length - 1 ? (
                <button
                  type="button"
                  className="button primary"
                  disabled={picks[item.id] === undefined}
                  onClick={() => setIndex((current) => current + 1)}
                >
                  Next
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="button primary"
                  disabled={picks[item.id] === undefined}
                  onClick={() => setStep("results")}
                >
                  See where you stand
                </button>
              )}

              <span className="muted" style={{ marginLeft: "auto", fontSize: "var(--text-sm)" }}>
                {answers.length} of {items.length} answered
              </span>
            </div>
          </>
        )}

        {step === "results" && (
          <Results answers={answers} onFinish={() => onFinish(answers)} />
        )}
      </div>
    </div>
  );
}

/**
 * The placement readout.
 *
 * Scores are computed here rather than read back from state, because the state
 * update has not been dispatched yet — the learner sees the result first and
 * commits by continuing. The arithmetic is the same percent-correct the model
 * starts from; the mastery estimates themselves appear once they are in the app.
 */
function Results({
  answers,
  onFinish,
}: {
  answers: AnsweredItem[];
  onFinish: () => void;
}) {
  const byTrack = SKILL_IDS.map((skill) => {
    const relevant = DIAGNOSTIC_ITEMS.filter((item) => item.skill === skill);
    const answered = relevant.filter((item) =>
      answers.some((answer) => answer.itemId === item.id),
    );
    const correct = answered.filter((item) =>
      answers.some((answer) => answer.itemId === item.id && answer.correct),
    ).length;

    return {
      skill,
      correct,
      total: answered.length || relevant.length,
      score: answered.length === 0 ? 0 : correct / answered.length,
    };
  });

  const weakest = [...byTrack].sort((a, b) => a.score - b.score)[0];
  const missed = DIAGNOSTIC_ITEMS.filter((item) =>
    answers.some((answer) => answer.itemId === item.id && !answer.correct),
  );

  return (
    <>
      <h1>Here is where you stand</h1>
      <p className="onboarding-lede">
        {weakest && weakest.score < 0.7
          ? `${SKILLS[weakest.skill].name} is the thinnest track, so your path starts there.`
          : "Solid across the board. Your path will start with the lessons that unlock the most."}
      </p>

      <div className="card">
        <div className="stack-tight">
          {byTrack.map((entry) => (
            <div className="mastery-row" key={entry.skill}>
              <span className="mastery-name">{SKILLS[entry.skill].name}</span>
              <Meter value={entry.score} />
              <span className="mastery-value">
                {entry.correct}/{entry.total} · {percent(entry.score)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {missed.length > 0 && (
        <div className="section">
          <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--s3)" }}>
            What you missed
          </h2>
          <div className="stack">
            {missed.map((item) => (
              <div className="card card-tight" key={item.id}>
                <p style={{ color: "var(--text)", fontWeight: 550, marginBottom: 6 }}>
                  {item.prompt}
                </p>
                <p style={{ fontSize: "var(--text-sm)", marginBottom: 6 }}>
                  <span className="gain">Answer: </span>
                  {item.choices[item.answer]}
                </p>
                <p style={{ fontSize: "var(--text-sm)" }}>{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="button primary block"
        style={{ marginTop: "var(--s5)", minHeight: 44 }}
        onClick={onFinish}
      >
        Build my path
        <ArrowRight size={15} aria-hidden="true" />
      </button>
    </>
  );
}
