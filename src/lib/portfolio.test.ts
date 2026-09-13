import { describe, expect, it } from "vitest";
import {
  STARTING_CASH,
  executeTrade,
  initialPortfolio,
  portfolioNotes,
  viewPortfolio,
} from "./portfolio";
import { priceOn } from "./market";
import type { PortfolioState } from "./types";

const NOW = new Date("2026-04-01T10:00:00Z");

function buy(state: PortfolioState, ticker: string, shares: number): PortfolioState {
  const result = executeTrade(state, { ticker, side: "buy", shares }, NOW);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

describe("executeTrade", () => {
  it("debits cash by shares times the price on the current day", () => {
    const price = priceOn("BRDX", 0);
    const state = buy(initialPortfolio(), "BRDX", 10);

    expect(state.cash).toBeCloseTo(STARTING_CASH - price * 10, 2);
    expect(state.holdings[0]?.shares).toBe(10);
  });

  it("refuses a buy that exceeds available cash", () => {
    const result = executeTrade(
      initialPortfolio(),
      { ticker: "NOVA", side: "buy", shares: 10_000 },
      NOW,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("cash");
  });

  it("refuses selling more shares than held", () => {
    const state = buy(initialPortfolio(), "BRDX", 5);
    const result = executeTrade(state, { ticker: "BRDX", side: "sell", shares: 6 }, NOW);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("5 shares");
  });

  it("rejects unknown tickers, zero, negative and fractional shares", () => {
    const state = initialPortfolio();
    for (const request of [
      { ticker: "NOPE", side: "buy" as const, shares: 1 },
      { ticker: "BRDX", side: "buy" as const, shares: 0 },
      { ticker: "BRDX", side: "buy" as const, shares: -4 },
      { ticker: "BRDX", side: "buy" as const, shares: 2.5 },
      { ticker: "BRDX", side: "buy" as const, shares: Number.NaN },
    ]) {
      expect(executeTrade(state, request, NOW).ok, JSON.stringify(request)).toBe(false);
    }
  });

  it("uses volume-weighted average cost across purchases at different prices", () => {
    let state = buy(initialPortfolio(), "BRDX", 10);
    const firstPrice = priceOn("BRDX", 0);

    // Advance to a day with a different price, then buy again.
    state = { ...state, day: 60 };
    const secondPrice = priceOn("BRDX", 60);
    state = buy(state, "BRDX", 30);

    const expected = (firstPrice * 10 + secondPrice * 30) / 40;
    expect(state.holdings[0]?.shares).toBe(40);
    expect(state.holdings[0]?.costBasis).toBeCloseTo(expected, 1);
  });

  it("leaves cost basis per share unchanged when part of a position is sold", () => {
    const state = buy(initialPortfolio(), "BRDX", 20);
    const basis = state.holdings[0]?.costBasis;

    const result = executeTrade(state, { ticker: "BRDX", side: "sell", shares: 8 }, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.holdings[0]?.shares).toBe(12);
    expect(result.state.holdings[0]?.costBasis).toBe(basis);
  });

  it("drops the holding entirely when the whole position is sold", () => {
    const state = buy(initialPortfolio(), "BRDX", 6);
    const result = executeTrade(state, { ticker: "BRDX", side: "sell", shares: 6 }, NOW);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.holdings).toHaveLength(0);
  });

  it("conserves value on an immediate round trip", () => {
    const start = initialPortfolio();
    const bought = buy(start, "HRTH", 12);
    const sold = executeTrade(bought, { ticker: "HRTH", side: "sell", shares: 12 }, NOW);

    expect(sold.ok).toBe(true);
    if (sold.ok) expect(sold.state.cash).toBeCloseTo(start.cash, 2);
  });

  it("never mutates the state it was given", () => {
    const start = initialPortfolio();
    const snapshot = JSON.stringify(start);
    buy(start, "BRDX", 3);
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

describe("viewPortfolio", () => {
  it("reports zero gain on the day of purchase", () => {
    const view = viewPortfolio(buy(initialPortfolio(), "BRDX", 10));
    expect(view.gain).toBeCloseTo(0, 2);
    expect(view.positions[0]?.weight).toBeCloseTo(1, 6);
  });

  it("keeps total value equal to cash plus holdings", () => {
    let state = buy(initialPortfolio(), "BRDX", 10);
    state = buy(state, "NOVA", 5);
    state = { ...state, day: 120 };

    const view = viewPortfolio(state);
    expect(view.total).toBeCloseTo(view.cash + view.holdingsValue, 2);
  });

  it("computes position weights that sum to one", () => {
    let state = buy(initialPortfolio(), "BRDX", 10);
    state = buy(state, "BNDX", 20);
    state = buy(state, "MERI", 4);

    const view = viewPortfolio(state);
    const total = view.positions.reduce((sum, entry) => sum + entry.weight, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("scores a single holding at maximum concentration", () => {
    const view = viewPortfolio(buy(initialPortfolio(), "NOVA", 5));
    expect(view.concentration).toBeCloseTo(1, 6);
  });

  it("scores a spread portfolio lower than a concentrated one", () => {
    const concentrated = viewPortfolio(buy(initialPortfolio(), "NOVA", 20));

    let spread = buy(initialPortfolio(), "BRDX", 10);
    spread = buy(spread, "BNDX", 20);
    spread = buy(spread, "HRTH", 10);
    spread = buy(spread, "MERI", 5);

    expect(viewPortfolio(spread).concentration).toBeLessThan(concentrated.concentration);
  });

  it("handles an empty portfolio without dividing by zero", () => {
    const view = viewPortfolio(initialPortfolio());
    expect(view.total).toBe(STARTING_CASH);
    expect(view.gainPercent).toBe(0);
    expect(view.concentration).toBe(0);
    expect(portfolioNotes(view)).toEqual([]);
  });
});

describe("portfolioNotes", () => {
  it("flags a portfolio concentrated in one sector", () => {
    let state = buy(initialPortfolio(), "NOVA", 20);
    state = buy(state, "QNTL", 20);

    const notes = portfolioNotes(viewPortfolio(state));
    expect(notes.some((note) => note.tone === "warn" && note.text.includes("Technology"))).toBe(true);
  });

  it("credits a genuinely spread portfolio", () => {
    let state = buy(initialPortfolio(), "BRDX", 15);
    state = buy(state, "BNDX", 30);
    state = buy(state, "HRTH", 15);
    state = buy(state, "MERI", 8);

    const notes = portfolioNotes(viewPortfolio(state));
    expect(notes.some((note) => note.tone === "good")).toBe(true);
  });
});
