import { describe, expect, it } from "vitest";
import { reduce } from "./reducer";
import { initialState } from "@/lib/storage";
import { MASTERY_THRESHOLD } from "@/lib/mastery";
import { levelForXp, levelProgress, streakLength, xpForLevel } from "@/lib/progress";
import { STARTING_CASH } from "@/lib/portfolio";
import type { LearnerState } from "@/lib/types";

const NOW = new Date("2026-05-04T09:00:00Z");

function run(state: LearnerState, ...actions: Parameters<typeof reduce>[1][]): LearnerState {
  return actions.reduce((current, action) => reduce(current, action).state, state);
}

describe("diagnostic", () => {
  it("moves mastery up in the tracks answered correctly and down elsewhere", () => {
    const next = run(initialState(), {
      type: "submit-diagnostic",
      now: NOW,
      answers: [
        { itemId: "d-i1", correct: true },
        { itemId: "d-i2", correct: true },
        { itemId: "d-i3", correct: true },
        { itemId: "d-t1", correct: false },
        { itemId: "d-t2", correct: false },
        { itemId: "d-t3", correct: false },
      ],
    });

    expect(next.skills.investing.known).toBeGreaterThan(MASTERY_THRESHOLD);
    expect(next.skills.taxes.known).toBeLessThan(0.2);
    expect(next.diagnosticDone).toBe(true);
  });

  it("records every answered item so practice does not re-serve it", () => {
    const next = run(initialState(), {
      type: "submit-diagnostic",
      now: NOW,
      answers: [
        { itemId: "d-b1", correct: true },
        { itemId: "d-c1", correct: false },
      ],
    });

    expect(next.seenItems).toContain("d-b1");
    expect(next.seenItems).toContain("d-c1");
  });

  it("ignores answers referencing items that do not exist", () => {
    const next = run(initialState(), {
      type: "submit-diagnostic",
      now: NOW,
      answers: [{ itemId: "ghost", correct: true }],
    });

    expect(next.skills.budgeting.attempts).toBe(0);
  });

  it("places a learner the same way regardless of the order questions came in", () => {
    // With the learning term switched off, the updates are pure Bayes and
    // therefore commute. That is the property a placement test should have:
    // shuffling the questions must not change where the learner lands.
    const base = initialState();
    const hardFirst = run(base, {
      type: "submit-diagnostic",
      now: NOW,
      answers: [
        { itemId: "d-i3", correct: true },
        { itemId: "d-i1", correct: false },
      ],
    });
    const easyFirst = run(base, {
      type: "submit-diagnostic",
      now: NOW,
      answers: [
        { itemId: "d-i1", correct: false },
        { itemId: "d-i3", correct: true },
      ],
    });

    expect(hardFirst.skills.investing.known).toBeCloseTo(
      easyFirst.skills.investing.known,
      9,
    );
  });

  it("does depend on order during practice, where each attempt also teaches", () => {
    // Practice keeps the learning term on, so the updates no longer commute.
    // This is the intended difference between measuring and tutoring.
    const base = initialState();
    const missLast = run(base, {
      type: "submit-practice",
      lessonId: "compounding",
      now: NOW,
      answers: [
        { itemId: "i1", correct: true },
        { itemId: "i2", correct: false },
      ],
    });
    const missFirst = run(base, {
      type: "submit-practice",
      lessonId: "compounding",
      now: NOW,
      answers: [
        { itemId: "i2", correct: false },
        { itemId: "i1", correct: true },
      ],
    });

    expect(missLast.skills.investing.known).not.toBeCloseTo(
      missFirst.skills.investing.known,
      6,
    );
  });
});

describe("lessons and practice", () => {
  it("awards read XP once, not on every re-read", () => {
    const once = run(initialState(), { type: "mark-read", lessonId: "cash-flow", now: NOW });
    const twice = run(once, { type: "mark-read", lessonId: "cash-flow", now: NOW });
    expect(twice.xp).toBe(once.xp);
  });

  it("schedules a review after passing practice", () => {
    const next = run(initialState(), {
      type: "submit-practice",
      lessonId: "cash-flow",
      now: NOW,
      answers: [
        { itemId: "b1", correct: true },
        { itemId: "b2", correct: true },
      ],
    });

    expect(next.skills.budgeting.dueAt).toBe("2026-05-05");
    expect(next.lessons["cash-flow"]?.bestScore).toBe(1);
  });

  it("keeps the best score rather than the most recent one", () => {
    let state = run(initialState(), {
      type: "submit-practice",
      lessonId: "cash-flow",
      now: NOW,
      answers: [
        { itemId: "b1", correct: true },
        { itemId: "b2", correct: true },
      ],
    });

    state = run(state, {
      type: "submit-practice",
      lessonId: "cash-flow",
      now: NOW,
      answers: [
        { itemId: "b1", correct: false },
        { itemId: "b2", correct: false },
      ],
    });

    expect(state.lessons["cash-flow"]?.bestScore).toBe(1);
    expect(state.lessons["cash-flow"]?.attempts).toBe(2);
  });

  it("does not award the on-time review bonus when nothing was due", () => {
    const fresh = run(initialState(), {
      type: "submit-practice",
      lessonId: "cash-flow",
      now: NOW,
      answers: [
        { itemId: "b1", correct: true },
        { itemId: "b2", correct: true },
      ],
    });

    // Passed and perfect, but no review was outstanding.
    expect(fresh.xp).toBe(40 + 25);
  });

  it("awards the review bonus on a second pass once a review exists", () => {
    const first = run(initialState(), {
      type: "submit-practice",
      lessonId: "cash-flow",
      now: NOW,
      answers: [
        { itemId: "b1", correct: true },
        { itemId: "b2", correct: true },
      ],
    });

    const second = run(first, {
      type: "submit-practice",
      lessonId: "cash-flow",
      now: NOW,
      answers: [
        { itemId: "b1", correct: true },
        { itemId: "b2", correct: true },
      ],
    });

    expect(second.xp - first.xp).toBe(40 + 25 + 30);
  });

  it("ignores an empty practice submission", () => {
    const state = initialState();
    expect(run(state, {
      type: "submit-practice",
      lessonId: "cash-flow",
      now: NOW,
      answers: [],
    })).toEqual(state);
  });

  it("ignores practice for a lesson that does not exist", () => {
    const state = initialState();
    const next = run(state, {
      type: "submit-practice",
      lessonId: "not-a-lesson",
      now: NOW,
      answers: [{ itemId: "b1", correct: true }],
    });
    expect(next).toEqual(state);
  });
});

