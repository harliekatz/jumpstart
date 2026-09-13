"use client";

/**
 * The progress screen, which doubles as the app explaining itself.
 *
 * It shows the mastery estimate, the evidence behind it, and the review clock
 * per track, then names the model and its parameters. A learner being scored by
 * a model should be able to see what the model is; a hiring reader gets the
 * design rationale without reading the source.
 */
import { Clock, RotateCcw } from "lucide-react";
import { GOALS, LESSONS, SKILLS } from "@/lib/curriculum";
import { BKT, MASTERY_THRESHOLD, confidenceLabel, daysOverdue } from "@/lib/mastery";
import { isComplete } from "@/lib/scheduler";
import { xpForLevel } from "@/lib/progress";
import { percent } from "@/lib/format";
import { Meter, Stat } from "@/components/ui/primitives";
import { SKILL_IDS } from "@/lib/types";
import type { LevelProgress } from "@/lib/progress";
import type { LearnerState } from "@/lib/types";

export function Progress({
  state,
  level,
  streak,
  onReset,
}: {
  state: LearnerState;
  level: LevelProgress;
  streak: number;
  onReset: () => void;
}) {
  const goal = GOALS.find((candidate) => candidate.id === state.goal);
  const done = LESSONS.filter((lesson) => isComplete(lesson.id, state)).length;
  const today = new Date();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Progress</h1>
          <p>
            What the app thinks you know, how much evidence that rests on, and when each
            track next falls due.
          </p>
        </div>
        <button type="button" className="button danger small" onClick={onReset}>
          <RotateCcw size={14} aria-hidden="true" />
          Reset everything
        </button>
      </div>

      <div className="grid-4">
        <Stat label="Level" value={level.level} note={`${state.xp} XP total`} />
        <Stat label="Streak" value={streak} note={streak === 1 ? "day" : "days"} />
        <Stat label="Lessons" value={`${done}/${LESSONS.length}`} note="complete" />
        <Stat
          label="Goal"
          value={<span style={{ fontSize: "var(--text-md)" }}>{goal?.name ?? "Not set"}</span>}
          note={goal ? "Weights your path" : undefined}
        />
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Mastery by track</h2>
        </div>

        <div className="card">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Track</th>
                  <th style={{ width: 160 }}>Estimate</th>
                  <th className="num">P(mastered)</th>
                  <th className="num">Answered</th>
                  <th className="num">Correct</th>
                  <th>Confidence</th>
                  <th>Next review</th>
                </tr>
              </thead>
              <tbody>
                {SKILL_IDS.map((skill) => {
                  const entry = state.skills[skill];
                  const overdue = entry.dueAt ? daysOverdue(entry, today) : null;

                  return (
                    <tr key={skill}>
                      <td>
                        <span style={{ color: "var(--text)", fontWeight: 550 }}>
                          {SKILLS[skill].name}
                        </span>
                        <div className="muted" style={{ fontSize: "var(--text-xs)" }}>
                          {SKILLS[skill].blurb}
                        </div>
                      </td>
                      <td>
                        <Meter value={entry.known} />
                      </td>
                      <td className="num tabular">{percent(entry.known)}</td>
                      <td className="num tabular">{entry.attempts}</td>
                      <td className="num tabular">
                        {entry.attempts === 0 ? "—" : percent(entry.correct / entry.attempts)}
                      </td>
                      <td>
                        <span className="badge">{confidenceLabel(entry)}</span>
                      </td>
                      <td>
                        {entry.dueAt === null ? (
                          <span className="muted">Not scheduled</span>
                        ) : overdue !== null && overdue >= 0 ? (
                          <span className="badge is-amber">
                            <Clock size={11} aria-hidden="true" />
                            {overdue === 0 ? "Due today" : `${overdue}d overdue`}
                          </span>
                        ) : (
                          <span className="tabular">{entry.dueAt}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>How these numbers are produced</h2>
        </div>

        <div className="grid-2">
          <div className="card">
            <h3 style={{ marginBottom: "var(--s3)" }}>Mastery</h3>
            <p style={{ fontSize: "var(--text-sm)" }}>
              Bayesian Knowledge Tracing. Each answer updates the probability you have
              mastered the track, weighted by how hard the question was. A correct answer
              on a hard item is stronger evidence than one on an easy item, because the
              chance of guessing it is lower.
            </p>
            <table className="table" style={{ marginTop: "var(--s3)" }}>
              <tbody>
                <tr>
                  <td>Prior P(known)</td>
                  <td className="num tabular">{BKT.pInit}</td>
                </tr>
                <tr>
                  <td>Learn rate per attempt</td>
                  <td className="num tabular">{BKT.pTransit}</td>
                </tr>
                <tr>
                  <td>Slip / guess at medium difficulty</td>
                  <td className="num tabular">
                    {BKT.baseSlip} / {BKT.baseGuess}
                  </td>
                </tr>
                <tr>
                  <td>Counts as mastered at</td>
                  <td className="num tabular">{percent(MASTERY_THRESHOLD)}</td>
                </tr>
              </tbody>
            </table>
            <p style={{ marginTop: "var(--s3)", fontSize: "var(--text-sm)" }}>
              The placement test runs with the learn rate set to zero, so those twelve
              answers measure rather than teach. Practice keeps it on, because you read the
              explanation after each question.
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: "var(--s3)" }}>Review timing</h3>
            <p style={{ fontSize: "var(--text-sm)" }}>
              An SM-2 style schedule. Pass a track and the gap before its next review
              stretches by the ease factor; fail and it resets to tomorrow. The intervals
              walk 1 day, then 4, then multiply.
            </p>
            <p style={{ marginTop: "var(--s3)", fontSize: "var(--text-sm)" }}>
              Overdue reviews outrank everything else on the Today screen. Spacing is the
              part of this that has the strongest evidence behind it, and it is also the
              part people skip, so the app does not let it sit quietly at the bottom of a
              list.
            </p>

            <h4 style={{ marginTop: "var(--s4)", marginBottom: "var(--s2)" }}>Level curve</h4>
            <table className="table">
              <tbody>
                {[2, 5, 10, 15].map((target) => (
                  <tr key={target}>
                    <td>Level {target}</td>
                    <td className="num tabular">{xpForLevel(target)} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="disclosure">
        <strong>About this project.</strong> JumpStart began as a student venture built in
        one month at the European Innovation Academy in Porto. This is a personal
        reconstruction of that product as a working application: the adaptive engine, the
        market simulator and the budget tools are real and implemented here, while the
        original was a pitch and a clickable prototype. All figures, prices, community
        posts and cohort data are synthetic. Nothing in this app is financial advice, and
        no real market data is used.
      </div>
    </div>
  );
}
