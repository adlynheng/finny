import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MixRing } from '@/components/charts/MixRing';
import { cx } from '@/components/ui/cardChrome';
import { Skeleton } from '@/components/ui/Empty';
import type { InstrumentKind } from '@/types/domain';
import {
  byIndustry,
  byType,
  type IndustrySlice,
} from '@/utils/derive/portfolio';
import { formatDualMoney, formatPercent } from '@/utils/format/money';
import type { Book } from './useTradingBook';

const PLURAL: Record<InstrumentKind, string> = {
  Stock: 'Stocks',
  ETF: 'ETFs',
  REIT: 'REITs',
};

/** The desktop ring's largest side. */
const RING_MAX = 300;

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The portfolio split two ways: by instrument type, on the mix ring beside
 * its list, and by industry, largest first with bars scaled to the largest.
 * Hovering a type (tapping, on mobile) dims the others in the list and the
 * ring, and the ring's centre shows that type's share. The split is by market
 * value, so until the first prices arrive it is skeleton rows.
 */
export function PortfolioTab({
  book,
  mobile,
  animate = true,
}: {
  book: Book;
  mobile: boolean;
  animate?: boolean;
}) {
  const [highlight, setHighlight] = useState<InstrumentKind | null>(null);
  const [ringRoom, setRingRoom] = useState(0);
  const ringSide = Math.min(ringRoom, RING_MAX);
  const types = byType(book.holdings);
  const industries = byIndustry(book.holdings);
  const dual = (cents: number) =>
    formatDualMoney(cents, book.rate, { currency: 'SGD' });

  const ring = (
    <MixRing
      testID="mix-ring"
      parts={types.map(t => ({ key: t.kind, label: t.kind, cents: t.cents }))}
      usdSgdRate={book.rate}
      selected={highlight}
      animate={animate}
    />
  );

  const typeList = (
    <View className="min-w-0 flex-1 ios:flex-none">
      <Heading
        label="By instrument"
        note={count(types.length, 'type', 'types')}
      />
      {types.map(t => {
        const value = dual(t.cents);
        const on = highlight === t.kind;
        return (
          <Pressable
            key={t.kind}
            testID={`mix-type-${t.kind}`}
            onHoverIn={() => setHighlight(t.kind)}
            onHoverOut={() => setHighlight(null)}
            onPress={
              mobile ? () => setHighlight(on ? null : t.kind) : undefined
            }
            className={cx(
              '-mx-[6px] gap-y-[3px] rounded-6 border-t border-row-border px-[6px] py-[10px]',
              on && 'bg-ink/[.035]',
              highlight !== null && !on && 'opacity-[.45]',
            )}
          >
            <View className="flex-row items-baseline gap-x-[8px]">
              <Text className="font-sans text-[14px] text-ink">
                {PLURAL[t.kind]}
              </Text>
              <Text className="font-sans text-[11px] text-muted">
                {count(t.count, 'holding', 'holdings')}
              </Text>
              <Text className="ml-auto font-sans text-[18px] font-light tabular-nums text-ink">
                {formatPercent(t.share * 100)}
              </Text>
            </View>
            <View className="flex-row gap-x-[6px]">
              <Text className="font-sans text-[11px] tabular-nums text-ink">
                {value.primary}
              </Text>
              <Text className="font-sans text-[11px] tabular-nums text-muted">
                {value.secondary}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const industryRows = industries.map(i => (
    <IndustryRow key={i.name} slice={i} value={dual(i.cents)} mobile={mobile} />
  ));
  const industryHeading = (
    <Heading
      label="By industry"
      note={count(industries.length, 'industry', 'industries')}
    />
  );

  if (book.prices === 'loading') {
    return (
      <View
        testID="mix-loading"
        className="mt-[14px] flex-1 gap-y-[14px] px-[8px] ios:px-0"
      >
        {['w-[38%]', 'w-[52%]', 'w-[30%]', 'w-[44%]'].map(w => (
          <View
            key={w}
            className="flex-row items-center justify-between border-t border-row-border pt-[12px]"
          >
            <Skeleton className={cx('h-[10px]', w)} />
            <Skeleton className="h-[10px] w-[40px]" />
          </View>
        ))}
      </View>
    );
  }

  if (mobile) {
    return (
      <View className="mt-[14px] gap-y-[18px]">
        <View className="size-[200px] self-center">{ring}</View>
        {typeList}
        <View>
          {industryHeading}
          {industryRows}
        </View>
      </View>
    );
  }
  return (
    <View className="min-h-0 flex-1 flex-row gap-x-[40px] px-[8px] pb-[4px] pt-[14px]">
      <View className="min-h-0 min-w-0 flex-1 flex-row items-center gap-x-[26px]">
        {/* The ring fills the tab's height up to 300, centred in it: as far
            below the tabs as above the card's bottom. Measured, since a
            square's side here comes from the height. */}
        <View
          testID="mix-ring-cell"
          className="justify-center self-stretch"
          onLayout={e => setRingRoom(e.nativeEvent.layout.height)}
        >
          {ringSide > 0 && (
            <View style={{ width: ringSide, height: ringSide }}>{ring}</View>
          )}
        </View>
        {typeList}
      </View>
      <View className="min-h-0 min-w-0 flex-[1.15]">
        {industryHeading}
        <ScrollView
          className="min-h-0 flex-1"
          showsVerticalScrollIndicator={false}
        >
          {industryRows}
        </ScrollView>
      </View>
    </View>
  );
}

function Heading({ label, note }: { label: string; note: string }) {
  return (
    <View className="flex-row items-baseline justify-between pb-[8px]">
      <Text className="font-sans text-[11px] uppercase tracking-[0.06em] text-muted">
        {label}
      </Text>
      <Text className="font-sans text-[11px] text-muted">{note}</Text>
    </View>
  );
}

/**
 * An industry: its name and symbols, value and share, over a hairline with a
 * bar and a lime knob as long as its share of the largest industry.
 */
function IndustryRow({
  slice,
  value,
  mobile,
}: {
  slice: IndustrySlice;
  value: { primary: string; secondary: string | null };
  mobile: boolean;
}) {
  const at = `${slice.ofLargest * 100}%` as const;
  const amount = `${value.primary} ${value.secondary ?? ''}`.trim();
  return (
    <View
      testID={`industry-${slice.name}`}
      className="gap-y-[6px] border-t border-row-border py-[9px] ios:py-[10px]"
    >
      <View className="min-w-0 flex-row items-baseline gap-x-[8px]">
        <Text className="font-sans text-[13px] text-ink">{slice.name}</Text>
        <Text
          numberOfLines={1}
          className="min-w-0 shrink font-sans text-[11px] text-muted ios:flex-1"
        >
          {slice.symbols.join(' · ')}
        </Text>
        {!mobile && (
          <Text
            numberOfLines={1}
            className="ml-auto font-sans text-[11px] tabular-nums text-muted"
          >
            {amount}
          </Text>
        )}
        <Text className="w-[40px] text-right font-sans text-[13px] tabular-nums text-ink ios:w-auto">
          {formatPercent(slice.share * 100, 0)}
        </Text>
      </View>
      <View className="h-[12px]">
        <View className="absolute left-0 right-0 top-[6px] h-px bg-ink/[.12]" />
        <View
          testID={`industry-${slice.name}-bar`}
          className="absolute left-0 top-[5.5px] h-[2px] bg-ink"
          // Its share of the largest: data, so not a class.
          style={{ width: at }}
        />
        <View
          className="absolute top-0 -ml-[6px] size-[12px] items-center justify-center rounded-full bg-lime/50"
          style={{ left: at }}
        >
          <View className="size-[5px] rounded-full bg-ink" />
        </View>
      </View>
      {mobile && (
        <Text className="font-sans text-[11px] tabular-nums text-muted">
          {amount}
        </Text>
      )}
    </View>
  );
}
