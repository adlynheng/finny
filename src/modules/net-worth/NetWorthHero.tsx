import type { ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Glass } from '@/components/ui/Glass';
import { useAccounts } from '@/hooks/useAccounts';
import { useGoals } from '@/hooks/useGoals';
import { usePositions } from '@/hooks/usePositions';
import { useSettings } from '@/hooks/useSettings';
import { useSnapshots } from '@/hooks/useSnapshots';
import { today } from '@/lib/today';
import type { ScreenName } from '@/navigation/routes';
import { useGoTo } from '@/navigation/useGoTo';
import { tokens } from '@/theme/tokens';
import { monthDelta, netWorth } from '@/utils/derive/networth';
import { formatMonthShort } from '@/utils/format/date';
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
 *
 * Before any balance is tracked it is the design's empty hero instead.
 */
export function NetWorthHero() {
  const accounts = useAccounts().data;
  // The last two months are in every history window; 6 shares the history card's cache.
  const snapshots = useSnapshots(6).data;
  const worth = accounts && netWorth(accounts);
  const delta = snapshots && monthDelta(snapshots);

  if (worth && worth.assetsCents === 0 && worth.liabilitiesCents === 0) {
    return <EmptyHero />;
  }

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
              className="font-sans text-[76px] font-light leading-[72px] tracking-[-0.035em] text-ink ios:text-[60px] ios:-mt-[15px] ios:leading-[72px]"
            >
              {worth.netCents < 0 && MINUS}
              {formatAmount(worth.netCents)}
            </Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-[8px] ios:gap-[6px]">
            {delta && (
              <>
                <HeroChip testID="net-worth-delta" className="gap-x-[7px]">
                  <LimeDot />
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

/**
 * Nothing tracked yet: S$0 under the heading and this month, a welcome, and
 * the four steps that set Finny up, each opening the tab it happens on and
 * ticked once done. On desktop the steps sit at the foot of the hero.
 */
function EmptyHero() {
  const name = givenName(useSettings().data?.name ?? '');
  const steps = useSetupSteps();
  const goTo = useGoTo();
  const done = steps.filter(s => s.done).length;
  return (
    <View
      testID="net-worth-hero"
      // The desktop column's 410px, as the design's; mobile takes the column's width.
      className={
        Platform.OS === 'ios'
          ? 'gap-y-[10px] px-[4px]'
          : 'w-[410px] flex-1 gap-y-[12px]'
      }
    >
      <View className="flex-row items-center gap-x-[12px] ios:gap-x-[10px]">
        <Text
          role="heading"
          className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]"
        >
          Net worth
        </Text>
        <HeroChip testID="net-worth-month">
          <Text className="font-sans text-[12px] text-muted">
            {formatMonthShort(today(), { year: true })}
          </Text>
        </HeroChip>
      </View>
      <View className="flex-row items-start gap-x-[6px] ios:gap-x-[5px]">
        <Text className="mt-[12px] font-sans text-[24px] font-light text-muted ios:mt-[9px] ios:text-[20px]">
          S$
        </Text>
        <Text
          testID="net-worth"
          className="font-sans text-[76px] font-light leading-[72px] tracking-[-0.035em] text-ink ios:text-[60px] ios:-mt-[15px] ios:leading-[72px]"
        >
          0
        </Text>
      </View>
      <View className="flex-row flex-wrap items-center gap-[8px] ios:gap-[6px]">
        <HeroChip testID="net-worth-welcome" className="gap-x-[7px]">
          <LimeDot />
          <Text className="font-sans text-[13px] text-ink ios:text-[12px]">
            {name ? `Welcome, ${name}` : 'Welcome'}
          </Text>
        </HeroChip>
        <HeroChip testID="net-worth-nothing">
          <Text className="font-sans text-[13px] text-muted ios:text-[12px]">
            Nothing tracked yet
          </Text>
        </HeroChip>
      </View>
      <View testID="setup-steps" className="mt-auto gap-y-[6px] ios:mt-[6px]">
        <View className="flex-row items-baseline justify-between px-[2px] pb-[4px]">
          <Text className="font-sans text-[15px] text-ink">Set up Finny</Text>
          <Text
            testID="setup-done"
            className="font-sans text-[12px] text-muted"
          >
            {done} of {steps.length} done
          </Text>
        </View>
        {steps.map((step, i) => (
          <Pressable
            key={step.tab}
            testID={`setup-step-${step.tab}`}
            accessibilityRole="button"
            accessibilityLabel={step.title}
            accessibilityState={{ checked: step.done }}
            onPress={() => goTo(step.tab)}
            className="group"
          >
            <Glass
              recipe="chip"
              radius={8}
              fill="bg-white/55 group-hover:bg-white"
              className="flex-row items-center gap-x-[12px] px-[12px] py-[10px]"
            >
              <View
                className={
                  step.done
                    ? 'size-[26px] items-center justify-center rounded-full bg-ink'
                    : 'size-[26px] items-center justify-center rounded-full border border-ink/20'
                }
              >
                {step.done ? (
                  <Svg width={10} height={10} viewBox="0 0 10 10">
                    <Path
                      d="M2 5.2l2 2 4-4.4"
                      fill="none"
                      stroke={tokens.colors.lime}
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                ) : (
                  <Text className="font-sans text-[12px] text-muted">
                    {i + 1}
                  </Text>
                )}
              </View>
              <View className="min-w-0 flex-1 gap-y-[1px]">
                <Text className="font-sans text-[14px] text-ink">
                  {step.title}
                </Text>
                <Text
                  numberOfLines={1}
                  className="font-sans text-[11px] text-muted"
                >
                  {step.sub}
                </Text>
              </View>
              <Text className="font-sans text-[11px] text-muted">
                {step.label}
              </Text>
              <Svg width={9} height={9} viewBox="0 0 10 10">
                <Path
                  d="M3.5 2l3 3-3 3"
                  fill="none"
                  stroke={tokens.colors.ink}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              </Svg>
            </Glass>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * What to greet someone by: their name less its last word when it has three
 * or more ("Wei Ling Tan" is Wei Ling), else the first ("Adlyn Heng" is Adlyn).
 */
export function givenName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length >= 3 ? words.slice(0, -1) : words.slice(0, 1)).join(' ');
}

/** The design's four setup steps, each done once its data exists. */
function useSetupSteps(): {
  tab: ScreenName;
  label: string;
  title: string;
  sub: string;
  done: boolean;
}[] {
  const accounts = useAccounts().data ?? [];
  const settings = useSettings().data;
  const positions = usePositions().data ?? [];
  const goals = useGoals().data ?? [];
  return [
    {
      tab: 'Settings',
      label: 'Settings',
      title: 'Add your accounts',
      sub: 'Bank, CPF and brokerage balances',
      done: accounts.some(a => a.is_active),
    },
    {
      tab: 'Finance',
      label: 'Personal Finance',
      title: 'Set a monthly budget',
      sub: 'A spending limit to pace against',
      done: (settings?.monthly_expenditure_cents ?? 0) > 0,
    },
    {
      tab: 'Trading',
      label: 'Trading',
      title: 'Log your holdings',
      sub: 'Positions and their buy lots',
      done: positions.length > 0,
    },
    {
      tab: 'Planner',
      label: 'Goals & Planner',
      title: 'Create a savings goal',
      sub: 'A target, a date, a monthly amount',
      done: goals.length > 0,
    },
  ];
}

/** The design's 8px lime dot in a 3px ring of 30% lime, 8px in from the chip's edge. */
function LimeDot() {
  return (
    <View className="-my-[3px] -ml-[5px] -mr-[3px] size-[14px] items-center justify-center rounded-full bg-lime/30">
      <View className="size-[8px] rounded-full bg-lime" />
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
