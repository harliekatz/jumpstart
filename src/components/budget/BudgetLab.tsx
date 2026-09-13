"use client";

/**
 * The budget lab.
 *
 * Edit the numbers and everything downstream recalculates: the 50/30/20
 * comparison, how long the emergency fund takes to fill, and what the savings
 * line is worth in thirty years. The projection shows nominal and inflation-
 * adjusted side by side, because a large nominal figure three decades out is the
 * single most misleading number in consumer finance.
 */
import { AlertTriangle, Check, Wallet } from "lucide-react";
import { CATEGORIES, emergencyRunway, frameworkGap, project } from "@/lib/budget";
import { money, percent } from "@/lib/format";
import { Stat } from "@/components/ui/primitives";
import type { BudgetSummary } from "@/lib/budget";
import type { LearnerState } from "@/lib/types";

const KIND_LABEL = { need: "Needs", want: "Wants", save: "Savings & debt" } as const;
const TARGET = { need: 0.5, want: 0.3, save: 0.2 } as const;

export function BudgetLab({
  state,
  summary,
  onIncome,
  onAllocation,
}: {
  state: LearnerState;
  summary: BudgetSummary;
  onIncome: (value: number) => void;
  onAllocation: (categoryId: string, value: number) => void;
}) {
  const gaps = frameworkGap(summary);
  const runway = emergencyRunway(summary, state.budget.allocations, 3);
  const projections = project(summary.savings);
  const overCommitted = summary.unallocated < 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Budget lab</h1>
          <p>
            Put your real numbers in, or leave the starting figures. Nothing is sent
            anywhere — this runs entirely in your browser and is stored only on this device.
          </p>
        </div>
      </div>

      <div className="grid-4">
        <Stat label="Monthly net" value={money(summary.income)} note="After tax and deductions" />
        <Stat
          label="Unallocated"
          value={money(summary.unallocated)}
          note={overCommitted ? "Over-committed" : "Left to assign"}
          tone={overCommitted ? "loss" : undefined}
        />
        <Stat label="Savings rate" value={percent(summary.savingsRate)} note="Target: 20%" />
        <Stat
          label="Emergency fund"
          value={runway.monthsToTarget === null ? "—" : `${runway.monthsToTarget} mo`}
          note={
            runway.monthsToTarget === null
              ? "Nothing allocated"
              : `to reach ${money(runway.target)}`
          }
        />
      </div>

      <div className="split" style={{ marginTop: "var(--s5)" }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Your allocation</h3>
              <p style={{ fontSize: "var(--text-sm)" }}>Monthly dollars per category.</p>
            </div>
          </div>

          <label className="field" style={{ marginBottom: "var(--s4)" }}>
            <span>Monthly take-home pay</span>
            <input
              className="input"
              inputMode="numeric"
              value={summary.income || ""}
              placeholder="0"
              onChange={(event) =>
                onIncome(Number.parseInt(event.target.value.replace(/[^\d]/g, ""), 10) || 0)
              }
            />
          </label>

          {(["need", "want", "save"] as const).map((kind) => (
            <div key={kind} style={{ marginBottom: "var(--s5)" }}>
              <div className="row" style={{ marginBottom: "var(--s2)" }}>
                <span className="eyebrow">{KIND_LABEL[kind]}</span>
                <span className="badge" style={{ marginLeft: "auto" }}>
                  {percent(summary.shares[kind])} · target {percent(TARGET[kind])}
                </span>
              </div>

              {CATEGORIES.filter((category) => category.kind === kind).map((category) => (
                <div className="budget-row" key={category.id}>
                  <label htmlFor={`budget-${category.id}`}>
                    <span className="budget-name">{category.name}</span>
                    <span className="budget-hint" style={{ display: "block" }}>
                      {category.hint}
                    </span>
                  </label>
                  <input
                    id={`budget-${category.id}`}
                    className="budget-input tabular"
                    inputMode="numeric"
                    value={state.budget.allocations[category.id] ?? 0}
                    onChange={(event) =>
                      onAllocation(
                        category.id,
                        Number.parseInt(event.target.value.replace(/[^\d]/g, ""), 10) || 0,
                      )
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Against 50/30/20</h3>
                <p style={{ fontSize: "var(--text-sm)" }}>
                  A posture, not a rule. If housing makes 50% impossible, keep the ordering
                  and move the proportions.
                </p>
              </div>
            </div>

            <div className="split-bar" role="img" aria-label={`Needs ${percent(summary.shares.need)}, wants ${percent(summary.shares.want)}, savings ${percent(summary.shares.save)} of income.`}>
              {(["need", "want", "save"] as const).map((kind) => {
                const width = Math.max(0, Math.min(1, summary.shares[kind])) * 100;
                return (
                  <span
                    key={kind}
                    className={`split-seg is-${kind}`}
                    style={{ width: `${width}%` }}
                  >
                    {width > 11 ? `${Math.round(width)}%` : ""}
                  </span>
                );
              })}
            </div>

            <div className="legend" style={{ marginTop: "var(--s3)" }}>
              {(["need", "want", "save"] as const).map((kind) => (
                <span className="legend-item" key={kind}>
                  <span className={`legend-swatch`} style={{ background: swatch(kind) }} />
                  {KIND_LABEL[kind]}
                  <span className={gapTone(kind, gaps[kind])}>
                    {gaps[kind] >= 0 ? "+" : ""}
                    {(gaps[kind] * 100).toFixed(0)} pts
                  </span>
                </span>
              ))}
            </div>

            {overCommitted && (
              <div className="notice is-error" style={{ marginTop: "var(--s4)" }}>
                <AlertTriangle size={15} aria-hidden="true" />
                <span>
                  You have allocated {money(Math.abs(summary.unallocated))} more than you
                  take home. Something here is going on a card.
                </span>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>Emergency fund</h3>
                <p style={{ fontSize: "var(--text-sm)" }}>
                  Sized against essentials, not income.
                </p>
              </div>
              <Wallet size={18} color="var(--text-muted)" aria-hidden="true" />
            </div>

            <table className="table">
              <tbody>
                <tr>
                  <td>Monthly essentials</td>
                  <td className="num tabular">{money(runway.monthlyEssentials)}</td>
                </tr>
                <tr>
                  <td>Three-month target</td>
                  <td className="num tabular">{money(runway.target)}</td>
                </tr>
                <tr>
                  <td>Monthly contribution</td>
                  <td className="num tabular">{money(runway.monthlyContribution)}</td>
                </tr>
                <tr>
                  <td>Time to target</td>
                  <td className="num tabular">
                    {runway.monthsToTarget === null
                      ? "Never at this rate"
                      : `${runway.monthsToTarget} months`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>If the savings line keeps running</h3>
                <p style={{ fontSize: "var(--text-sm)" }}>
                  {money(summary.savings)}/month at 7% nominal, 2.5% inflation.
                </p>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Years</th>
                  <th className="num">Paid in</th>
                  <th className="num">Nominal</th>
                  <th className="num">In today&apos;s money</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((row) => (
                  <tr key={row.years}>
                    <td>{row.years}</td>
                    <td className="num tabular">{money(row.contributed)}</td>
                    <td className="num tabular gain">{money(row.nominal)}</td>
                    <td className="num tabular">{money(row.real)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="notice is-good" style={{ marginTop: "var(--s4)" }}>
              <Check size={15} aria-hidden="true" />
              <span>
                The last column is why the third one is misleading on its own. At 2.5%
                inflation, a dollar in thirty years buys about what 48 cents buys today.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function swatch(kind: "need" | "want" | "save"): string {
  if (kind === "need") return "var(--blue-400)";
  if (kind === "want") return "var(--amber-400)";
  return "var(--green-400)";
}

/** Over-spending is bad, over-saving is good. The sign alone does not say which. */
function gapTone(kind: "need" | "want" | "save", gap: number): string {
  if (Math.abs(gap) < 0.02) return "muted";
  if (kind === "save") return gap > 0 ? "gain" : "loss";
  return gap > 0 ? "loss" : "gain";
}
