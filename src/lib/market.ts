/**
 * The market simulator.
 *
 * The original pitch deck claimed real-time market data. This build does not
 * have it and does not pretend to: every price here is generated, the tickers
 * are invented, and the app says so wherever a price appears. A portfolio
 * exercise does not need real quotes to teach diversification, and shipping
 * fake "live" data would be the one thing in a finance-education product that
 * is genuinely indefensible.
 *
 * Prices follow geometric Brownian motion, the standard model:
 *
 *   S(t+1) = S(t) · exp((μ − σ²/2)·dt + σ·√dt·Z)
 *
 * μ is annual drift, σ annual volatility, Z a standard normal draw. The −σ²/2
 * correction keeps the expected value equal to S(0)·e^(μt); without it, higher
 * volatility would silently raise expected returns, which is exactly backwards
 * and would teach the wrong lesson.
 *
 * Each instrument carries a market beta, so a single market factor moves
 * everything together and leaves an idiosyncratic remainder. That correlation
 * structure is the point: a learner who buys five high-beta tech names should
 * see their portfolio swing harder than one who spreads across sectors and
 * bonds, because it actually does.
 */
import { gaussian, mulberry32 } from "./rng";

/** Fixed so every learner sees the same series and a test can assert on it. */
export const MARKET_SEED = 20_240_701;
export const TRADING_DAYS = 252;

export interface Instrument {
  ticker: string;
  name: string;
  sector: string;
  /** Starting price on day 0. */
  start: number;
  /** Annualised drift. */
  drift: number;
  /** Annualised idiosyncratic volatility. */
  volatility: number;
  /** Sensitivity to the common market factor. */
  beta: number;
  blurb: string;
}

export const INSTRUMENTS: Instrument[] = [
  {
    ticker: "BRDX",
    name: "Broad Market Index",
    sector: "Index",
    start: 100,
    drift: 0.07,
    volatility: 0.04,
    beta: 1,
    blurb: "Tracks the whole simulated market. The diversified default.",
  },
  {
    ticker: "GLBX",
    name: "Global ex-Domestic Index",
    sector: "Index",
    start: 64,
    drift: 0.06,
    volatility: 0.07,
    beta: 0.78,
    blurb: "Broad exposure outside the home market. Moves with it, not in lockstep.",
  },
  {
    ticker: "BNDX",
    name: "Aggregate Bond Index",
    sector: "Fixed income",
    start: 52,
    drift: 0.03,
    volatility: 0.04,
    beta: 0.18,
    blurb: "Low drift, low volatility, weak link to equities. The ballast.",
  },
  {
    ticker: "NOVA",
    name: "Nova Compute",
    sector: "Technology",
    start: 188,
    drift: 0.14,
    volatility: 0.3,
    beta: 1.55,
    blurb: "High growth, high beta. Amplifies whatever the market does.",
  },
  {
    ticker: "QNTL",
    name: "Quantil Semiconductor",
    sector: "Technology",
    start: 96,
    drift: 0.12,
    volatility: 0.34,
    beta: 1.62,
    blurb: "Same sector as NOVA, so the two move together more than they look like they should.",
  },
  {
    ticker: "VERD",
    name: "Verdant Energy",
    sector: "Energy",
    start: 41,
    drift: 0.05,
    volatility: 0.26,
    beta: 0.92,
    blurb: "Cyclical, with shocks the rest of the market does not share.",
  },
  {
    ticker: "HRTH",
    name: "Hearth Consumer Goods",
    sector: "Consumer staples",
    start: 73,
    drift: 0.05,
    volatility: 0.13,
    beta: 0.61,
    blurb: "Defensive. Lags in a rally and holds up better in a drawdown.",
  },
  {
    ticker: "MERI",
    name: "Meridian Health",
    sector: "Healthcare",
    start: 129,
    drift: 0.08,
    volatility: 0.19,
    beta: 0.84,
    blurb: "Moderate everything. Useful for seeing what an average holding does.",
  },
];

export const INSTRUMENTS_BY_TICKER: ReadonlyMap<string, Instrument> = new Map(
  INSTRUMENTS.map((instrument) => [instrument.ticker, instrument]),
);

export interface Series {
  ticker: string;
  /** One price per trading day, index 0 is day 0. */
  prices: number[];
}

/**
 * Generates the whole market once.
 *
 * The common factor is drawn first, from its own stream, so adding or removing
 * an instrument does not change the others' paths. That property makes the
 * series stable across content edits, which matters because the README quotes
 * specific figures from it.
 */
export function generateMarket(
  seed = MARKET_SEED,
  days = TRADING_DAYS,
): Map<string, Series> {
  const dt = 1 / TRADING_DAYS;
  const sqrtDt = Math.sqrt(dt);

  const factorRng = mulberry32(seed);
  const marketShocks: number[] = [];
  for (let day = 0; day < days; day += 1) {
    marketShocks.push(gaussian(factorRng));
  }

  const out = new Map<string, Series>();

  for (const instrument of INSTRUMENTS) {
    // Per-instrument stream keyed off the ticker, so each path is independent
    // of how many instruments come before it in the list.
    const rng = mulberry32(seed ^ hashTicker(instrument.ticker));
    const prices: number[] = [instrument.start];
    const marketVol = 0.16;

    for (let day = 1; day <= days; day += 1) {
      const shock = marketShocks[day - 1] ?? 0;
      const common = instrument.beta * marketVol * sqrtDt * shock;
      const idiosyncratic = instrument.volatility * sqrtDt * gaussian(rng);
      const totalVar =
        (instrument.beta * marketVol) ** 2 + instrument.volatility ** 2;

      const previous = prices[day - 1] ?? instrument.start;
      const next =
        previous * Math.exp((instrument.drift - totalVar / 2) * dt + common + idiosyncratic);
      prices.push(Math.max(0.5, round2(next)));
    }

    out.set(instrument.ticker, { ticker: instrument.ticker, prices });
  }

  return out;
}

function hashTicker(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i += 1) {
    h = (Math.imul(h, 31) + ticker.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Generated once at module load. The series never changes within a session. */
export const MARKET = generateMarket();

export function priceOn(ticker: string, day: number): number {
  const series = MARKET.get(ticker);
  if (!series) return 0;
  const index = Math.max(0, Math.min(day, series.prices.length - 1));
  return series.prices[index] ?? 0;
}

/** Percent change from day 0 to `day`, as a fraction. */
export function returnToDate(ticker: string, day: number): number {
  const start = priceOn(ticker, 0);
  if (start === 0) return 0;
  return (priceOn(ticker, day) - start) / start;
}

/**
 * Realised volatility of daily log returns over a trailing window, annualised.
 * Shown next to holdings so the risk lesson has a number attached to it.
 */
export function realisedVolatility(ticker: string, day: number, window = 30): number {
  const series = MARKET.get(ticker);
  if (!series) return 0;

  const end = Math.min(day, series.prices.length - 1);
  const start = Math.max(1, end - window);
  const logReturns: number[] = [];

  for (let i = start; i <= end; i += 1) {
    const previous = series.prices[i - 1];
    const current = series.prices[i];
    if (previous && current) logReturns.push(Math.log(current / previous));
  }

  if (logReturns.length < 2) return 0;
  const mean = logReturns.reduce((sum, value) => sum + value, 0) / logReturns.length;
  const variance =
    logReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (logReturns.length - 1);

  return Math.sqrt(variance * TRADING_DAYS);
}
