/**
 * Paper trading.
 *
 * Holdings use volume-weighted average cost, which is what a broker reports and
 * what keeps unrealized gain meaningful across purchases at different prices. A
 * sell reduces share count and leaves cost basis per share alone.
 *
 * The concentration and sector readouts turn the diversification lesson into
 * feedback on the portfolio the learner actually built.
 */
import {
  INSTRUMENTS_BY_TICKER,
  priceOn,
  realisedVolatility,
  round2,
} from "./market";
import type { Holding, PortfolioState, Trade } from "./types";

export const STARTING_CASH = 10_000;

export function initialPortfolio(): PortfolioState {
  return { cash: STARTING_CASH, holdings: [], trades: [], day: 0 };
}

export interface TradeRequest {
  ticker: string;
  side: "buy" | "sell";
  shares: number;
}

export type TradeResult =
  | { ok: true; state: PortfolioState; trade: Trade }
  | { ok: false; reason: string };

export function executeTrade(
  state: PortfolioState,
  request: TradeRequest,
  now = new Date(),
): TradeResult {
  const { ticker, side, shares } = request;

  if (!INSTRUMENTS_BY_TICKER.has(ticker)) {
    return { ok: false, reason: `Unknown ticker ${ticker}.` };
  }
  if (!Number.isFinite(shares) || shares <= 0) {
    return { ok: false, reason: "Enter a share count above zero." };
  }
  // Whole shares only. Fractional trading is a real product feature but it
  // complicates the cost-basis arithmetic without teaching anything extra here.
  if (!Number.isInteger(shares)) {
    return { ok: false, reason: "Whole shares only in this simulator." };
  }

  const price = priceOn(ticker, state.day);
  if (price <= 0) return { ok: false, reason: "No price available for that day." };

  const existing = state.holdings.find((holding) => holding.ticker === ticker);

  if (side === "buy") {
    const cost = round2(price * shares);
    if (cost > state.cash) {
      return {
        ok: false,
        reason: `That costs ${cost.toFixed(2)} and you have ${state.cash.toFixed(2)} in cash.`,
      };
    }

    const holdings = existing
      ? state.holdings.map((holding) =>
          holding.ticker === ticker
            ? {
                ...holding,
                shares: holding.shares + shares,
                // Volume-weighted average cost.
                costBasis: round2(
                  (holding.costBasis * holding.shares + price * shares) /
                    (holding.shares + shares),
                ),
              }
            : holding,
        )
      : [...state.holdings, { ticker, shares, costBasis: price }];

    const trade = makeTrade(ticker, "buy", shares, price, state.day, now);
    return {
      ok: true,
      trade,
      state: {
        ...state,
        cash: round2(state.cash - cost),
        holdings,
        trades: [trade, ...state.trades],
      },
    };
  }

  if (!existing || existing.shares < shares) {
    return {
      ok: false,
      reason: `You hold ${existing?.shares ?? 0} share${existing?.shares === 1 ? "" : "s"} of ${ticker}.`,
    };
  }

  const proceeds = round2(price * shares);
  const holdings = state.holdings
    .map((holding) =>
      holding.ticker === ticker
        ? { ...holding, shares: holding.shares - shares }
        : holding,
    )
    .filter((holding) => holding.shares > 0);

  const trade = makeTrade(ticker, "sell", shares, price, state.day, now);
  return {
    ok: true,
    trade,
    state: {
      ...state,
      cash: round2(state.cash + proceeds),
      holdings,
      trades: [trade, ...state.trades],
    },
  };
}

function makeTrade(
  ticker: string,
  side: "buy" | "sell",
  shares: number,
  price: number,
  day: number,
  now: Date,
): Trade {
  return {
    id: `${ticker}-${side}-${day}-${now.getTime()}`,
    ticker,
    side,
    shares,
    price,
    day,
    at: now.toISOString(),
  };
}

export interface PositionView {
  holding: Holding;
  price: number;
  value: number;
  cost: number;
  gain: number;
  gainPercent: number;
  /** Share of total portfolio value, 0-1. */
  weight: number;
  annualisedVolatility: number;
  sector: string;
  name: string;
}