describe("trading", () => {
  it("surfaces a rejection as an error without changing state", () => {
    const state = initialState();
    const result = reduce(state, {
      type: "trade",
      ticker: "NOVA",
      side: "buy",
      shares: 99_999,
      now: NOW,
    });

    expect(result.error).toBeTruthy();
    expect(result.state.portfolio.cash).toBe(STARTING_CASH);
  });

  it("awards the first-trade bonus exactly once", () => {
    const first = run(initialState(), {
      type: "trade", ticker: "BRDX", side: "buy", shares: 1, now: NOW,
    });
    const second = run(first, {
      type: "trade", ticker: "BRDX", side: "buy", shares: 1, now: NOW,
    });

    expect(first.xp).toBe(25);
    expect(second.xp).toBe(25);
  });

  it("clamps day advancement to the end of the series", () => {
    const next = run(initialState(), { type: "advance-days", days: 10_000 });
    expect(next.portfolio.day).toBe(252);
  });

  it("does not let the day go negative", () => {
    const next = run(initialState(), { type: "advance-days", days: -50 });
    expect(next.portfolio.day).toBe(0);
  });
});

describe("budget actions", () => {
  it("clamps income and allocations to a sane range", () => {
    let state = run(initialState(), { type: "set-income", income: -500 });
    expect(state.budget.monthlyIncome).toBe(0);

    state = run(state, { type: "set-allocation", categoryId: "housing", amount: Number.NaN });
    expect(state.budget.allocations.housing).toBe(0);

    state = run(state, { type: "set-allocation", categoryId: "housing", amount: 99_999_999 });
    expect(state.budget.allocations.housing).toBe(1_000_000);
  });
});

describe("community", () => {
  it("appends a reply marked as the learner's own", () => {
    const next = run(initialState(), {
      type: "post-reply",
      threadId: "th-1",
      body: "  This helped, thanks.  ",
      now: NOW,
    });

    const replies = next.threads.find((thread) => thread.id === "th-1")?.replies ?? [];
    const mine = replies.filter((reply) => reply.mine);

    expect(mine).toHaveLength(1);
    expect(mine[0]?.body).toBe("This helped, thanks.");
  });

  it("ignores an empty or whitespace-only reply", () => {
    const state = initialState();
    const next = run(state, { type: "post-reply", threadId: "th-1", body: "   ", now: NOW });
    expect(next).toEqual(state);
  });
});

describe("progress", () => {
  it("uses a quadratic level curve that starts at zero", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpForLevel(5))).toBe(5);
    expect(levelForXp(xpForLevel(5) - 1)).toBe(4);
  });

  it("reports a fraction through the current level between 0 and 1", () => {
    const progress = levelProgress(xpForLevel(3) + 10);
    expect(progress.level).toBe(3);
    expect(progress.fraction).toBeGreaterThan(0);
    expect(progress.fraction).toBeLessThan(1);
  });

  it("counts consecutive days and breaks on a gap", () => {
    const today = new Date("2026-05-04T12:00:00");
    expect(streakLength(["2026-05-02", "2026-05-03", "2026-05-04"], today)).toBe(3);
    expect(streakLength(["2026-05-01", "2026-05-03", "2026-05-04"], today)).toBe(2);
  });

  it("keeps a streak alive until the end of the following day", () => {
    const today = new Date("2026-05-04T12:00:00");
    expect(streakLength(["2026-05-02", "2026-05-03"], today)).toBe(2);
  });

  it("breaks a streak after two missed days", () => {
    const today = new Date("2026-05-04T12:00:00");
    expect(streakLength(["2026-05-01", "2026-05-02"], today)).toBe(0);
  });

  it("does not double-count a day already recorded", () => {
    let state = run(initialState(), { type: "mark-read", lessonId: "cash-flow", now: NOW });
    state = run(state, { type: "mark-read", lessonId: "brackets", now: NOW });
    expect(state.activeDays).toHaveLength(1);
  });
});

describe("reset", () => {
  it("returns to a clean state", () => {
    let state = run(initialState(), { type: "set-goal", goal: "start-investing" });
    state = run(state, { type: "trade", ticker: "BRDX", side: "buy", shares: 2, now: NOW });
    state = run(state, { type: "reset" });

    expect(state.goal).toBeNull();
    expect(state.xp).toBe(0);
    expect(state.portfolio.cash).toBe(STARTING_CASH);
    expect(state.portfolio.trades).toHaveLength(0);
  });
});
