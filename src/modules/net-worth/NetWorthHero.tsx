import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { useAccounts } from '@/hooks/useAccounts';
import { useSnapshots } from '@/hooks/useSnapshots';
import { monthDelta, netWorth } from '@/utils/derive/networth';
import {
  formatAmount,
  formatKMoney,
  formatSignedMoney,
  formatSignedPercent,
  MINUS,
} from '@/utils/format/money';

/**
 * The hero's text column: the heading, net worth with its `S$` set apart, and the chips under
 * it. The two delta chips compare the last two snapshots, so they are left out until there
 * are two; the liabilities chip reads the accounts, so it always shows. Mobile sets it smaller
 * (a 32px heading, a 60px figure) and lets the chips wrap.
 */
export function NetWorthHero() {
  const accounts = useAccounts().data;
  // The last two months are in every history window; 6 shares the history card's cache.
  const snapshots = useSnapshots(6).data;
  const worth = accounts && netWorth(accounts);
  const delta = snapshots && monthDelta(snapshots);

  return (
    <View
      testID="net-worth-hero"
      className="gap-y-[12px] ios:gap-y-[10px] ios:px-[4px]"
    >
      <Text
        role="heading"
        className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]"
      >
        Net worth
      </Text>
      {worth && (
        <>
          <View className="flex-row items-start gap-x-[6px] ios:gap-x-[5px]">
            <Text className="mt-[12px] font-sans text-[24px] font-light text-muted ios:mt-[9px] ios:text-[20px]">
              S$
            </Text>
            <Text
              testID="net-worth"
              className="font-sans text-[76px] font-light leading-[72px] tracking-[-0.035em] text-ink ios:text-[60px] ios:leading-[57px]"
            >
              {worth.netCents < 0 && MINUS}
              {formatAmount(worth.netCents)}
            </Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-[8px] ios:gap-[6px]">
            {delta && (
              <>
                <HeroChip testID="net-worth-delta" className="gap-x-[7px]">
                  {/* The design's 8px dot with a 3px ring of 30% lime, 8px in from the edge. */}
                  <View className="-my-[3px] -ml-[5px] -mr-[3px] size-[14px] items-center justify-center rounded-full bg-lime/30">
                    <View className="size-[8px] rounded-full bg-lime" />
                  </View>
                  <Text className="font-sans text-[13px] font-medium text-ink ios:text-[12px]">
                    {formatSignedMoney(delta.deltaCents)}
                  </Text>
                </HeroChip>
                {delta.percent !== null && (
                  <HeroChip testID="net-worth-percent">
                    <Text className="font-sans text-[13px] text-muted ios:text-[12px]">
                      {/* Signed only when it fell, as the design shows it. */}
                      {formatSignedPercent(delta.percent).replace(
                        /^\+/,
                        '',
                      )} vs {delta.previousMonth}
                    </Text>
                  </HeroChip>
                )}
              </>
            )}
            <HeroChip testID="net-worth-liabilities">
              <Text className="font-sans text-[13px] text-muted ios:text-[12px]">
                Liabilities {worth.liabilitiesCents > 0 && MINUS}
                {formatKMoney(worth.liabilitiesCents)}
              </Text>
            </HeroChip>
          </View>
        </>
      )}
    </View>
  );
}

function HeroChip({
  testID,
  className = '',
  children,
}: {
  testID: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Glass
      testID={testID}
      recipe="chip"
      radius={6}
      className={`flex-row items-center px-[10px] py-[6px] ${className}`}
    >
      {children}
    </Glass>
  );
}
