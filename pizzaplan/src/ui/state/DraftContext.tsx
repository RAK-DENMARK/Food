import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_BALL_WEIGHT_G,
  DEFAULT_HYDRATION,
  DEFAULT_PIZZA_COUNT,
  DEFAULT_ROOM_TEMP_C,
  DEFAULT_SALT,
  DEFAULT_YEAST_TYPE,
} from '../../config/dough';
import { createDoughPlan } from '../../domain/plan';
import type { DoughInput, PlanResult } from '../../types';

/**
 * Appens eneste tilstand: brugerens kladde og den senest beregnede plan.
 *
 * Der ligger ingen beregninger her – kun kald til domænelaget.
 */
interface DraftContextValue {
  draft: DoughInput;
  update: (changes: Partial<DoughInput>) => void;
  /** Beregner planen med "nu" låst fast på beregningstidspunktet. */
  generatePlan: () => PlanResult;
  result: PlanResult | null;
  /** Tidspunktet planen blev beregnet – bruges til "i dag"/"i morgen". */
  generatedAt: Date;
  reset: () => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

/** Standard: næste gang klokken bliver 18, dog tidligst i morgen hvis det er tæt på. */
export function defaultServingTime(now: Date = new Date()): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
  const hoursUntil = (today.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hoursUntil >= 6) return today;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 0, 0, 0);
}

function initialDraft(): DoughInput {
  return {
    pizzaCount: DEFAULT_PIZZA_COUNT,
    ballWeightG: DEFAULT_BALL_WEIGHT_G,
    hydration: DEFAULT_HYDRATION,
    salt: DEFAULT_SALT,
    yeastType: DEFAULT_YEAST_TYPE,
    roomTempC: DEFAULT_ROOM_TEMP_C,
    servingTime: defaultServingTime(),
  };
}

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DoughInput>(initialDraft);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date>(() => new Date());

  const update = useCallback((changes: Partial<DoughInput>) => {
    setDraft((current) => ({ ...current, ...changes }));
  }, []);

  const generatePlan = useCallback(() => {
    const now = new Date();
    const next = createDoughPlan(draft, now);
    setGeneratedAt(now);
    setResult(next);
    return next;
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(initialDraft());
    setResult(null);
  }, []);

  const value = useMemo(
    () => ({ draft, update, generatePlan, result, generatedAt, reset }),
    [draft, update, generatePlan, result, generatedAt, reset],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const context = useContext(DraftContext);
  if (!context) throw new Error('useDraft skal bruges inde i en DraftProvider');
  return context;
}
