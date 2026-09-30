import { memo, useId, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { Icon } from '@/components/icons/Icon';
import { categoryIcon } from '@/components/icons/registry';
import { cx } from '@/components/ui/cardChrome';
import { AddButton, EmptyNote, GhostRows } from '@/components/ui/Empty';
import { Glass } from '@/components/ui/Glass';
import { GradientCard } from '@/components/ui/GradientCard';
import { useGoTo } from '@/navigation/useGoTo';
import { tokens } from '@/theme/tokens';
import type { Commitment } from '@/utils/derive/plan';
import { formatMoney } from '@/utils/format/money';
import type { Planner } from './usePlanner';

/** A small group still gets a bar and row this tall, as though it were S$110. */
const MIN_FLEX_CENTS = 11_000;

/** A group's share of the column (desktop) or the bar row (mobile), by amount. */
const flexOf = (c: Commitment) => Math.max(c.cents, MIN_FLEX_CENTS);

/**
 * What comes off the top before allocating: the recurring charges as monthly
 * equivalents, grouped by category. Each group is a hatched bar beside its
 * row, the pair sized by amount (never under the row's 52px), so a bar is
 * always its row's height; hovering either highlights both.
 *
 * On mobile the bars run across the card above the list, and tapping one
 * highlights its row.
 *
 * Memoised: none of it moves with the sliders.
 *
 * With no recurring charges it is the design's empty card, pointing to where
 * they are added.
 */
export const CommitmentsCard = memo(function CommitmentsCard({
  commitments,
  fixedCents,
  grossCents,
}: Pick<Planner, 'commitments' | 'fixedCents' | 'grossCents'>) {
  const [hot, setHot] = useState<string | null>(null);
  const mobile = Platform.OS === 'ios';
  const goTo = useGoTo();
  const empty = commitments.length === 0;
  const hover = (key: string) => ({
    onHoverIn: () => setHot(key),
    onHoverOut: () => setHot(h => (h === key ? null : h)),
  });
  const bar = (c: Commitment) => (
    <Pressable
      key={c.key}
      testID={`commitment-bar-${c.key}`}
      accessibilityLabel={c.name}
      // Hover on desktop; mobile's tap does what hover does.
      onPress={mobile ? () => setHot(c.key) : undefined}
      {...hover(c.key)}
      className={cx(
        'overflow-hidden rounded-6 border border-white/35',
        mobile ? 'min-w-[4px] rounded-5' : 'w-[44px]',
        hot === c.key ? 'bg-white/[.34]' : 'bg-white/[.14]',
      )}
      // Mobile's bars share the row by amount; a desktop bar is its row's height.
      style={mobile ? { flex: flexOf(c) } : undefined}
    >
      <Hatch across={mobile} />
    </Pressable>
  );

  return (
    <GradientCard
      testID="commitments-card"
      gradient="commitments"
      className="flex-1"
    >
      <View className="gap-y-[2px]">
        <Text className="font-sans text-[13px] text-white">
          Fixed commitments
        </Text>
        <Text className="font-sans text-[11px] text-white opacity-90">
          Taken off the top before you allocate
        </Text>
      </View>
      <View className="mt-[10px] flex-row flex-wrap items-baseline gap-x-[8px]">
        <Text
          testID="commitments-total"
          className="font-sans text-[38px] font-light leading-[38px] tracking-[-0.02em] text-white ios:text-[36px] ios:leading-[36px]"
        >
          {formatMoney(fixedCents)}
        </Text>
        <Text
          testID="commitments-sub"
          className="font-sans text-[13px] text-white opacity-90"
        >
          {empty
            ? 'per month · none yet'
            : `per month · ${
                grossCents > 0
                  ? ((fixedCents / grossCents) * 100).toFixed(1)
                  : '0.0'
              }% of gross`}
        </Text>
      </View>
      {empty ? (
        <View
          testID="commitments-empty"
          className="mt-[18px] min-h-0 flex-1 gap-y-[14px]"
        >
          <GhostRows count={4} tone="gradient" />
          <EmptyNote
            tone="gradient"
            className="mt-auto"
            title="Nothing fixed yet"
            body="Rent, loan repayments and insurance are recurring charges on Personal Finance. Add them there and they come off the top here."
            action={
              <AddButton
                testID="commitments-add"
                variant="light"
                label="Add in Personal Finance"
                onPress={() => goTo('Finance')}
              />
            }
          />
        </View>
      ) : mobile ? (
        <>
          <View className="mt-[16px] h-[30px] flex-row gap-x-[3px]">
            {commitments.map(bar)}
          </View>
          <View className="mt-[12px] gap-y-[4px]">
            {commitments.map(c => (
              <CommitmentRow key={c.key} commitment={c} hot={hot === c.key} />
            ))}
          </View>
        </>
      ) : (
        <View className="mt-[18px] min-h-0 flex-1 gap-y-[3px]">
          {commitments.map(c => (
            <View
              key={c.key}
              testID={`commitment-pair-${c.key}`}
              className="min-h-[52px] flex-row gap-x-[14px]"
              style={{ flex: flexOf(c) }}
            >
              {bar(c)}
              <Pressable
                accessible={false}
                {...hover(c.key)}
                className="min-w-0 flex-1"
              >
                <CommitmentRow commitment={c} hot={hot === c.key} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </GradientCard>
  );
});

function CommitmentRow({
  commitment: c,
  hot,
}: {
  commitment: Commitment;
  hot: boolean;
}) {
  return (
    <Glass
      testID={`commitment-${c.key}`}
      recipe="onGradient"
      radius={8}
      fill={hot ? 'bg-white/[.24]' : 'bg-white/10'}
      className="flex-1 flex-row items-center gap-x-[12px] pl-[12px] pr-[10px] ios:min-h-[54px] ios:px-[12px]"
    >
      <View className="size-[30px] items-center justify-center rounded-8 bg-white/[.14]">
        <Icon
          path={categoryIcon('expense', c.icon)}
          size={15}
          color={tokens.colors.white}
        />
      </View>
      <View className="min-w-0 flex-1 gap-y-[1px]">
        <Text
          numberOfLines={1}
          className="font-sans text-[13px] text-white ios:text-[14px]"
        >
          {c.name}
        </Text>
        <Text
          testID={`commitment-${c.key}-detail`}
          numberOfLines={1}
          className="font-sans text-[11px] text-white opacity-[.88]"
        >
          {c.detail}
        </Text>
      </View>
      <View className="items-end gap-y-[1px]">
        <Text
          testID={`commitment-${c.key}-amount`}
          className="font-sans text-[14px] text-white"
        >
          {formatMoney(c.cents)}
        </Text>
        <Text className="font-sans text-[10px] text-white opacity-85">
          {Math.round(c.share * 100)}%
        </Text>
      </View>
    </Glass>
  );
}

/** Hairlines every 5 points across a bar: stacked on desktop, side by side on mobile. */
function Hatch({ across }: { across: boolean }) {
  // useId's colons would break the `url(#…)` reference.
  const id = `hatch-${useId().replace(/:/g, '')}`;
  return (
    <Svg className="absolute inset-0" width="100%" height="100%">
      <Defs>
        <Pattern
          id={id}
          patternUnits="userSpaceOnUse"
          width={across ? 5 : 1}
          height={across ? 1 : 5}
        >
          <Rect
            width={1}
            height={1}
            fill={tokens.colors.white}
            fillOpacity={0.3}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
