"use client";

/**
 * Read, then practice, then see what the answers did to the estimate.
 *
 * The summary reports the mastery estimate before and after alongside the raw
 * score, so the effect of item difficulty on the estimate is visible.
 */
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { LESSONS_BY_ID, SKILLS } from "@/lib/curriculum";
import { ITEMS_BY_ID, itemsForLesson } from "@/lib/items";
import { scheduleReview, updateKnown, BKT } from "@/lib/mastery";
import { percent } from "@/lib/format";
import { QuestionCard } from "@/components/ui/QuestionCard";
import { Meter } from "@/components/ui/primitives";
import type { AnsweredItem } from "@/state/reducer";
import type { LearnerState, SkillState } from "@/lib/types";

type Phase = "read" | "practice" | "done";

export function LessonView({
  lessonId,
  state,
  onRead,
  onSubmit,
  onBack,
  onNext,
}: {
  lessonId: string;
  state: LearnerState;
  onRead: () => void;
  onSubmit: (answers: AnsweredItem[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const lesson = LESSONS_BY_ID.get(lessonId);
  const items = useMemo(() => itemsForLesson(lessonId), [lessonId]);

  const [phase, setPhase] = useState<Phase>("read");
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  // Captured before the answers are dispatched, so the before/after comparison
  // is against the estimate the learner actually walked in with.
  const [before] = useState(() => (lesson ? state.skills[lesson.skill].known : 0));

  if (!lesson) {
    return (
      <div className="page">
        <p>That lesson does not exist.</p>
        <button type="button" className="button" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  const item = items[index];
  const answers: AnsweredItem[] = items
    .filter((candidate) => picks[candidate.id] !== undefined)
    .map((candidate) => ({
      itemId: candidate.id,
      correct: picks[candidate.id] === candidate.answer,
    }));

  const allAnswered = answers.length === items.length && items.length > 0;

  return (
    <div className="page">
      <button type="button" className="button ghost small" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true" />
        Back
      </button>

      <div className="page-head" style={{ marginTop: "var(--s4)" }}>
        <div>
          <div className="row" style={{ marginBottom: "var(--s2)" }}>
            <span className="badge is-green">{SKILLS[lesson.skill].name}</span>
            <span className="badge">{lesson.minutes} min read</span>
            <span className="badge">{items.length} practice questions</span>
          </div>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
        </div>
      </div>

      {phase === "read" && (
        <>
          <article className="reader">
            {lesson.sections.map((section) => (
              <section className="reader-section" key={section.heading}>
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
                {section.callout && <div className="callout">{section.callout}</div>}
              </section>
            ))}
          </article>

          <div className="row" style={{ marginTop: "var(--s6)" }}>
            <button
              type="button"
              className="button primary"
              onClick={() => {
                onRead();
                setPhase("practice");
              }}
            >
              Practice this
              <ArrowRight size={15} aria-hidden="true" />
            </button>
            <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
              {items.length} questions. Answers and explanations show as you go.
            </span>
          </div>
        </>
      )}

      {phase === "practice" && item && (
        <>
          <QuestionCard
            item={item}
            index={index}
            total={items.length}
            picked={picks[item.id] ?? null}
            reveal
            onPick={(choice) =>
              setPicks((current) =>
                // Locked once answered: practice reveals the explanation
                // immediately, so a second attempt would not be evidence.
                current[item.id] === undefined ? { ...current, [item.id]: choice } : current,
              )
            }
          />

          <div className="row" style={{ marginTop: "var(--s4)" }}>
            {index < items.length - 1 ? (
              <button
                type="button"
                className="button primary"
                disabled={picks[item.id] === undefined}
                onClick={() => setIndex((current) => current + 1)}
              >
                Next question
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="button primary"
                disabled={!allAnswered}
                onClick={() => {
                  onSubmit(answers);
                  setPhase("done");
                }}
              >
                Finish
                <Check size={15} aria-hidden="true" />
              </button>
            )}
            <span className="muted" style={{ marginLeft: "auto", fontSize: "var(--text-sm)" }}>
              {answers.filter((answer) => answer.correct).length} correct so far
            </span>
          </div>
        </>
      )}

      {phase === "done" && (
        <Summary
          lessonSkill={SKILLS[lesson.skill].name}
          answers={answers}
          items={items.length}
          before={before}
          skillState={state.skills[lesson.skill]}
          onNext={onNext}
          onBack={onBack}
        />
      )}
    </div>
  );
}

function Summary({
  lessonSkill,
  answers,
  items,
  before,
  skillState,
  onNext,
  onBack,
}: {
  lessonSkill: string;
  answers: AnsweredItem[];
  items: number;
  before: number;
  skillState: SkillState;
  onNext: () => void;
  onBack: () => void;
}) {
  const correct = answers.filter((answer) => answer.correct).length;
  const score = items === 0 ? 0 : correct / items;
  const passed = score >= 0.8;

  // Recomputed locally rather than read from state, because the dispatch that
  // applies these answers has not necessarily flushed into this render yet.
  // It replays the same update the reducer runs, using each item's real
  // difficulty — a placeholder difficulty here would misreport the one number
  // this panel exists to explain.
  const after = answers.reduce((estimate, answer) => {
    const item = ITEMS_BY_ID.get(answer.itemId);
    if (!item) return estimate;
    return updateKnown(
      estimate,
      answer.correct,
      item.difficulty,
      item.choices.length,
      BKT.pTransit,
    );
  }, before);

  const nextReview = scheduleReview(skillState, score, new Date());

  const delta = after - before;

  return (
    <div className="stack">
      <div className={`notice ${passed ? "is-good" : "is-warn"}`}>
        <span>
          {passed
            ? `${correct} of ${items} correct. Lesson complete.`
            : `${correct} of ${items} correct. You need 80% to mark this complete. The material stays available and the review comes back sooner.`}
        </span>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>What that did to your {lessonSkill.toLowerCase()} estimate</h3>
            <p style={{ fontSize: "var(--text-sm)" }}>
              The model weighs each answer by the difficulty of the item, so this moves
              differently from a raw score.
            </p>
          </div>
        </div>

        <div className="grid-2">
          <div>
            <div className="eyebrow">Before</div>
            <div className="stat-value" style={{ fontSize: "var(--text-lg)" }}>
              {percent(before)}
            </div>
            <div style={{ marginTop: "var(--s2)" }}>
              <Meter value={before} />
            </div>
          </div>
          <div>
            <div className="eyebrow">After</div>
            {/* The delta is only colored as a gain when the session was also
                passed. A failed session can still raise the estimate, because
                the model treats each attempt as a chance to learn from the
                explanation, and showing that in green reads as praise for a
                result that was not good. */}
            <div
              className={`stat-value ${passed && delta >= 0 ? "gain" : delta < 0 ? "loss" : ""}`}
              style={{ fontSize: "var(--text-lg)" }}
            >
              {percent(after)}
              <span style={{ fontSize: "var(--text-sm)", marginLeft: 6 }}>
                {delta >= 0 ? "+" : ""}
                {(delta * 100).toFixed(1)} pts
              </span>
            </div>
            <div style={{ marginTop: "var(--s2)" }}>
              <Meter value={after} />
            </div>
          </div>
        </div>

        {!passed && delta > 0 && (
          <p style={{ marginTop: "var(--s3)", fontSize: "var(--text-sm)" }}>
            The estimate rose even though the answers were wrong. The model gives
            each attempt a chance of teaching the skill, because you read the
            explanation after every question. Passing the practice is what marks
            the lesson complete.
          </p>
        )}

        <p style={{ marginTop: "var(--s4)", fontSize: "var(--text-sm)" }}>
          Next review scheduled for{" "}
          <strong style={{ color: "var(--text)" }}>{nextReview.dueAt}</strong>, in{" "}
          {nextReview.intervalDays} day{nextReview.intervalDays === 1 ? "" : "s"}. Pass it
          on time and the interval stretches; miss it and it resets to tomorrow.
        </p>
      </div>

      <div className="row">
        <button type="button" className="button primary" onClick={onNext}>
          What is next
          <ArrowRight size={15} aria-hidden="true" />
        </button>
        <button type="button" className="button" onClick={onBack}>
          Back to lessons
        </button>
      </div>
    </div>
  );
}
