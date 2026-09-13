"use client";

/**
 * Routing and wiring.
 *
 * Views are held in state rather than in the URL. The app is a single static
 * page with no server, so real routes would need either a hash scheme or host
 * rewrite rules, and neither buys anything for a tool nobody deep-links into.
 * The one cost is that a refresh returns to Today, which is where a returning
 * learner wants to be anyway.
 */
import { useEffect, useState } from "react";
import { useJumpStart } from "@/state/useJumpStart";
import { Sidebar, type View } from "@/components/shell/Sidebar";
import { Onboarding } from "@/components/diagnostic/Onboarding";
import { Today } from "@/components/path/Today";
import { Learn } from "@/components/path/Learn";
import { LessonView } from "@/components/lesson/LessonView";
import { Simulator } from "@/components/market/Simulator";
import { BudgetLab } from "@/components/budget/BudgetLab";
import { Community } from "@/components/community/Community";
import { Progress } from "@/components/profile/Progress";

export default function App() {
  const app = useJumpStart();
  const [view, setView] = useState<View>("today");
  const [lessonId, setLessonId] = useState<string | null>(null);

  // Any view change starts at the top. Without this, opening a lesson from a
  // scrolled list drops the reader halfway down the article.
  useEffect(() => {
    document.querySelector(".main")?.scrollTo({ top: 0 });
  }, [view, lessonId]);

  if (!app.hydrated) {
    // One frame at most, before the saved state is read. Rendering the shell
    // here would flash a fresh-learner state at somebody who has progress.
    return <div style={{ minHeight: "100dvh", background: "var(--bg)" }} />;
  }

  if (!app.state.diagnosticDone) {
    return (
      <Onboarding
        state={app.state}
        onName={(name) => app.dispatch({ type: "set-name", name })}
        onGoal={(goal) => app.dispatch({ type: "set-goal", goal })}
        onFinish={(answers) =>
          app.dispatch({ type: "submit-diagnostic", answers, now: new Date() })
        }
        onSkip={() =>
          app.dispatch({ type: "submit-diagnostic", answers: [], now: new Date() })
        }
      />
    );
  }

  const openLesson = (id: string) => {
    setLessonId(id);
    setView("learn");
  };

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Sidebar
        view={view}
        setView={(next) => {
          setLessonId(null);
          setView(next);
        }}
        level={app.level}
        streak={app.streak}
        dueCount={app.due.length}
      />

      <main className="main" id="main" tabIndex={-1}>
        {view === "today" && !lessonId && (
          <Today
            state={app.state}
            recommendations={app.recommendations}
            level={app.level}
            streak={app.streak}
            due={app.due}
            onOpenLesson={openLesson}
            onBrowse={() => setView("learn")}
          />
        )}

        {view === "learn" && !lessonId && (
          <Learn state={app.state} onOpenLesson={setLessonId} />
        )}

        {lessonId && (
          <LessonView
            key={lessonId}
            lessonId={lessonId}
            state={app.state}
            onRead={() =>
              app.dispatch({ type: "mark-read", lessonId, now: new Date() })
            }
            onSubmit={(answers) =>
              app.dispatch({ type: "submit-practice", lessonId, answers, now: new Date() })
            }
            onBack={() => setLessonId(null)}
            onNext={() => {
              setLessonId(null);
              setView("today");
            }}
          />
        )}

        {view === "simulator" && !lessonId && (
          <Simulator
            state={app.state}
            view={app.portfolio}
            error={app.error}
            onTrade={(ticker, side, shares) =>
              app.dispatch({ type: "trade", ticker, side, shares, now: new Date() })
            }
            onAdvance={(days) => app.dispatch({ type: "advance-days", days })}
          />
        )}

        {view === "budget" && !lessonId && (
          <BudgetLab
            state={app.state}
            summary={app.budget}
            onIncome={(income) => app.dispatch({ type: "set-income", income })}
            onAllocation={(categoryId, amount) =>
              app.dispatch({ type: "set-allocation", categoryId, amount })
            }
          />
        )}

        {view === "community" && !lessonId && (
          <Community
            state={app.state}
            onReply={(threadId, body) =>
              app.dispatch({ type: "post-reply", threadId, body, now: new Date() })
            }
          />
        )}

        {view === "progress" && !lessonId && (
          <Progress
            state={app.state}
            level={app.level}
            streak={app.streak}
            onReset={app.hardReset}
          />
        )}
      </main>
    </div>
  );
}
