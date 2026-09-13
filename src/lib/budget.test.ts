import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  defaultBudget,
  emergencyRunway,
  frameworkGap,
  futureValue,
  project,
  realValue,
  summarise,
} from "./budget";

describe("summarise", () => {
  it("groups allocations into needs, wants and savings", () => {
    const summary = summarise(4000, { housing: 1500, dining: 300, retirement: 400 });

    expect(summary.needs).toBe(1500);
    expect(summary.wants).toBe(300);
    expect(summary.savings).toBe(400);
    expect(summary.allocated).toBe(2200);
    expect(summary.unallocated).toBe(1800);
  });

  it("reports a negative remainder when over-committed", () => {
    const summary = summarise(2000, { housing: 1800, dining: 400 });
    expect(summary.unallocated).toBe(-200);
  });

  it("ignores unknown category ids rather than miscounting them", () => {
    const summary = summarise(3000, { housing: 1000, "not-a-category": 900 });
    expect(summary.allocated).toBe(1000);
  });

  it("treats negative and non-finite amounts as zero", () => {
    const summary = summarise(3000, { housing: -500, food: Number.NaN, dining: 200 });
    expect(summary.needs).toBe(0);
    expect(summary.wants).toBe(200);
  });

  it("does not divide by zero on zero income", () => {
    const summary = summarise(0, { housing: 1000 });
    expect(summary.shares.need).toBe(0);
    expect(summary.savingsRate).toBe(0);
  });

  it("gives every category a kind, so nothing can be silently dropped", () => {
    for (const category of CATEGORIES) {
      expect(["need", "want", "save"]).toContain(category.kind);
    }
  });
});

describe("frameworkGap", () => {
  it("reports zero gaps on an exact 50/30/20 split", () => {
    const summary = summarise(1000, { housing: 500, dining: 300, retirement: 200 });
    const gap = frameworkGap(summary);

    expect(gap.need).toBeCloseTo(0, 6);
    expect(gap.want).toBeCloseTo(0, 6);
    expect(gap.save).toBeCloseTo(0, 6);
  });

  it("signs the gap so over-spending is positive and under-saving is negative", () => {
    const summary = summarise(1000, { housing: 700, dining: 200, retirement: 100 });
    const gap = frameworkGap(summary);

    expect(gap.need).toBeGreaterThan(0);
    expect(gap.save).toBeLessThan(0);
  });
});

describe("emergencyRunway", () => {
  it("sizes the target against essentials, not income", () => {
    const allocations = { housing: 1600, food: 400, insurance: 200, emergency: 300 };
    const summary = summarise(6000, allocations);
    const runway = emergencyRunway(summary, allocations, 3);

    // Essentials are 2,200 regardless of the 6,000 income.
    expect(runway.monthlyEssentials).toBe(2200);
    expect(runway.target).toBe(6600);
    expect(runway.monthsToTarget).toBe(22);
  });

  it("returns null months when nothing is being contributed", () => {
    const allocations = { housing: 1000, emergency: 0 };
    const summary = summarise(3000, allocations);
    expect(emergencyRunway(summary, allocations).monthsToTarget).toBeNull();
  });

  it("rounds partial months up, because the target is not met until it is met", () => {
    const allocations = { housing: 1000, emergency: 300 };
    const summary = summarise(3000, allocations);
    // 3,000 target / 300 = exactly 10; nudge it to force a fraction.
    const partial = emergencyRunway(summary, { ...allocations, emergency: 290 });
    expect(partial.monthsToTarget).toBe(11);
  });
});

describe("futureValue", () => {
  it("matches the closed-form annuity result", () => {
    // 500/mo, 6% annual, 10 years. FV = 500 * ((1.005^120 - 1) / 0.005).
    const expected = 500 * ((Math.pow(1.005, 120) - 1) / 0.005);
    expect(futureValue(500, 0.06, 10)).toBeCloseTo(expected, 4);
  });

  it("degrades to simple accumulation at a zero rate", () => {
    expect(futureValue(200, 0, 5)).toBe(200 * 60);
  });

  it("returns zero for a zero or negative horizon", () => {
    expect(futureValue(500, 0.07, 0)).toBe(0);
    expect(futureValue(500, 0.07, -3)).toBe(0);
  });

  it("grows super-linearly in time, which is the compounding claim", () => {
    const ten = futureValue(300, 0.07, 10);
    const twenty = futureValue(300, 0.07, 20);
    expect(twenty).toBeGreaterThan(ten * 2);
  });

  it("reproduces the early-versus-late comparison the lesson makes", () => {
    // $300/mo for 10 years, then 30 years of growth with no contributions,
    // against $300/mo for 30 years starting later.
    const earlyContributions = futureValue(300, 0.07, 10);
    const early = earlyContributions * Math.pow(1 + 0.07 / 12, 360);
    const late = futureValue(300, 0.07, 30);

    expect(early).toBeGreaterThan(late);
  });
});

describe("realValue", () => {
  it("discounts nominal dollars back to today's purchasing power", () => {
    expect(realValue(100, 0.025, 0)).toBe(100);
    expect(realValue(100, 0.025, 10)).toBeLessThan(100);
  });

  it("is the exact inverse of inflating forward", () => {
    const nominal = 100 * Math.pow(1.025, 20);
    expect(realValue(nominal, 0.025, 20)).toBeCloseTo(100, 6);
  });
});

describe("project", () => {
  it("returns one row per horizon with real below nominal", () => {
    const rows = project(400);
    expect(rows).toHaveLength(4);

    for (const row of rows) {
      expect(row.nominal).toBeGreaterThan(row.contributed);
      expect(row.real).toBeLessThan(row.nominal);
    }
  });

  it("works from the default budget without throwing", () => {
    const budget = defaultBudget();
    const summary = summarise(budget.monthlyIncome, budget.allocations);
    expect(project(summary.savings).every((row) => Number.isFinite(row.nominal))).toBe(true);
  });
});
