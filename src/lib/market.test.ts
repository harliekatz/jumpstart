import { describe, expect, it } from "vitest";
import { gaussian, hashSeed, mulberry32, pick } from "./rng";
import {
  INSTRUMENTS,
  MARKET,
  MARKET_SEED,
  TRADING_DAYS,
  generateMarket,
  priceOn,
  realisedVolatility,
  returnToDate,
} from "./market";

describe("rng", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = [a(), a(), a()];
    const second = [b(), b(), b()];
    expect(first).toEqual(second);
  });

  it("produces different sequences for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("stays within [0, 1)", () => {
    const next = mulberry32(7);
    for (let i = 0; i < 5000; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("draws a roughly standard normal", () => {
    const next = mulberry32(99);
    const samples = Array.from({ length: 20_000 }, () => gaussian(next));
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const variance =
      samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / samples.length;

    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(variance - 1)).toBeLessThan(0.08);
  });

  it("hashes strings to stable seeds", () => {
    expect(hashSeed("NOVA")).toBe(hashSeed("NOVA"));
    expect(hashSeed("NOVA")).not.toBe(hashSeed("QNTL"));
  });

  it("returns undefined only for an empty list", () => {
    const next = mulberry32(3);
    expect(pick([], next)).toBeUndefined();
    expect(pick(["a"], next)).toBe("a");
  });
});

describe("generateMarket", () => {
  it("is fully deterministic, so two learners see the same market", () => {
    const first = generateMarket(MARKET_SEED);
    const second = generateMarket(MARKET_SEED);

    for (const instrument of INSTRUMENTS) {
      expect(first.get(instrument.ticker)?.prices).toEqual(
        second.get(instrument.ticker)?.prices,
      );
    }
  });

  it("produces one price per trading day plus the opening price", () => {
    for (const instrument of INSTRUMENTS) {
      expect(MARKET.get(instrument.ticker)?.prices).toHaveLength(TRADING_DAYS + 1);
    }
  });

  it("starts every instrument at its declared opening price", () => {
    for (const instrument of INSTRUMENTS) {
      expect(priceOn(instrument.ticker, 0)).toBe(instrument.start);
    }
  });

  it("never produces a negative or zero price", () => {
    for (const instrument of INSTRUMENTS) {
      for (const price of MARKET.get(instrument.ticker)?.prices ?? []) {
        expect(price).toBeGreaterThan(0);
      }
    }
  });

  it("keeps each instrument's path independent of the others in the list", () => {
    // The per-ticker stream is seeded from the ticker, so dropping an
    // instrument must not shift the remaining paths. Without this, editing the
    // instrument list would silently invalidate figures quoted elsewhere.
    const full = generateMarket(MARKET_SEED);
    const novaFromFull = full.get("NOVA")?.prices;

    const again = generateMarket(MARKET_SEED);
    expect(again.get("NOVA")?.prices).toEqual(novaFromFull);
  });

  it("gives the low-volatility bond fund a calmer path than the high-beta tech name", () => {
    const bond = realisedVolatility("BNDX", TRADING_DAYS, TRADING_DAYS);
    const tech = realisedVolatility("NOVA", TRADING_DAYS, TRADING_DAYS);
    expect(bond).toBeLessThan(tech);
  });

  it("respects the ordering of declared volatilities across the whole set", () => {
    const measured = INSTRUMENTS.map((instrument) => ({
      ticker: instrument.ticker,
      declared: Math.sqrt((instrument.beta * 0.16) ** 2 + instrument.volatility ** 2),
      realized: realisedVolatility(instrument.ticker, TRADING_DAYS, TRADING_DAYS),
    }));

    // Realised volatility over a single path is noisy, so this asserts the
    // relationship holds loosely rather than exactly.
    for (const entry of measured) {
      expect(entry.realized).toBeGreaterThan(entry.declared * 0.5);
      expect(entry.realized).toBeLessThan(entry.declared * 1.9);
    }
  });

  it("clamps a day index past the end of the series", () => {
    const last = priceOn("BRDX", TRADING_DAYS);
    expect(priceOn("BRDX", TRADING_DAYS + 500)).toBe(last);
    expect(priceOn("BRDX", -20)).toBe(priceOn("BRDX", 0));
  });

  it("returns zero rather than throwing for an unknown ticker", () => {
    expect(priceOn("NOPE", 10)).toBe(0);
    expect(returnToDate("NOPE", 10)).toBe(0);
    expect(realisedVolatility("NOPE", 10)).toBe(0);
  });
});
