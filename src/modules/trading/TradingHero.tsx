import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { EchoLine } from '@/components/charts/EchoLine';
import { sampleIndices, type YMapper } from '@/components/charts/lineLayout';
import { Glass } from '@/components/ui/Glass';
import { GradientFill } from '@/components/ui/GradientFill';
import { Segmented } from '@/components/ui/Segmented';
import { cx } from '@/components/ui/cardChrome';
import { AddButton } from '@/components/ui/Empty';
import { useBars } from '@/hooks/useBars';
import type { BarRange } from '@/lib/queryKeys';
import { useUiStore, type TradingMode } from '@/stores/uiStore';
import { gradients } from '@/theme/gradients';
import { capitalSeries, pnlSeries, totalsOf } from '@/utils/derive/portfolio';
import { formatDayMonth } from '@/utils/format/date';
import {
  formatAmount,
  formatMoney,
  formatSignedCompactMoney,
  formatSignedMoney,
  formatSignedPercent,
} from '@/utils/format/money';
import { SymbolPicker } from './SymbolPicker';
import type { Book } from './useTradingBook';

const MODES = [
  { value: 'growth', label: 'Growth' },
  { value: 'position', label: 'Position' },
] as const;

const RANGES = (['1M', '3M', '6M', '1Y'] as const).map(r => ({
  value: r,
  label: r,
}));

/** The line runs from 6% to 80% of the chart's height, as the design's does. */
const TOP = 6;
const SPAN = 74;

/**
 * The Trading hero: the heading with the Growth / Position switch, the symbol
 * picker (Position mode only) and the range; the portfolio's value, with its
 * change over the range and its unrealised P&L under it, all following the
 * chart's hover; the P&L chart with the capital invested beside it; and a
 * strip of the chart's eight sample points.
 * The chart and the strip share one hover: pointing at either shows that day
 * in both and in the readout. On mobile the range sits under the chart and the
 * strip takes two rows.
 *
 * Before the first buy there is nothing to chart: the design's empty hero.
 */
