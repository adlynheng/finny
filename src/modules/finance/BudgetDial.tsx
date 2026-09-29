import { View } from 'react-native';

import { budgetDial } from '@/components/charts/dialConfigs';
import { RadialDial } from '@/components/charts/RadialDial';
import { cx } from '@/components/ui/cardChrome';
import { GradientFill } from '@/components/ui/GradientFill';
import { gradients } from '@/theme/gradients';
import type { Budget } from './useBudget';

/**
 * The budget as the dial, over its glow: a tick per day so far sized by that
 * day's spend, today's pulsing, the days to come as dots, the arc as the share
 * of the limit used (danger past it) and the even-pace marker. A readout, not
 * a control, so it takes no touches or hover.
 */
export function BudgetDial({
  budget,
  className,
}: {
  budget: Budget;
  /** Its size: the hero's height on desktop, the column's width on mobile. */
  className: string;
}) {
  return (
    <View
      testID="budget-dial"
      pointerEvents="none"
      className={cx('aspect-square items-center justify-center', className)}
    >
      <View className="absolute aspect-square w-[70%]">
        <GradientFill gradient={gradients.heroGlowDial} />
      </View>
      <RadialDial
        testID="budget-dial-chart"
        {...budgetDial({
          dailyCents: budget.dailyCents,
          daysInMonth: budget.daysInMonth,
          spentCents: budget.spentCents,
          limitCents: budget.limitCents,
        })}
      />
    </View>
  );
}
