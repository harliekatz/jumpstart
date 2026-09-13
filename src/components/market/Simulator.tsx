"use client";

/**
 * Paper trading against the synthetic market.
 *
 * Every screen here says the data is generated, in the header and again beside
 * the prices. The original pitch listed real-time market data as a differentiator;
 * this build does not have it, and a finance-education product that quietly fakes
 * live quotes teaches exactly the wrong habit about where numbers come from.
 *
 * The learning point is the feedback panel: build a concentrated portfolio, step
 * the clock forward, and watch the volatility the diversification lesson
 * described actually show up in the balance.
 */
import { useState } from "react";
import { AlertTriangle, ChevronsRight, Info, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { INSTRUMENTS, MARKET, TRADING_DAYS, priceOn, realisedVolatility, returnToDate } from "@/lib/market";
import { portfolioNotes } from "@/lib/portfolio";
import { money, moneyCents, percent, signedMoney, signedPercent } from "@/lib/format";
import { PriceChart, Sparkline, Stat } from "@/components/ui/primitives";
import type { PortfolioView } from "@/lib/portfolio";
import type { LearnerState } from "@/lib/types";

export function Simulator({
  state,
  view,
  error,
  onTrade,
  onAdvance,
}: {
  state: LearnerState;
  view: PortfolioView;
  error: string;
  onTrade: (ticker: string, side: "buy" | "sell", shares: number) => void;
  onAdvance: (days: number) => void;
}) {
  const [selected, setSelected] = useState(INSTRUMENTS[0]?.ticker ?? "BRDX");
  const [shares, setShares] = useState("10");

  const day = state.portfolio.day;
  const instrument = INSTRUMENTS.find((candidate) => candidate.ticker === selected);
  const series = MARKET.get(selected)?.prices ?? [];
  const price = priceOn(selected, day);
  const held = state.portfolio.holdings.find((holding) => holding.ticker === selected);
  const count = Number.parseInt(shares, 10);
  const notes = portfolioNotes(view);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Market simulator</h1>
          <p>
            $10,000 of play money against a generated market. Buy, hold, step the clock
            forward and see what your allocation actually does to the ride.
          </p>
        </div>
      </div>

      <div className="notice is-warn" style={{ marginBottom: "var(--s5)" }}>
        <AlertTriangle size={15} aria-hidden="true" />
        <span>
          <strong style={{ color: "var(--text)" }}>These prices are generated.</strong> The
          tickers are invented, the series comes from a seeded geometric Brownian motion
          model, and no real market data is used anywhere in this app. Nothing here is
          investment advice.
        </span>
      </div>

      <div className="grid-4">
        <Stat label="Portfolio value" value={money(view.total)} note={`Day ${day} of ${TRADING_DAYS}`} />
        <Stat label="Cash" value={money(view.cash)} note={`${view.positions.length} position${view.positions.length === 1 ? "" : "s"}`} />
        <Stat
          label="Unrealised"
          value={signedMoney(view.gain)}
          note={view.invested > 0 ? signedPercent(view.gainPercent) : "Nothing invested yet"}
          tone={view.gain >= 0 ? "gain" : "loss"}
        />
        <Stat
          label="Weighted volatility"
          value={view.positions.length ? percent(view.portfolioVolatility) : "—"}
          note="Annualised, from your holdings"
        />
      </div>

      <div className="market-head" style={{ marginTop: "var(--s4)" }}>
        <span className="eyebrow">Trading day {day} / {TRADING_DAYS}</span>
        <div className="row-end">
          <button type="button" className="button small" onClick={() => onAdvance(5)} disabled={day >= TRADING_DAYS}>
            +1 week
          </button>
          <button type="button" className="button small" onClick={() => onAdvance(21)} disabled={day >= TRADING_DAYS}>
            +1 month
          </button>
          <button type="button" className="button small primary" onClick={() => onAdvance(63)} disabled={day >= TRADING_DAYS}>
            <ChevronsRight size={14} aria-hidden="true" />
            +1 quarter
          </button>
          <button type="button" className="button small ghost" onClick={() => onAdvance(-day)} disabled={day === 0}>
            <RotateCcw size={14} aria-hidden="true" />
            Reset clock
          </button>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <section className="track" aria-label="Instruments">
            <header className="track-head">
              <h3>Instruments</h3>
              <span className="badge">{INSTRUMENTS.length} available</span>
            </header>

            {INSTRUMENTS.map((candidate) => {
              const change = returnToDate(candidate.ticker, day);
              const prices = MARKET.get(candidate.ticker)?.prices ?? [];

              return (
                <button
                  key={candidate.ticker}
                  type="button"
                  className={`instrument-row ${selected === candidate.ticker ? "is-selected" : ""}`}
                  onClick={() => setSelected(candidate.ticker)}
                  aria-pressed={selected === candidate.ticker}
                >
                  <span className="ticker">{candidate.ticker}</span>
                  <span className="instrument-name">{candidate.name}</span>
                  <span className="hide-sm">
                    <Sparkline prices={prices} upTo={day} />
                  </span>
                  <span className="num">{moneyCents(priceOn(candidate.ticker, day))}</span>
                  <span className={`num ${change >= 0 ? "gain" : "loss"} hide-sm`}>
                    {signedPercent(change)}
                  </span>
                </button>
              );
            })}
          </section>

          {view.positions.length > 0 && (
            <section className="card" aria-label="Holdings">
              <div className="card-head">
                <h3>Your holdings</h3>
                <span className="badge">
                  Concentration {view.concentration.toFixed(2)}
                </span>
              </div>

              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th className="num">Shares</th>
                      <th className="num">Cost</th>
                      <th className="num">Now</th>
                      <th className="num">Value</th>
                      <th className="num">Gain</th>
                      <th className="num">Weight</th>
                      <th className="num">Vol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.positions.map((position) => (
                      <tr key={position.holding.ticker}>
                        <td>
                          <span className="ticker">{position.holding.ticker}</span>
                          <div className="muted" style={{ fontSize: "var(--text-xs)" }}>
                            {position.sector}
                          </div>
                        </td>
                        <td className="num tabular">{position.holding.shares}</td>
                        <td className="num tabular">{moneyCents(position.holding.costBasis)}</td>
                        <td className="num tabular">{moneyCents(position.price)}</td>
                        <td className="num tabular">{money(position.value)}</td>
                        <td className={`num tabular ${position.gain >= 0 ? "gain" : "loss"}`}>
                          {signedPercent(position.gainPercent)}
                        </td>
                        <td className="num tabular">{percent(position.weight)}</td>
                        <td className="num tabular">{percent(position.annualisedVolatility)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {view.sectorWeights.length > 0 && (
                <div className="legend" style={{ marginTop: "var(--s4)" }}>
                  {view.sectorWeights.map((entry) => (
                    <span className="legend-item" key={entry.sector}>
                      <span
                        className="legend-swatch"
                        style={{ background: "var(--green-500)", opacity: 0.3 + entry.weight * 0.7 }}
                      />
                      {entry.sector} {percent(entry.weight)}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {notes.length > 0 && (
            <section className="stack-tight" aria-label="Portfolio feedback">
              {notes.map((note) => (
                <div key={note.text} className={`notice ${note.tone === "good" ? "is-good" : "is-warn"}`}>
                  {note.tone === "good" ? (
                    <TrendingUp size={15} aria-hidden="true" />
                  ) : (
                    <TrendingDown size={15} aria-hidden="true" />
                  )}
                  <span>{note.text}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="stack">
          {instrument && (
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="ticker" style={{ fontSize: "var(--text-md)" }}>
                    {instrument.ticker}
                  </div>
                  <div className="muted" style={{ fontSize: "var(--text-sm)" }}>
                    {instrument.name}
                  </div>
                </div>
                <span className="badge">{instrument.sector}</span>
              </div>

              <PriceChart prices={series} upTo={day} height={140} />

              <div className="grid-2" style={{ marginTop: "var(--s4)" }}>
                <div>
                  <div className="eyebrow">Price</div>
                  <div className="tabular" style={{ fontSize: "var(--text-md)", fontWeight: 600 }}>
                    {moneyCents(price)}
                  </div>
                </div>
                <div>
                  <div className="eyebrow">30-day vol</div>
                  <div className="tabular" style={{ fontSize: "var(--text-md)", fontWeight: 600 }}>
                    {percent(realisedVolatility(instrument.ticker, day))}
                  </div>
                </div>
              </div>

              <p style={{ marginTop: "var(--s3)", fontSize: "var(--text-sm)" }}>
                {instrument.blurb}
              </p>

              <div className="field" style={{ marginTop: "var(--s4)" }}>
                <span>Shares</span>
                <input
                  className="input"
                  inputMode="numeric"
                  value={shares}
                  onChange={(event) => setShares(event.target.value.replace(/[^\d]/g, ""))}
                />
              </div>

              <div className="row" style={{ marginTop: "var(--s3)" }}>
                <button
                  type="button"
                  className="button primary"
                  style={{ flex: 1 }}
                  disabled={!Number.isFinite(count) || count <= 0}
                  onClick={() => onTrade(instrument.ticker, "buy", count)}
                >
                  Buy
                </button>
                <button
                  type="button"
                  className="button"
                  style={{ flex: 1 }}
                  disabled={!held || !Number.isFinite(count) || count <= 0}
                  onClick={() => onTrade(instrument.ticker, "sell", count)}
                >
                  Sell
                </button>
              </div>

              <p className="muted" style={{ marginTop: "var(--s2)", fontSize: "var(--text-sm)" }}>
                {Number.isFinite(count) && count > 0
                  ? `${count} × ${moneyCents(price)} = ${moneyCents(count * price)}`
                  : "Enter a share count."}
                {held && ` · You hold ${held.shares}.`}
              </p>

              {error && (
                <div className="notice is-error" style={{ marginTop: "var(--s3)" }}>
                  <Info size={15} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {state.portfolio.trades.length > 0 && (
            <div className="card card-tight">
              <h4 style={{ marginBottom: "var(--s3)" }}>Recent trades</h4>
              <div className="stack-tight">
                {state.portfolio.trades.slice(0, 6).map((trade) => (
                  <div className="row" key={trade.id} style={{ fontSize: "var(--text-sm)" }}>
                    <span className={`badge ${trade.side === "buy" ? "is-green" : ""}`}>
                      {trade.side}
                    </span>
                    <span className="ticker">{trade.ticker}</span>
                    <span className="muted tabular">{trade.shares} sh</span>
                    <span className="tabular" style={{ marginLeft: "auto" }}>
                      {moneyCents(trade.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
