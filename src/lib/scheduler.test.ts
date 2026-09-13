import { describe, expect, it } from "vitest";
import { LESSONS, LESSONS_BY_ID, validateGraph } from "./curriculum";
import { initialState } from "./storage";
import {
  availableLessons,
  curriculumProgress,
  dueSkills,
  isComplete,
  missingPrerequisites,
  prerequisitesMet,
  recommend,
  unlockCount,
} from "./scheduler";
import type { LearnerState } from "./types";

/** Marks a lesson passed at the given score. */
function withLesson(state: LearnerState, lessonId: string, score: number): LearnerState {
  return {
    ...state,
    lessons: {
      ...state.lessons,
      [lessonId]: { read: true, bestScore: score, attempts: 1, completedAt: null },
    },
  };
}

describe("curriculum graph", () => {
  it("is acyclic and every prerequisite resolves", () => {
    expect(validateGraph()).toEqual([]);
  });

  it("has at least one lesson with no prerequisites per track", () => {
    // Without an entry point, a whole track would be permanently unreachable.
    const tracks = new Set(LESSONS.map((lesson) => lesson.skill));
    for (const track of tracks) {
      const entry = LESSONS.filter(
        (lesson) => lesson.skill === track && lesson.prerequisites.length === 0,
      );
      expect(entry.length, `${track} has no entry lesson`).toBeGreaterThan(0);
    }
  });

  it("references only item ids that exist", async () => {
    const { ITEMS_BY_ID } = await import("./items");
    for (const lesson of LESSONS) {
      for (const itemId of lesson.items) {
        expect(ITEMS_BY_ID.has(itemId), `${lesson.id} -> ${itemId}`).toBe(true);
      }
    }
  });

  it("detects a cycle when one is introduced", () => {
    const broken = [
      { ...LESSONS[0]!, id: "x", prerequisites: ["y"] },
      { ...LESSONS[0]!, id: "y", prerequisites: ["x"] },
    ];
    expect(validateGraph(broken).some((problem) => problem.startsWith("cycle"))).toBe(true);
  });
});

describe("prerequisites", () => {
  it("gates a lesson until its prerequisites are passed", () => {
    const capitalGains = LESSONS_BY_ID.get("capital-gains")!;
    let state = initialState();

    expect(prerequisitesMet(capitalGains, state)).toBe(false);
    expect(missingPrerequisites(capitalGains, state)).toHaveLength(2);

    state = withLesson(state, "deductions-credits", 0.9);
    state = withLesson(state, "risk-return", 0.9);

    expect(prerequisitesMet(capitalGains, state)).toBe(true);
    expect(missingPrerequisites(capitalGains, state)).toHaveLength(0);
  });

  it("does not count a failed attempt as a met prerequisite", () => {
    const capitalGains = LESSONS_BY_ID.get("capital-gains")!;
    let state = initialState();
    state = withLesson(state, "deductions-credits", 0.4);
    state = withLesson(state, "risk-return", 0.4);

    expect(prerequisitesMet(capitalGains, state)).toBe(false);
  });
});

describe("unlockCount", () => {
  it("counts downstream lessons transitively", () => {
    // compounding -> risk-return, fees -> diversification, index-investing,
    // capital-gains, tax-advantaged.
    expect(unlockCount("compounding")).toBeGreaterThan(3);
  });

  it("returns zero for a leaf lesson", () => {
    expect(unlockCount("capital-gains")).toBe(0);
  });
});

describe("recommend", () => {
  it("only ever offers lessons whose prerequisites are met", () => {
    const state = initialState();
    for (const recommendation of recommend(state, new Date(), 20)) {
      expect(prerequisitesMet(recommendation.lesson, state)).toBe(true);
    }
  });

  it("attaches a reason to every recommendation", () => {
    for (const recommendation of recommend(initialState())) {
      expect(recommendation.reasons.length).toBeGreaterThan(0);
    }
  });

  it("puts an overdue review ahead of new material", () => {
    let state = initialState();
    // Finish the investing entry lesson, then let its review fall a week behind.
    state = withLesson(state, "compounding", 1);
    state = {
      ...state,
      skills: {
        ...state.skills,
        investing: { ...state.skills.investing, dueAt: "2026-03-01", intervalDays: 4 },
      },
    };

    const top = recommend(state, new Date("2026-03-08T12:00:00Z"))[0];
    expect(top?.kind).toBe("review");
    expect(top?.lesson.skill).toBe("investing");
  });

  it("weights the track the learner picked as their goal", () => {
    const investingGoal = { ...initialState(), goal: "start-investing" as const };
    const taxGoal = { ...initialState(), goal: "understand-paycheck" as const };

    const investingTop = recommend(investingGoal, new Date(), 3);
    const taxTop = recommend(taxGoal, new Date(), 3);

    expect(investingTop.some((entry) => entry.lesson.skill === "investing")).toBe(true);
    expect(taxTop.some((entry) => entry.lesson.skill === "taxes")).toBe(true);
  });

  it("prefers a foundation lesson over an equally fresh leaf", () => {
    // Both available and both unstudied, but compounding unblocks four lessons
    // and credit-scores unblocks one.
    const state = { ...initialState(), goal: "start-investing" as const };
    const ranked = recommend(state, new Date(), 20);

    const compounding = ranked.findIndex((entry) => entry.lesson.id === "compounding");
    const creditScores = ranked.findIndex((entry) => entry.lesson.id === "credit-scores");

    expect(compounding).toBeGreaterThanOrEqual(0);
    expect(compounding).toBeLessThan(creditScores);
  });

  it("stops offering a finished lesson until its review comes due", () => {
    let state = initialState();
    state = withLesson(state, "cash-flow", 1);

    const ranked = recommend(state, new Date(), 20);
    expect(ranked.some((entry) => entry.lesson.id === "cash-flow")).toBe(false);
  });

  it("returns something for a brand new learner rather than an empty list", () => {
    expect(recommend(initialState()).length).toBeGreaterThan(0);
  });
});

describe("progress reporting", () => {
  it("counts a lesson complete only at 80 percent or better", () => {
    let state = initialState();
    state = withLesson(state, "cash-flow", 0.75);
    expect(isComplete("cash-flow", state)).toBe(false);

    state = withLesson(state, "cash-flow", 0.8);
    expect(isComplete("cash-flow", state)).toBe(true);
  });

  it("reports zero progress for a new learner and rises as lessons finish", () => {
    let state = initialState();
    expect(curriculumProgress(state)).toBe(0);

    state = withLesson(state, "cash-flow", 1);
    expect(curriculumProgress(state)).toBeCloseTo(1 / LESSONS.length, 6);
  });

  it("shrinks the available list as lessons are completed", () => {
    const before = availableLessons(initialState()).length;
    const after = availableLessons(withLesson(initialState(), "cash-flow", 1)).length;
    // One removed for being finished, possibly others added by being unblocked.
    expect(after).not.toBe(before);
  });

  it("lists due skills most overdue first", () => {
    const state: LearnerState = {
      ...initialState(),
      skills: {
        ...initialState().skills,
        budgeting: { ...initialState().skills.budgeting, dueAt: "2026-03-01" },
        taxes: { ...initialState().skills.taxes, dueAt: "2026-03-05" },
      },
    };

    expect(dueSkills(state, new Date("2026-03-10T12:00:00Z"))).toEqual([
      "budgeting",
      "taxes",
    ]);
  });
});
