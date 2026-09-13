/** Display helpers. Locale is pinned so server and browser agree on output. */

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const MONEY_CENTS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number): string {
  return MONEY.format(Number.isFinite(value) ? value : 0);
}

export function moneyCents(value: number): string {
  return MONEY_CENTS.format(Number.isFinite(value) ? value : 0);
}

export function percent(fraction: number, digits = 0): string {
  const value = Number.isFinite(fraction) ? fraction * 100 : 0;
  return `${value.toFixed(digits)}%`;
}

export function signedPercent(fraction: number, digits = 1): string {
  const value = Number.isFinite(fraction) ? fraction * 100 : 0;
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function signedMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe >= 0 ? "+" : "−"}${MONEY_CENTS.format(Math.abs(safe))}`;
}

export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
