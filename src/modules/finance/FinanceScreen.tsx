import { Platform, ScrollView, View } from 'react-native';

import { BudgetDial } from './BudgetDial';
import { BudgetStats } from './BudgetStats';
import { BudgetSummary } from './BudgetSummary';
import { IncomeExpensesCard } from './IncomeExpensesCard';
import { PaymentsCalendarCard } from './PaymentsCalendarCard';
import { RecurringChargesCard } from './RecurringChargesCard';
import { TransactionsCard } from './TransactionsCard';
import { useBudget } from './useBudget';

/**
 * The Personal Finance page. On desktop it is the design's grid, 'hero hero
 * flow flow' over 'tx rec rec cal', columns 5.4fr 1.66fr 2.9fr 4.1fr and rows
 * 300px 1fr, built from flex rows as the Overview's is: a cell spanning two
 * columns grows by both and starts from one gap, so the rows' columns line up
 * with the grid's even though they break at different places.
 *
 * On iOS the same pieces stack in one scrolling column (FinnyFinanceMobile):
 * the budget text, the dial, its stats in a glass panel, then Income vs
 * expenses, Transactions, Upcoming payments and Recurring charges.
 */
export function FinanceScreen() {
  const budget = useBudget();

  if (Platform.OS !== 'macos') {
    return (
      <ScrollView
        testID="finance-column"
        contentContainerClassName="gap-y-[12px] px-mobile-x pb-mobile-bottom pt-mobile-top"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-[4px]">
          <BudgetSummary budget={budget} />
        </View>
        {budget && (
          <>
            <BudgetDial
              budget={budget}
              className="w-full max-w-[300px] self-center"
            />
            <BudgetStats budget={budget} />
          </>
        )}
        <IncomeExpensesCard />
        <TransactionsCard />
        <PaymentsCalendarCard />
        <RecurringChargesCard />
      </ScrollView>
    );
  }
  return (
    <View testID="finance-grid" className="flex-1 gap-y-frame-gap">
      <View className="h-finance-row flex-row gap-x-frame-gap">
        <View
          testID="finance-hero"
          className="grow-[7.06] basis-frame-gap flex-row gap-x-[20px]"
        >
          <View className="min-w-0 flex-1 gap-y-[12px] pl-[6px] pt-[6px]">
            <BudgetSummary budget={budget} />
            {budget && (
              <View className="mt-auto">
                <BudgetStats budget={budget} />
              </View>
            )}
          </View>
          {budget && <BudgetDial budget={budget} className="h-full" />}
        </View>
        <View testID="finance-flow" className="grow-[7] basis-frame-gap">
          <IncomeExpensesCard />
        </View>
      </View>
      <View className="min-h-0 flex-1 flex-row gap-x-frame-gap">
        <View testID="finance-tx" className="grow-[5.4] basis-0">
          <TransactionsCard />
        </View>
        <View testID="finance-rec" className="grow-[4.56] basis-frame-gap">
          <RecurringChargesCard />
        </View>
        <View testID="finance-cal" className="grow-[4.1] basis-0">
          <PaymentsCalendarCard />
        </View>
      </View>
    </View>
  );
}
