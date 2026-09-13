import { describe, expect, it } from "vitest";
import {
  BKT,
  MASTERY_THRESHOLD,
  confidenceLabel,
  daysOverdue,
  initialSkillState,
  itemParameters,
  scheduleReview,
  updateKnown,
} from "./mastery";

describe("itemParameters", () => {
  it("makes hard items easier to slip on and harder to guess", () => {
    const easy = itemParameters(0.1);
    const hard = itemParameters(0.9);

    expect(hard.slip).toBeGreaterThan(easy.slip);
    expect(hard.guess).toBeLessThan(easy.guess);
  });

  it("never claims a guess rate far below pure chance", () => {
    // With four choices, chance alone is 0.25. Claiming a much lower guess rate
    // would overstate what a correct answer proves.
    const hard = itemParameters(1, 4);
    expect(hard.guess).toBeGreaterThanOrEqual(0.15);
  });

  it("clamps difficulty outside 0-1 rather than producing nonsense", () => {
    expect(itemParameters(-5).slip).toBeGreaterThan(0);
    expect(itemParameters(9).guess).toBeLessThanOrEqual(0.5);
  });
});

describe("updateKnown", () => {
  it("raises the estimate on a correct answer and lowers it on a wrong one", () => {
    const prior = 0.5;
    expect(updateKnown(prior, true, 0.5)).toBeGreaterThan(prior);
    expect(updateKnown(prior, false, 0.5)).toBeLessThan(prior);
  });

  it("rewards a correct answer on a hard item more than on an easy one", () => {
    const easy = updateKnown(0.4, true, 0.1);
    const hard = updateKnown(0.4, true, 0.9);
    expect(hard).toBeGreaterThan(easy);
  });

  it("penalises a wrong answer on an easy item more than on a hard one", () => {
    const easy = updateKnown(0.6, false, 0.1);
    const hard = updateKnown(0.6, false, 0.9);
    expect(easy).toBeLessThan(hard);
  });

  it("lets a learner recover from a wrong answer, because the attempt also teaches", () => {
    // Without the transit term a learner who answers wrong could never climb
    // back, which is wrong for a tutor that shows the explanation afterwards.
    let p = updateKnown(BKT.pInit, false, 0.5);
    const afterMiss = p;
    for (let i = 0; i < 6; i += 1) p = updateKnown(p, true, 0.5);
    expect(p).toBeGreaterThan(afterMiss);
    expect(p).toBeGreaterThan(MASTERY_THRESHOLD);
  });

  it("stays inside (0, 1) under a long run of identical answers", () => {
    let high = 0.5;
    let low = 0.5;
    for (let i = 0; i < 200; i += 1) {
      high = updateKnown(high, true, 0.5);
      low = updateKnown(low, false, 0.5);
    }
    expect(high).toBeLessThan(1);
    expect(high).toBeGreaterThan(0.9);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(0.5);
  });

  it("converges to a similar place regardless of a wildly wrong prior", () => {
    let fromLow = 0.01;
    let fromHigh = 0.99;
    for (let i = 0; i < 12; i += 1) {
      fromLow = updateKnown(fromLow, true, 0.6);
      fromHigh = updateKnown(fromHigh, true, 0.6);
    }
    // Evidence should dominate the prior. If it did not, a learner mis-placed
    // by the diagnostic would stay mis-placed however well they went on to do.
    expect(Math.abs(fromLow - fromHigh)).toBeLessThan(0.05);
  });
});

describe("confidence", () => {
  it("reports low confidence until enough items have been answered", () => {
    const fresh = initialSkillState();
    expect(confidenceLabel(fresh)).toBe("low");
    expect(confidenceLabel({ ...fresh, attempts: 6 })).toBe("moderate");
    expect(confidenceLabel({ ...fresh, attempts: 20 })).toBe("high");
  });
});

describe("scheduleReview", () => {
  const now = new Date("2026-03-01T12:00:00Z");

  it("sends a failed skill back to tomorrow regardless of prior interval", () => {
    const state = { ...initialSkillState(), intervalDays: 30, ease: 2.6 };
    const review = scheduleReview(state, 0.4, now);

    expect(review.intervalDays).toBe(1);
    expect(review.dueAt).toBe("2026-03-02");
  });

  it("walks a passed skill out 1 -> 4 -> multiplied by ease", () => {
    const first = scheduleReview(initialSkillState(), 1, now);
    expect(first.intervalDays).toBe(1);

    const second = scheduleReview({ ...initialSkillState(), ...first }, 1, now);
    expect(second.intervalDays).toBe(4);

    const third = scheduleReview({ ...initialSkillState(), ...second }, 1, now);
    expect(third.intervalDays).toBeGreaterThan(4);
  });

  it("never drops the ease factor below the SM-2 floor of 1.3", () => {
    let state = initialSkillState();
    for (let i = 0; i < 40; i += 1) {
      state = { ...state, ...scheduleReview(state, 0, now) };
    }
    expect(state.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("raises ease on a perfect session and lowers it on a weak pass", () => {
    const perfect = scheduleReview(initialSkillState(), 1, now);
    const weak = scheduleReview(initialSkillState(), 0.65, now);
    expect(perfect.ease).toBeGreaterThan(weak.ease);
  });
});

describe("daysOverdue", () => {
  it("counts zero on the due date and positive after it", () => {
    const state = { ...initialSkillState(), dueAt: "2026-03-10" };

    expect(daysOverdue(state, new Date("2026-03-10T23:00:00Z"))).toBe(0);
    expect(daysOverdue(state, new Date("2026-03-13T01:00:00Z"))).toBe(3);
    expect(daysOverdue(state, new Date("2026-03-08T12:00:00Z"))).toBe(-2);
  });

  it("returns zero for a skill that has never been scheduled", () => {
    expect(daysOverdue(initialSkillState(), new Date())).toBe(0);
  });
});
