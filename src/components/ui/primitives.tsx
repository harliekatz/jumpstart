/** Small shared pieces. Anything used on more than one screen lives here. */
import type { ReactNode } from "react";
import { SKILLS } from "@/lib/curriculum";
import { confidenceLabel } from "@/lib/mastery";
import { percent } from "@/lib/format";
import type { SkillId, SkillState } from "@/lib/types";

export function Meter({ value, tone }: { value: number; tone?: "auto" | "green" }) {
  const clamped = Math.max(0, Math.min(1, value));
  // Colour carries the reading below 40 / 75 percent, so the bar is legible
  // without reading the number beside it.
  const variant =
    tone === "green" ? "" : clamped < 0.4 ? " is-low" : clamped < 0.75 ? " is-mid" : "";

  return (
    <div className="meter">
      <div className={`meter-fill${variant}`} style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "gain" | "loss";
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ?? ""}`}>{value}</div>
      {note !== undefined && <div className="stat-note">{note}</div>}
    </div>
  );
}

/**
 * One track's mastery, with its confidence label.
 *
 * The confidence word is not decoration. A 62 percent estimate from three
 * answers and a 62 percent estimate from twenty answers mean very different
 * things, and showing only the percentage would present them as identical.
 */
export function MasteryRow({ skill, state }: { skill: SkillId; state: SkillState }) {
  const label = confidenceLabel(state);

  return (
    <div className="mastery-row">
      <span className="mastery-name">{SKILLS[skill].name}</span>
      <Meter value={state.known} />
      <span className="mastery-value">
        {percent(state.known)}
        <span className="muted"> · {label}</span>
      </span>
    </div>
  );
}

/** A line chart of one price series, drawn inline rather than via a library. */
export function PriceChart({
  prices,
  upTo,
  height = 200,
}: {
  prices: number[];
  upTo: number;
  height?: number;
}) {
  const slice = prices.slice(0, Math.max(2, upTo + 1));
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const span = max - min || 1;
  const width = 600;

  const point = (value: number, index: number) => {
    const x = (index / Math.max(1, slice.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 16) - 8;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const line = slice.map(point).join(" ");
  const area = `${line} ${width},${height} 0,${height}`;
  const rising = (slice[slice.length - 1] ?? 0) >= (slice[0] ?? 0);
  const stroke = rising ? "var(--green-400)" : "var(--red-400)";

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Price series over ${slice.length - 1} trading days, from ${slice[0]?.toFixed(2)} to ${slice[slice.length - 1]?.toFixed(2)}.`}
    >
      <defs>
        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="chart-grid">
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={width}
            y1={height * fraction}
            y2={height * fraction}
          />
        ))}
      </g>
      <polygon className="chart-area" points={area} />
      <polyline className="chart-line" points={line} style={{ stroke }} />
    </svg>
  );
}

/** A compact trend line for a table row. */
export function Sparkline({ prices, upTo }: { prices: number[]; upTo: number }) {
  const slice = prices.slice(0, Math.max(2, upTo + 1));
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const span = max - min || 1;
  const width = 100;
  const height = 28;

  const line = slice
    .map((value, index) => {
      const x = (index / Math.max(1, slice.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const rising = (slice[slice.length - 1] ?? 0) >= (slice[0] ?? 0);

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={line}
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        stroke={rising ? "var(--green-400)" : "var(--red-400)"}
      />
    </svg>
  );
}

export function Notice({
  tone = "good",
  children,
}: {
  tone?: "good" | "warn" | "error";
  children: ReactNode;
}) {
  return <div className={`notice is-${tone}`}>{children}</div>;
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "var(--s7)" }}>
      <div style={{ display: "flex", justifyContent: "center", color: "var(--text-faint)" }}>
        {icon}
      </div>
      <h3 style={{ marginTop: "var(--s3)" }}>{title}</h3>
      {children && <p style={{ marginTop: "var(--s2)" }}>{children}</p>}
    </div>
  );
}
