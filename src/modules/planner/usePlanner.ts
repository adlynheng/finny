import { useMemo } from 'react';

import { useCategories } from '@/hooks/useCategories';
import { useGoals } from '@/hooks/useGoals';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { useRecurringCharges } from '@/hooks/useRecurringCharges';
import { useSettings } from '@/hooks/useSettings';
import {
  isPlanDirty,
  planFromSettings,
  shownPlan,
  usePlanStore,
  type Plan,
} from '@/stores/planStore';
import { GOAL_SOURCES, isOneOf, type GoalRow } from '@/types/domain';
import {
  contributionCents,
  goalShare,
  goalStatus,
  potCents,
  reachDate,
  type GoalStatus,
} from '@/utils/derive/goals';
import {
  commitmentGroups,
  fixedCostsCents,
  grossIncomeCents,
  leftToAllocateCents,
  type Commitment,
} from '@/utils/derive/plan';

export type PlannerGoal = {
  goal: GoalRow;
  /** Of its pot, from 0 to 1. */
  share: number;
  contributionCents: number;
  /** When it is reached at that contribution; null with none. */
  reach: string | null;
  status: GoalStatus;
};

export type Planner = {
  grossCents: number;
  cpfCents: number;
  fixedCents: number;
  /** The plan as saved on the settings row. */
  saved: Plan;
  /** The plan shown: the unsaved draft while there is one. */
  plan: Plan;
  dirty: boolean;
  /** Whole dollars, negative when over income. */
  leftCents: number;
  commitments: Commitment[];
  goals: PlannerGoal[];
  onTrack: number;
};

const toDollars = (cents: number) => Math.round(cents / 100) * 100;

/** A goal's pot by name: the source chip's, and the same in a sentence. */
export const SOURCE_NAMES = { savings: 'Savings', investment: 'Investments' };
export const POT_WORDS = { savings: 'savings', investment: 'investments' };

/** Whether a goal counts towards "N of M on track". */
export function isOnTrack(status: GoalStatus): boolean {
  return status.kind === 'reached' || status.kind === 'on-track';
}

/**
 * Everything the Planner shows, from the settings row, income sources,
 * recurring charges and goals, with the unsaved slider draft applied: moving
 * a slider re-derives every goal's share and status. Null until they load.
 */
export function usePlanner(): Planner | null {
  const settings = useSettings().data;
  const sources = useIncomeSources().data;
  const charges = useRecurringCharges().data;
  const categories = useCategories('expense').data;
  const rows = useGoals().data;
  const draft = usePlanStore(s => s.draft);

  // What the sliders never change, worked out once per load, so a drag
  // re-derives only the plan and the goals (and the commitments keep their
  // identity, which lets their card skip re-rendering).
  const base = useMemo(() => {
    if (!settings || !sources || !charges || !categories) {
      return null;
    }
    // The plan is in whole dollars: rounding these once keeps the dial's
    // remainder and the left-to-allocate figure in step.
    const grossCents = toDollars(grossIncomeCents(sources));
    return {
      grossCents,
      cpfCents: toDollars(grossCents * settings.cpf_employee_rate),
      fixedCents: toDollars(fixedCostsCents(charges)),
      saved: planFromSettings(settings),
      commitments: commitmentGroups(charges, categories),
    };
  }, [settings, sources, charges, categories]);

  if (!base || !rows) {
    return null;
  }
  const { grossCents, cpfCents, fixedCents, saved } = base;
  const plan = shownPlan(draft, saved);
  const goals = rows.map(goal => {
    const pot = isOneOf(GOAL_SOURCES, goal.src) ? potCents(goal.src, plan) : 0;
    const contribution = contributionCents(goal, pot);
    return {
      goal,
      share: goalShare(goal, pot),
      contributionCents: contribution,
      reach: reachDate(goal, contribution),
      status: goalStatus(goal, pot),
    };
  });
  return {
    grossCents,
    cpfCents,
    fixedCents,
    saved,
    plan,
    dirty: isPlanDirty(draft, saved),
    leftCents: leftToAllocateCents({ grossCents, cpfCents, fixedCents, plan }),
    commitments: base.commitments,
    goals,
    onTrack: goals.filter(g => isOnTrack(g.status)).length,
  };
}
