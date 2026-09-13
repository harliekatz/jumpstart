"use client";

import {
  BookOpen,
  Flame,
  LineChart,
  MessagesSquare,
  Sprout,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LevelProgress } from "@/lib/progress";
import { Meter } from "@/components/ui/primitives";

export type View = "today" | "learn" | "simulator" | "budget" | "community" | "progress";

const NAV: { id: View; label: string; icon: typeof Target }[] = [
  { id: "today", label: "Today", icon: Target },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "simulator", label: "Simulator", icon: LineChart },
  { id: "budget", label: "Budget lab", icon: Wallet },
  { id: "community", label: "Community", icon: MessagesSquare },
  { id: "progress", label: "Progress", icon: TrendingUp },
];

export function Sidebar({
  view,
  setView,
  level,
  streak,
  dueCount,
}: {
  view: View;
  setView: (view: View) => void;
  level: LevelProgress;
  streak: number;
  dueCount: number;
}) {
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Sprout size={17} />
        </span>
        <span className="brand-text">
          <span className="brand-name">JumpStart</span>
          <span className="brand-tag">Financial literacy</span>
        </span>
      </div>

      <div className="nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${view === id ? "is-active" : ""}`}
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            <Icon aria-hidden="true" />
            {label}
            {id === "today" && dueCount > 0 && (
              <span className="nav-badge" aria-label={`${dueCount} due for review`}>
                {dueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="sidebar-status">
        <div className="status-row">
          <span className="status-level">Level {level.level}</span>
          {streak > 0 && (
            <span className="status-streak">
              <Flame size={13} aria-hidden="true" />
              {streak}
            </span>
          )}
        </div>
        <Meter value={level.fraction} tone="green" />
        <p className="status-next">{level.xpForNext} XP to level {level.level + 1}</p>
      </div>

      <p className="sidebar-foot">
        Portfolio project. Synthetic data, no accounts, nothing leaves your browser.
      </p>
    </nav>
  );
}
