"use client";

/**
 * The app's one stateful hook.
 *
 * Components read derived values and dispatch actions; nothing else holds
 * state. Persistence is a single effect keyed on the whole state object, so
 * there is no path where a component can change something and forget to save.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadState, saveState, clearState, initialState } from "@/lib/storage";
import { curriculumProgress, dueSkills, recommend } from "@/lib/scheduler";
import { levelProgress, streakLength } from "@/lib/progress";
import { viewPortfolio } from "@/lib/portfolio";
import { summarise } from "@/lib/budget";
import { reduce, type Action } from "./reducer";
import type { LearnerState } from "@/lib/types";

export interface JumpStartApi {
  state: LearnerState;
  /** Set by a rejected trade, cleared on the next successful action. */
  error: string;
  dispatch: (action: Action) => void;
  clearError: () => void;
  hardReset: () => void;
  /** True until the saved state has been read, so nothing renders twice. */
  hydrated: boolean;

  recommendations: ReturnType<typeof recommend>;
  due: ReturnType<typeof dueSkills>;
  progress: number;
  level: ReturnType<typeof levelProgress>;
  streak: number;
  portfolio: ReturnType<typeof viewPortfolio>;
  budget: ReturnType<typeof summarise>;
}

export function useJumpStart(): JumpStartApi {
  // Starts from a fresh state and loads the saved one in an effect. Reading
  // localStorage during the initial render would make the first paint depend on
  // browser storage, which throws in a private window and differs between the
  // build-time HTML and the hydrated tree.
  const [state, setState] = useState<LearnerState>(() => initialState());
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Skips the write that would otherwise fire with the pre-hydration state and
  // overwrite a real save with an empty one.
  const canPersist = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!canPersist.current) {
      canPersist.current = true;
      return;
    }
    saveState(state);
  }, [state, hydrated]);

  const dispatch = useCallback((action: Action) => {
    setState((current) => {
      const result = reduce(current, action);
      setError(result.error ?? "");
      return result.state;
    });
  }, []);

  const hardReset = useCallback(() => {
    clearState();
    setState(initialState());
    setError("");
  }, []);

  const clearError = useCallback(() => setError(""), []);

  // Recomputed on every state change. The whole derivation is a few hundred
  // operations over twenty lessons, so memoising by identity is enough and
  // there is no cache to invalidate.
  const derived = useMemo(
    () => ({
      recommendations: recommend(state),
      due: dueSkills(state),
      progress: curriculumProgress(state),
      level: levelProgress(state.xp),
      streak: streakLength(state.activeDays),
      portfolio: viewPortfolio(state.portfolio),
      budget: summarise(state.budget.monthlyIncome, state.budget.allocations),
    }),
    [state],
  );

  return { state, error, dispatch, clearError, hardReset, hydrated, ...derived };
}
