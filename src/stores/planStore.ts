/**
 * The Planner's unsaved slider draft, and nothing else. The saved plan is the three monthly
 * amounts on the settings row in Supabase; this holds only a pending edit of them, which is what
 * drives the Reset / Save plan buttons and the "unsaved changes" label. Not persisted: an unsaved
 * draft is dropped on relaunch.
 */

import { create } from 'zustand';

import type { SettingsRow } from '@/types/domain';

export type Plan = {
  investmentCents: number;
  savingsCents: number;
  expenditureCents: number;
};

export function planFromSettings(
  settings: Pick<
    SettingsRow,
    | 'monthly_investment_cents'
    | 'monthly_savings_cents'
    | 'monthly_expenditure_cents'
  >,
): Plan {
  return {
    investmentCents: settings.monthly_investment_cents,
    savingsCents: settings.monthly_savings_cents,
    expenditureCents: settings.monthly_expenditure_cents,
  };
}

/** The plan the Planner shows: the draft while there is one, otherwise the saved plan. */
export function shownPlan(draft: Plan | null, saved: Plan): Plan {
  return draft ?? saved;
}

/** Whether Save has anything to write. A draft equal to the saved plan is clean. */
export function isPlanDirty(draft: Plan | null, saved: Plan): boolean {
  return (
    draft !== null &&
    (draft.investmentCents !== saved.investmentCents ||
      draft.savingsCents !== saved.savingsCents ||
      draft.expenditureCents !== saved.expenditureCents)
  );
}

type PlanState = {
  draft: Plan | null;
  /** Changes some amounts; the rest come from the draft so far, or the saved plan. */
  patchDraft: (saved: Plan, patch: Partial<Plan>) => void;
  /** Reset, and also after a successful Save. */
  resetDraft: () => void;
};

export const usePlanStore = create<PlanState>()(set => ({
  draft: null,
  patchDraft: (saved, patch) =>
    set(state => ({ draft: { ...(state.draft ?? saved), ...patch } })),
  resetDraft: () => set({ draft: null }),
}));
