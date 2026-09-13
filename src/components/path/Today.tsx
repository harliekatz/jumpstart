"use client";

/**
 * The home screen. What to study next, and the reasons behind the ordering.
 *
 * Each recommendation card carries the terms that produced its score, including
 * the mastery estimate, how many lessons it unblocks and whether a review is
 * due, so a learner can judge the suggestion rather than take it on trust.
 */
import { ArrowRight, Clock, Flame, Layers, Sparkles, Target } from "lucide-react";
import { SKILLS } from "@/lib/curriculum";
import { curriculumProgress } from "@/lib/scheduler";
import { percent, titleCase } from "@/lib/format";
import { MasteryRow, Meter, Stat } from "@/components/ui/primitives";
import { SKILL_IDS } from "@/lib/types";
import type { LearnerState, Recommendation, SkillId } from "@/lib/types";
import type { LevelProgress } from "@/lib/progress";

const KIND_META: Record<
  Recommendation["kind"],
  { label: string; icon: typeof Clock; tone: string }
> = {
  review: { label: "Due for review", icon: Clock, tone: "is-amber" },
  foundation: { label: "Foundation", icon: Layers, tone: "is-blue" },
  goal: { label: "Matches your goal", icon: Target, tone: "is-green" },
  next: { label: "Next up", icon: Sparkles, tone: "" },
};

export function Today({
  state,
  recommendations,
  level,
  streak,
  due,
  onOpenLesson,
  onBrowse,
}: {
  state: LearnerState;
  recommendations: Recommendation[];
  level: LevelProgress;
  streak: number;
  due: SkillId[];
  onOpenLesson: (lessonId: string) => void;
  onBrowse: () => void;
}) {
  const [primary, ...rest] = recommendations;
  const progress = curriculumProgress(state);
  const greeting = state.displayName ? `Welcome back, ${state.displayName}` : "Welcome back";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{greeting}</h1>
          <p>
            {due.length > 0
              ? `${due.length} ${due.length === 1 ? "track is" : "tracks are"} due for review. Reviews come first, because spacing is what makes the material stick.`
              : "Nothing is overdue. This is what the scheduler suggests next, and why."}
          </p>
        </div>
      </div>

      <div className="grid-4">
        <Stat label="Level" value={level.level} note={`${level.xpForNext} XP to next`} />
        <Stat
          label="Streak"
          value={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {streak}
              {streak > 0 && <Flame size={18} color="var(--amber-400)" aria-hidden="true" />}
            </span>
          }
          note={streak === 0 ? "Start one today" : streak === 1 ? "day" : "days"}
        />
        <Stat label="Curriculum" value={percent(progress)} note="of 20 lessons complete" />
        <Stat
          label="Due for review"
          value={due.length}
          note={due.length === 0 ? "All caught up" : due.map((skill) => SKILLS[skill].name).join(", ")}
        />
      </div>

      {primary && (
        <div className="section">
          <div className="section-head">
            <h2>Start here</h2>
          </div>
          <RecommendationCard
            recommendation={primary}
            primary
            onOpen={() => onOpenLesson(primary.lesson.id)}
          />
        </div>
      )}

      {rest.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h2>Also queued</h2>
            <button type="button" className="button ghost small" onClick={onBrowse}>
              Browse all lessons
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="grid-2">
            {rest.map((recommendation) => (
              <RecommendationCard
                key={recommendation.lesson.id}
                recommendation={recommendation}
                onOpen={() => onOpenLesson(recommendation.lesson.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-head">
          <h2>Where you stand</h2>
          <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
            Estimated probability you have mastered each track
          </span>
        </div>
        <div className="card">
          <div className="stack-tight">
            {SKILL_IDS.map((skill) => (
              <MasteryRow key={skill} skill={skill} state={state.skills[skill]} />
            ))}
          </div>
          <p style={{ marginTop: "var(--s4)", fontSize: "var(--text-sm)" }}>
            These are Bayesian estimates rather than percent correct. Answering a hard
            question correctly moves them further than an easy one. The label beside each
            figure says how much evidence it rests on.
          </p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  primary,
  onOpen,
}: {
  recommendation: Recommendation;
  primary?: boolean;
  onOpen: () => void;
}) {
  const { lesson, kind, reasons } = recommendation;
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      className={`recommendation ${primary ? "is-primary" : ""}`}
      onClick={onOpen}
    >
      <div className="row">
        <span className={`badge ${meta.tone}`}>
          <Icon size={11} aria-hidden="true" />
          {meta.label}
        </span>
        <span className="badge">{SKILLS[lesson.skill].name}</span>
        <span className="badge">{lesson.minutes} min</span>
      </div>

      <div>
        <div className="recommendation-title">{lesson.title}</div>
        <div className="recommendation-summary">{lesson.summary}</div>
      </div>

      <div className="why">
        <div className="why-label">Why this, now</div>
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>
              <span className="why-dot" aria-hidden="true" />
              {titleCase(reason)}
            </li>
          ))}
        </ul>
      </div>

      {primary && (
        <div className="row" style={{ marginTop: "var(--s1)" }}>
          <span className="button primary" aria-hidden="true">
            Open lesson
            <ArrowRight size={15} />
          </span>
        </div>
      )}
    </button>
  );
}

export function TrackProgress({ state }: { state: LearnerState }) {
  return (
    <div className="grid-4">
      {SKILL_IDS.map((skill) => (
        <div className="stat" key={skill}>
          <div className="stat-label">{SKILLS[skill].name}</div>
          <div className="stat-value" style={{ fontSize: "var(--text-lg)" }}>
            {percent(state.skills[skill].known)}
          </div>
          <div style={{ marginTop: "var(--s2)" }}>
            <Meter value={state.skills[skill].known} />
          </div>
        </div>
      ))}
    </div>
  );
}