export function TradingHero({
  book,
  animate = true,
}: {
  book: Book;
  animate?: boolean;
}) {
  const mode = useUiStore(s => s.tradingMode);
  const preferred = useUiStore(s => s.tradingSymbol);
  const range = useUiStore(s => s.tradingRange);
  const setUi = useUiStore(s => s.set);
  // Local, so hovering re-renders the hero and not the page.
  const [hover, setHover] = useState<number | null>(null);
  const mobile = Platform.OS === 'ios';

  const { holdings } = book;
  const symbol = holdings.some(h => h.symbol === preferred)
    ? preferred!
    : holdings[0]?.symbol ?? null;
  const position = mode === 'position';
  const selected = useMemo(
    () => (position ? holdings.filter(h => h.symbol === symbol) : holdings),
    [position, holdings, symbol],
  );
  const { bars } = useBars(
    selected.map(h => h.symbol),
    range,
  );
  const { dates, values } = useMemo(
    () => pnlSeries(selected, bars),
    [selected, bars],
  );
  const y = useMemo(() => scaleOf(values), [values]);
  const capital = useMemo(() => {
    const invested = capitalSeries(selected, dates);
    return { values: invested, y: capitalScaleOf(invested) };
  }, [selected, dates]);

  if (holdings.length === 0 && book.sales.length === 0) {
    return <EmptyTradingHero />;
  }

  const n = values.length;
  const day = hover !== null && hover < n ? hover : null;
  const last = values[n - 1] ?? 0;
  const selectedTotals = totalsOf(selected);
  // The day's P&L, and so its value: the P&L series is value less cost basis.
  const pnl = day === null ? selectedTotals.pnlCents : values[day]!;
  const value = pnl + selectedTotals.costCents;
  const onCost =
    selectedTotals.costCents > 0 ? (pnl / selectedTotals.costCents) * 100 : 0;
  const invested = capital.values[day ?? n - 1] ?? selectedTotals.costCents;
  const change = last - (values[0] ?? 0);

  const pick = (s: string) => {
    setHover(null);
    setUi({ tradingMode: 'position', tradingSymbol: s });
  };

  const modeSwitch = (
    <Segmented
      testID="trading-mode"
      size="mode"
      options={MODES}
      value={mode}
      onChange={m => {
        setHover(null);
        setUi({ tradingMode: m as TradingMode });
      }}
    />
  );
  const picker = position && symbol && (
    <SymbolPicker holdings={holdings} symbol={symbol} onPick={pick} />
  );
  const rangeSwitch = (
    <Segmented
      testID="trading-range"
      size="range"
      options={RANGES}
      value={range}
      onChange={r => {
        setHover(null);
        setUi({ tradingRange: r as BarRange });
      }}
    />
  );
  // Names the two lines, right under the range toggle.
  const legend = (
    <View
      testID="trading-legend"
      pointerEvents="none"
      className={cx(
        'flex-row items-center gap-x-[16px]',
        mobile ? 'self-end' : 'absolute right-0 top-full mt-[8px]',
      )}
    >
      <View className="flex-row items-center gap-x-[6px]">
        <View className="h-[1.5px] w-[14px] bg-ink" />
        <Text className="font-sans text-[11px] text-muted">Unrealised P&L</Text>
      </View>
      <View className="flex-row items-center gap-x-[6px]">
        <View className="h-[1.2px] w-[14px] bg-lime-dark" />
        <Text className="font-sans text-[11px] text-muted">
          Capital invested
        </Text>
      </View>
    </View>
  );
  const rangeWithLegend = (
    <View className="ml-auto ios:ml-0 ios:gap-y-[10px]">
      {rangeSwitch}
      {n > 1 && legend}
    </View>
  );

  return (
    <View
      testID="trading-hero"
      className="min-h-0 flex-1 pl-[6px] pt-[6px] ios:flex-none ios:gap-y-[12px] ios:p-0"
    >
      <View className="ios:gap-y-[12px] ios:px-[4px]">
        <View className="flex-row items-center gap-x-[12px] ios:justify-between ios:gap-x-[10px]">
          <Text className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]">
            Trading
          </Text>
          {modeSwitch}
          {!mobile && picker}
          {!mobile && rangeWithLegend}
        </View>
        {mobile && picker}

        <View className="mt-[14px] ios:mt-0 ios:gap-y-[8px]">
          <View className="flex-row items-end gap-x-[18px] ios:flex-col ios:items-start ios:gap-y-[8px]">
            <View className="flex-row items-start gap-x-[6px] ios:gap-x-[5px]">
              <Text className="mt-[10px] font-sans text-[22px] font-light text-muted ios:mt-[8px] ios:text-[20px]">
                S$
              </Text>
              <Text
                testID="trading-value"
                className="font-sans text-[64px] font-light leading-[61px] tracking-[-0.035em] tabular-nums text-ink ios:text-[52px] ios:leading-[49px]"
              >
                {formatAmount(value)}
              </Text>
            </View>
            {/* The P&L label, and the P&L under it where the design's chip was. */}
            <View className="mb-[4px] min-w-0 shrink gap-y-[6px] ios:mb-0 ios:gap-y-[8px]">
              <Text
                testID="trading-pnl-label"
                numberOfLines={1}
                className="font-sans text-[14px] text-muted"
              >
                {day !== null
                  ? `Unrealised P&L on ${formatDayMonth(dates[day]!)}`
                  : `Unrealised P&L · ${position ? symbol : 'all positions'}`}
              </Text>
              <Text
                testID="trading-pnl"
                className={cx(
                  'font-sans text-[16px] tabular-nums',
                  pnl < 0 ? 'text-danger' : 'text-ink',
                )}
              >
                {formatSignedMoney(pnl)}{' '}
                <Text testID="trading-invested" className="text-muted">
                  ({formatMoney(invested)} invested)
                </Text>
              </Text>
            </View>
          </View>
          <View className="mt-[10px] flex-row flex-wrap items-center gap-[8px] ios:mt-0">
            <Glass
              recipe="chip"
              radius={6}
              className="flex-row items-center gap-x-[6px] px-[9px] py-[4px] ios:px-[10px] ios:py-[6px]"
            >
              <View
                testID="trading-period-dot"
                className={cx(
                  'size-[6px] rounded-full',
                  change >= 0 ? 'bg-lime-dark' : 'bg-danger',
                )}
              />
              <Text
                testID="trading-period"
                className="font-sans text-[12px] text-ink"
              >
                {`${formatSignedMoney(change)} over ${range}`}
              </Text>
            </Glass>
            <Text
              testID="trading-pnl-sub"
              className="font-sans text-[12px] text-muted"
            >
              {`${formatSignedPercent(onCost)} on cost`}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-[14px] min-h-0 flex-1 ios:ml-[4px] ios:mt-[4px] ios:h-[200px] ios:flex-none">
        <View className="absolute left-[30%] top-0 h-full w-[55%] ios:left-[25%] ios:w-[60%]">
          <GradientFill
            gradient={mobile ? gradients.pnlGlowMobile : gradients.pnlGlow}
          />
        </View>
        {n > 1 && (
          <EchoLine
            testID="trading-chart"
            values={values}
            y={y}
            hover={day}
            onHover={setHover}
            capital={capital}
            revealKey={`${range}-${mode}-${symbol}`}
            animate={animate}
          />
        )}
      </View>

      {mobile && rangeWithLegend}

      <Strip
        values={values}
        dates={dates}
        hover={day}
        onHover={setHover}
        mobile={mobile}
      />
    </View>
  );
}

