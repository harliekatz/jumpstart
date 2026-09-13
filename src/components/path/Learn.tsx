"use client";

/**
 * The full curriculum, grouped by track.
 *
 * Locked lessons stay visible and name the prerequisite blocking them, so the
 * shape of each track is readable and the next step is actionable.
 */
import { Check, Circle, Lock } from "lucide-react";
import { LESSONS, SKILLS, lessonsForSkill } from "@/lib/curriculum";
import { isComplete, missingPrerequisites, prerequisitesMet } from "@/lib/scheduler";
import { percent } from "@/lib/format";
import { Meter } from "@/components/ui/primitives";
import { SKILL_IDS } from "@/lib/types";
import type { LearnerState } from "@/lib/types";

export function Learn({
  state,
  onOpenLesson,
}: {
  state: LearnerState;
  onOpenLesson: (lessonId: string) => void;
}) {
  const done = LESSONS.filter((lesson) => isComplete(lesson.id, state)).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Learn</h1>
          <p>
            Twenty lessons across four tracks, wired into a prerequisite graph. A locked
            lesson names what is blocking it.
          </p>
        </div>
        <div className="stat" style={{ minWidth: 180 }}>
          <div className="stat-label">Complete</div>
          <div className="stat-value" style={{ fontSize: "var(--text-lg)" }}>
            {done} / {LESSONS.length}
          </div>
          <div style={{ marginTop: "var(--s2)" }}>
            <Meter value={done / LESSONS.length} tone="green" />
          </div>
        </div>
      </div>

      <div className="stack">
        {SKILL_IDS.map((skill) => {
          const lessons = lessonsForSkill(skill);
          const completed = lessons.filter((lesson) => isComplete(lesson.id, state)).length;

          return (
            <section className="track" key={skill} aria-labelledby={`track-${skill}`}>
              <header className="track-head">
                <h3 id={`track-${skill}`}>{SKILLS[skill].name}</h3>
                <span className="badge">
                  {completed}/{lessons.length}
                </span>
                <span className="badge is-green">
                  {percent(state.skills[skill].known)} mastery
                </span>
              </header>

              {lessons.map((lesson) => {
                const unlocked = prerequisitesMet(lesson, state);
                const complete = isComplete(lesson.id, state);
                const blockers = missingPrerequisites(lesson, state);
                const progress = state.lessons[lesson.id];

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    className="lesson-row"
                    disabled={!unlocked}
                    onClick={() => onOpenLesson(lesson.id)}
                    aria-label={
                      unlocked
                        ? `${lesson.title}. ${complete ? "Complete" : "Not complete"}.`
                        : `${lesson.title}. Locked until you finish ${blockers.map((blocker) => blocker.title).join(" and ")}.`
                    }
                  >
                    <span className={`lesson-icon ${complete ? "is-done" : ""}`} aria-hidden="true">
                      {complete ? (
                        <Check size={13} />
                      ) : unlocked ? (
                        <Circle size={9} />
                      ) : (
                        <Lock size={12} />
                      )}
                    </span>

                    <span className="lesson-body">
                      <span className="lesson-title">{lesson.title}</span>
                      <span className="lesson-sub">
                        {unlocked
                          ? lesson.summary
                          : `Locked until you finish ${blockers.map((blocker) => blocker.title).join(" and ")}`}
                      </span>
                    </span>

                    {progress && progress.bestScore > 0 && (
                      <span className="badge">{percent(progress.bestScore)}</span>
                    )}
                    <span className="badge">{lesson.minutes} min</span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