export interface PortfolioView {
  positions: PositionView[];
  holdingsValue: number;
  cash: number;
  total: number;
  invested: number;
  gain: number;
  gainPercent: number;
  /** Sector name to share of invested value. */
  sectorWeights: { sector: string; weight: number }[];
  /** Herfindahl index of position weights, 0-1. 1 means a single holding. */
  concentration: number;
  /** Weighted average annualised volatility of the holdings. */
  portfolioVolatility: number;
}

export function viewPortfolio(state: PortfolioState): PortfolioView {
  const priced = state.holdings.map((holding) => {
    const price = priceOn(holding.ticker, state.day);
    const instrument = INSTRUMENTS_BY_TICKER.get(holding.ticker);
    const value = round2(price * holding.shares);
    const cost = round2(holding.costBasis * holding.shares);
    return {
      holding,
      price,
      value,
      cost,
      gain: round2(value - cost),
      gainPercent: cost === 0 ? 0 : (value - cost) / cost,
      weight: 0,
      annualisedVolatility: realisedVolatility(holding.ticker, state.day),
      sector: instrument?.sector ?? "Unknown",
      name: instrument?.name ?? holding.ticker,
    };
  });

  const holdingsValue = round2(priced.reduce((sum, entry) => sum + entry.value, 0));
  const total = round2(holdingsValue + state.cash);

  const positions = priced.map((entry) => ({
    ...entry,
    weight: holdingsValue === 0 ? 0 : entry.value / holdingsValue,
  }));

  const bySector = new Map<string, number>();
  for (const position of positions) {
    bySector.set(position.sector, (bySector.get(position.sector) ?? 0) + position.weight);
  }

  const invested = round2(positions.reduce((sum, entry) => sum + entry.cost, 0));

  return {
    positions,
    holdingsValue,
    cash: state.cash,
    total,
    invested,
    gain: round2(holdingsValue - invested),
    gainPercent: invested === 0 ? 0 : (holdingsValue - invested) / invested,
    sectorWeights: [...bySector.entries()]
      .map(([sector, weight]) => ({ sector, weight }))
      .sort((a, b) => b.weight - a.weight),
    concentration: positions.reduce((sum, entry) => sum + entry.weight ** 2, 0),
    portfolioVolatility: positions.reduce(
      (sum, entry) => sum + entry.weight * entry.annualisedVolatility,
      0,
    ),
  };
}

/**
 * Plain-language feedback on the portfolio's shape.
 *
 * Deliberately not advice about what to buy. It reports what the portfolio
 * already is, in the vocabulary of the investing lessons, so the connection
 * between the reading and the holdings is explicit.
 */
export function portfolioNotes(view: PortfolioView): { tone: "good" | "warn"; text: string }[] {
  const notes: { tone: "good" | "warn"; text: string }[] = [];
  if (view.positions.length === 0) return notes;

  const top = view.sectorWeights[0];
  if (top && top.weight > 0.6 && view.positions.length > 1) {
    notes.push({
      tone: "warn",
      text: `${Math.round(top.weight * 100)}% of your holdings sit in ${top.sector}. Positions in one sector move together, so this is closer to one bet than to ${view.positions.length}.`,
    });
  }

  if (view.concentration > 0.5 && view.positions.length > 1) {
    notes.push({
      tone: "warn",
      text: `Your largest position dominates the portfolio. Concentration index ${view.concentration.toFixed(2)}, where 1.00 would be a single holding.`,
    });
  }

  if (view.positions.length >= 3 && view.sectorWeights.length >= 3 && view.concentration < 0.4) {
    notes.push({
      tone: "good",
      text: `Spread across ${view.sectorWeights.length} sectors with no position dominating. This is what diversification looks like in practice.`,
    });
  }

  if (view.portfolioVolatility > 0.28) {
    notes.push({
      tone: "warn",
      text: `Weighted volatility is ${(view.portfolioVolatility * 100).toFixed(0)}% annualised. Fine for money you will not need for a decade; not for money you need next year.`,
    });
  }

  return notes;
}
