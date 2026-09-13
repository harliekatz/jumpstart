/**
 * Persistence.
 *
 * Everything lives in this browser's localStorage. There is no account, no
 * server and no network call anywhere in the app, which is why there is no
 * authentication to get wrong and nothing to leak. It is also a real limitation
 * — progress does not follow you to another device — and the README says so
 * rather than leaving it to be discovered.
 *
 * Every read is defensive. localStorage throws in private windows and with site
 * data blocked, returns null when cleared, and can hold a payload written by an
 * older build. A learner whose saved state is unreadable should get a fresh
 * start, never a blank screen.
 */
import { initialSkillState } from "./mastery";
import { defaultBudget } from "./budget";
import { initialPortfolio } from "./portfolio";
import { seedThreads } from "./community";
import { SKILL_IDS } from "./types";
import type { LearnerState, SkillId, SkillState } from "./types";

export const STORAGE_KEY = "jumpstart:learner:v1";
export const STATE_VERSION = 1;

export function initialState(): LearnerState {
  const skills = {} as Record<SkillId, SkillState>;
  for (const id of SKILL_IDS) skills[id] = initialSkillState();

  const budget = defaultBudget();

  return {
    version: STATE_VERSION,
    displayName: "",
    goal: null,
    diagnosticDone: false,
    skills,
    lessons: {},
    xp: 0,
    activeDays: [],
    portfolio: initialPortfolio(),
    budget,
    threads: seedThreads(),
    seenItems: [],
  };
}

export function loadState(): LearnerState {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return initialState();

  try {
    const parsed = JSON.parse(raw) as Partial<LearnerState>;
    if (parsed.version !== STATE_VERSION) return initialState();
    return merge(parsed);
  } catch {
    // Corrupt payload. A fresh state is a better outcome than a crash.
    return initialState();
  }
}

/**
 * Fills in anything a saved payload is missing.
 *
 * A saved state is only as trustworthy as the build that wrote it. Merging
 * against a fresh state means a field added after the save still has a sane
 * value, so a partial payload degrades to a partial reset rather than an
 * undefined read three components deep.
 */
function merge(saved: Partial<LearnerState>): LearnerState {
  const base = initialState();

  const skills = { ...base.skills };
  for (const id of SKILL_IDS) {
    const candidate = saved.skills?.[id];
    if (candidate && typeof candidate.known === "number") {
      skills[id] = { ...base.skills[id], ...candidate };
    }
  }

  // Seeded threads come from code, so a new seed thread appears for returning
  // learners while their own replies are preserved.
  const savedThreads = Array.isArray(saved.threads) ? saved.threads : [];
  const threads = base.threads.map((thread) => {
    const savedThread = savedThreads.find((candidate) => candidate.id === thread.id);
    if (!savedThread) return thread;
    const mine = (savedThread.replies ?? []).filter((reply) => reply.mine);
    return { ...thread, replies: [...thread.replies, ...mine] };
  });

  return {
    ...base,
    ...saved,
    version: STATE_VERSION,
    skills,
    lessons: saved.lessons ?? base.lessons,
    portfolio: { ...base.portfolio, ...saved.portfolio },
    budget: { ...base.budget, ...saved.budget },
    threads,
    activeDays: Array.isArray(saved.activeDays) ? saved.activeDays : [],
    seenItems: Array.isArray(saved.seenItems) ? saved.seenItems : [],
  };
}

export function saveState(state: LearnerState): void {
  safeSet(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do. The in-memory state is still correct.
  }
}

function safeGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Quota exceeded or storage blocked. Losing persistence is acceptable;
    // throwing here would take down the render.
  }
}
