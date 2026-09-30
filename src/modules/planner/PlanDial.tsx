import { memo } from 'react';
import { View } from 'react-native';

import { allocationDial } from '@/components/charts/dialConfigs';
import { RadialDial } from '@/components/charts/RadialDial';
import { cx } from '@/components/ui/cardChrome';
import { GradientFill } from '@/components/ui/GradientFill';
import { gradients } from '@/theme/gradients';
import type { Planner } from './usePlanner';

/** The allocations the sliders set, as the dial's groups and the rows' ids. */
export const ALLOCATIONS = [
  { id: 'investments', name: 'Investments', field: 'investmentCents' },
  { id: 'savings', name: 'Savings', field: 'savingsCents' },
  { id: 'expenditure', name: 'Expenditure', field: 'expenditureCents' },
] as const;

export type AllocationId = (typeof ALLOCATIONS)[number]['id'];

/** The design's tick length for each group. */
const LENGTHS = {
  cpf: 22,
  fixed: 30,
  investments: 62,
  savings: 50,
  expenditure: 40,
};

/**
 * The monthly plan as the dial, over its glow: tick groups for CPF, the fixed
 * costs and the three allocations, the remainder as dots, and the arc to the
 * allocated total (danger once over income). A readout driven by the sliders:
 * the hovered or focused row's group is highlighted and the rest dim.
 *
 * Memoised, and given the throttled planner (see PlanHero), so it redraws
 * behind a drag rather than on every step of it.
 */
export const PlanDial = memo(function PlanDial({
  planner,
  highlighted,
  className,
}: {
  planner: Planner;
  highlighted: AllocationId | null;
  /** Its size: the hero's height on desktop, the column's width on mobile. */
  className: string;
}) {
  const { grossCents, cpfCents, fixedCents, plan } = planner;
  return (
    <View
      testID="plan-dial"
      pointerEvents="none"
      className={cx('aspect-square items-center justify-center', className)}
    >
      <View className="absolute aspect-square w-[70%]">
        <GradientFill gradient={gradients.heroGlowDial} />
      </View>
      <RadialDial
        testID="plan-dial-chart"
        selected={highlighted}
        {...allocationDial({
          grossCents,
          categories: [
            { key: 'cpf', name: 'CPF', cents: cpfCents, length: LENGTHS.cpf },
            {
              key: 'fixed',
              name: 'Fixed',
              cents: fixedCents,
              length: LENGTHS.fixed,
            },
            ...ALLOCATIONS.map(a => ({
              key: a.id,
              name: a.name,
              cents: plan[a.field],
              length: LENGTHS[a.id],
            })),
          ],
        })}
      />
    </View>
  );
});
