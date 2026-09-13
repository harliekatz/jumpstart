/**
 * Budget arithmetic.
 *
 * Everything here is a pure function of the allocation map, so the whole panel
 * recomputes from state on every keystroke with no effects and no cached
 * derivations to go stale.
 *
 * The projection deliberately shows nominal and real side by side. A savings
 * target quoted in nominal dollars thirty years out reads as a far better
 * outcome than it is, and a financial-literacy product that only shows the
 * flattering number is teaching the wrong habit.
 */

export type CategoryKind = "need" | "want" | "save";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  hint: string;
}

export const CATEGORIES: Category[] = [
  { id: "housing", name: "Housing", kind: "need", hint: "Rent or mortgage, plus utilities" },
  { id: "food", name: "Groceries", kind: "need", hint: "Food eaten at home" },
  { id: "transport", name: "Transport", kind: "need", hint: "Car payment, fuel, transit" },
  { id: "insurance", name: "Insurance", kind: "need", hint: "Health, auto, renters" },
  { id: "minimums", name: "Debt minimums", kind: "need", hint: "Required payments only" },
  { id: "dining", name: "Dining & going out", kind: "want", hint: "Restaurants, bars, coffee" },
  { id: "shopping", name: "Shopping", kind: "want", hint: "Clothes, gear, gifts" },
  { id: "subscriptions", name: "Subscriptions", kind: "want", hint: "Streaming, apps, memberships" },
  { id: "travel", name: "Travel", kind: "want", hint: "Trips and the flights home" },
  { id: "emergency", name: "Emergency fund", kind: "save", hint: "Until you hit your target months" },
  { id: "retirement", name: "Retirement", kind: "save", hint: "Employer plan and IRA contributions" },
  { id: "extra-debt", name: "Extra debt payment", kind: "save", hint: "Above the minimum" },
];

export const CATEGORIES_BY_ID: ReadonlyMap<string, Category> = new Map(
  CATEGORIES.map((category) => [category.id, category]),
);

/** A plausible starting point for an early-career budget, not a recommendation. */
export function defaultBudget(): { monthlyIncome: number; allocations: Record<string, number> } {
  return {
    monthlyIncome: 4200,
    allocations: {
      housing: 1650,
      food: 400,
      transport: 260,
      insurance: 180,
      minimums: 150,
      dining: 320,
      shopping: 180,
      subscriptions: 60,
      travel: 150,
      emergency: 400,
      retirement: 350,
      "extra-debt": 100,
    },
  };
}

export interface BudgetSummary {
  income: number;
  needs: number;
  wants: number;
  savings: number;
  allocated: number;
  /** Income minus everything allocated. Negative means over-committed. */
  unallocated: number;
  /** Each kind as a share of income, 0-1. */
  shares: Record<CategoryKind, number>;
  savingsRate: number;
}

export function summarize(
  monthlyIncome: number,
  allocations: Record<string, number>,
): BudgetSummary {
  const totals: Record<CategoryKind, number> = { need: 0, want: 0, save: 0 };

  for (const [id, amount] of Object.entries(allocations)) {
    const category = CATEGORIES_BY_ID.get(id);
    if (!category) continue;
    const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    totals[category.kind] += value;
  }

  const allocated = totals.need + totals.want + totals.save;
  const income = Math.max(0, monthlyIncome);
  const share = (value: number) => (income === 0 ? 0 : value / income);

  return {
    income,
    needs: totals.need,
    wants: totals.want,
    savings: totals.save,
    allocated,
    unallocated: income - allocated,
    shares: { need: share(totals.need), want: share(totals.want), save: share(totals.save) },
    savingsRate: share(totals.save),
  };
}

/** The 50/30/20 comparison, reported as signed gaps in percentage points. */
export function frameworkGap(summary: BudgetSummary): Record<CategoryKind, number> {
  return {
    need: summary.shares.need - 0.5,
    want: summary.shares.want - 0.3,
    save: summary.shares.save - 0.2,
  };
}

/**
 * Months of essential spending the emergency fund line will cover, and how long
 * it takes to get there. Essentials are the `need` categories, which is what the
 * emergency-fund lesson says to size against.
 */
export function emergencyRunway(
  summary: BudgetSummary,
  allocations: Record<string, number>,
  targetMonths = 3,
): { monthlyEssentials: number; target: number; monthlyContribution: number; monthsToTarget: number | null } {
  const monthlyEssentials = summary.needs;
  const target = monthlyEssentials * targetMonths;
  const monthlyContribution = Math.max(0, allocations.emergency ?? 0);

  return {
    monthlyEssentials,
    target,
    monthlyContribution,
    monthsToTarget:
      monthlyContribution <= 0 ? null : Math.ceil(target / monthlyContribution),
  };
}

/**
 * Future value of a monthly contribution.
 *
 *   FV = P · ((1 + r)^n − 1) / r
 *
 * with r the monthly rate and n the number of months. Contributions are treated
 * as arriving at the end of each month (an ordinary annuity), which is the
 * conservative convention and matches how a payroll deduction actually lands.
 */
export function futureValue(
  monthlyContribution: number,
  annualRate: number,
  years: number,
): number {
  const months = Math.round(years * 12);
  const monthlyRate = annualRate / 12;
  if (months <= 0) return 0;
  if (monthlyRate === 0) return monthlyContribution * months;
  return monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

/** Nominal value discounted back to today's purchasing power. */
export function realValue(nominal: number, inflation: number, years: number): number {
  return nominal / Math.pow(1 + inflation, years);
}

export interface Projection {
  years: number;
  contributed: number;
  nominal: number;
  real: number;
}

export function project(
  monthlyContribution: number,
  annualRate = 0.07,
  inflation = 0.025,
  horizons: number[] = [5, 10, 20, 30],
): Projection[] {
  return horizons.map((years) => {
    const nominal = futureValue(monthlyContribution, annualRate, years);
    return {
      years,
      contributed: monthlyContribution * years * 12,
      nominal,
      real: realValue(nominal, inflation, years),
    };
  });
}