/**
 * No positions yet: S$0 of portfolio value, a flat dashed baseline ending at
 * S$0 with a way to add the first holding over it, and zeros in the strip.
 */
function EmptyTradingHero() {
  const setUi = useUiStore(s => s.set);
  const stats = [
    ['Capital invested', formatMoney(0)],
    ['Unrealised P&L', formatMoney(0)],
    ['Realised P&L', formatMoney(0)],
    ['Positions', '0'],
  ];
  return (
    <View
      testID="trading-hero"
      className="min-h-0 flex-1 pl-[6px] pt-[6px] ios:flex-none ios:gap-y-[12px] ios:p-0"
    >
      <View className="ios:gap-y-[12px] ios:px-[4px]">
        <View className="flex-row items-center gap-x-[12px] ios:justify-between ios:gap-x-[10px]">
          <Text className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]">
            Trading
          </Text>
          <Glass
            testID="trading-empty-chip"
            recipe="chip"
            radius={6}
            className="px-[10px] py-[6px]"
          >
            <Text className="font-sans text-[12px] text-muted">
              No positions yet
            </Text>
          </Glass>
        </View>
        <View className="mt-[14px] flex-row items-end gap-x-[18px] ios:mt-0 ios:flex-col ios:items-start ios:gap-y-[8px]">
          <View className="flex-row items-start gap-x-[6px] ios:gap-x-[5px]">
            <Text className="mt-[10px] font-sans text-[22px] font-light text-muted ios:mt-[8px] ios:text-[20px]">
              S$
            </Text>
            <Text
              testID="trading-value"
              className="font-sans text-[64px] font-light leading-[61px] tracking-[-0.035em] text-ink ios:text-[52px] ios:leading-[49px]"
            >
              0
            </Text>
          </View>
          <View className="mb-[4px] min-w-0 shrink gap-y-[6px] ios:mb-0">
            <Text className="font-sans text-[14px] text-muted">
              Portfolio value
            </Text>
            <Text className="font-sans text-[12px] text-muted">
              Growth and P&L start from your first buy
            </Text>
          </View>
        </View>
      </View>

      <View
        testID="trading-empty-chart"
        className="mr-[44px] mt-[14px] min-h-0 flex-1 ios:ml-[4px] ios:mt-[4px] ios:h-[200px] ios:flex-none"
      >
        {['top-[12%]', 'top-[37%]', 'top-[62%]'].map(top => (
          <View
            key={top}
            className={`absolute inset-x-0 border-t border-ink/[.05] ${top}`}
          />
        ))}
        <View className="absolute inset-x-0 top-[86%] border-t border-dashed border-ink/[.28]" />
        <View className="absolute -right-[7px] top-[86%] -mt-[7px] size-[14px] items-center justify-center rounded-full bg-lime/35">
          <View className="size-[7px] rounded-full border border-ink/20 bg-lime" />
        </View>
        <Text className="absolute -right-[36px] top-[86%] -mt-[7px] font-sans text-[10px] text-muted">
          {formatMoney(0)}
        </Text>
        <View className="absolute inset-x-0 top-[45%] -translate-y-1/2 items-center gap-y-[12px]">
          <Text className="max-w-[320px] text-center font-sans text-[13px] text-muted">
            Add a holding with its buy date and price. The chart backfills from
            there.
          </Text>
          {/* Button sits at its start; a shrink-wrapped holder centres it. */}
          <View>
            <AddButton
              testID="trading-empty-add"
              label="Add position"
              onPress={() => setUi({ addPositionOpen: true })}
            />
          </View>
        </View>
      </View>

      <View
        testID="trading-strip"
        className="mr-[44px] mt-[10px] flex-row gap-x-[4px] border-t border-ink/[.08] pt-[8px] ios:mr-0 ios:mt-0 ios:flex-wrap ios:gap-y-[8px]"
      >
        {stats.map(([label, value]) => (
          <View
            key={label}
            className="min-w-0 flex-1 gap-y-[2px] ios:basis-[45%]"
          >
            <Text className="font-sans text-[11px] text-muted">{label}</Text>
            <Text className="font-sans text-[15px] text-ink">{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Highest at 6% of the chart's height, lowest at 80%; a flat series sits mid-way. */
function scaleOf(values: readonly number[]): YMapper {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  // Less than a dollar apart: widen, as the design does, so the line sits mid-way.
  if (hi - lo < 100) {
    hi += 100;
    lo -= 100;
  }
  return v => TOP + (1 - (v - lo) / (hi - lo)) * SPAN;
}

/**
 * The capital line's own scale: from 16% to 60% of the chart's height, as the
 * design has it, so it sits clear of the P&L line's lows; flat at 30%.
 */
function capitalScaleOf(values: readonly number[]): YMapper {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return hi - lo < 100 ? () => 30 : v => 16 + (1 - (v - lo) / (hi - lo)) * 44;
}

/**
 * The eight sample points under the chart: each one's date, P&L and change on
 * the one before. Hovering one (or tapping, on mobile) points the chart there.
 */
function Strip({
  values,
  dates,
  hover,
  onHover,
  mobile,
}: {
  values: readonly number[];
  dates: readonly string[];
  hover: number | null;
  onHover: (i: number | null) => void;
  mobile: boolean;
}) {
  const samples = values.length > 1 ? sampleIndices(values.length) : [];
  const cells = samples.map((j, k) => {
    const prior = k > 0 ? values[j]! - values[samples[k - 1]!]! : null;
    return (
      // A bare cell per column: a padded cell's padding would widen its share.
      <View key={k} className="min-w-0 flex-1">
        <Pressable
          testID={`trading-strip-${k}`}
          onHoverIn={() => onHover(j)}
          onHoverOut={() => onHover(null)}
          onPress={() => onHover(j)}
          className={cx(
            'gap-y-[2px] rounded-6 px-[8px] py-[5px] ios:py-[6px]',
            hover === j && 'bg-white/70',
          )}
        >
          <Text numberOfLines={1} className="font-sans text-[10px] text-muted">
            {formatDayMonth(dates[j]!)}
          </Text>
          <Text
            numberOfLines={1}
            className="font-sans text-[13px] tabular-nums text-ink"
          >
            {formatSignedCompactMoney(values[j]!)}
          </Text>
          <Text
            numberOfLines={1}
            className={cx(
              'font-sans text-[10px]',
              prior !== null && prior < 0 ? 'text-danger' : 'text-muted',
            )}
          >
            {prior === null
              ? 'Start of range'
              : `${formatSignedCompactMoney(prior)} vs prior`}
          </Text>
        </Pressable>
      </View>
    );
  });
  const rows = mobile ? [cells.slice(0, 4), cells.slice(4)] : [cells];
  return (
    <View
      testID="trading-strip"
      className="mt-[10px] gap-y-[4px] border-t border-ink/[.08] pt-[8px] ios:mt-0"
    >
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-x-[4px]">
          {row}
        </View>
      ))}
    </View>
  );
}
