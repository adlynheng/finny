/**
 * Temporary: Phase G's charts with the design's mock data, so they can be
 * checked by eye on macOS and iOS. Mounted from SurfacesGallery until the
 * pages exist (Phase H); delete it then.
 */

import { useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { CashflowArea } from '@/components/charts/CashflowArea';
import { EchoLine } from '@/components/charts/EchoLine';
import { MixRing } from '@/components/charts/MixRing';
import type { MixPart } from '@/components/charts/mixLayout';
import { MultiStrandLine } from '@/components/charts/MultiStrandLine';
import { RadialDial } from '@/components/charts/RadialDial';
import { Rings } from '@/components/charts/Rings';
import { allocationDial, budgetDial } from '@/components/charts/dialConfigs';
import { Sparkline } from '@/components/charts/Sparkline';
import { Sphere } from '@/components/charts/Sphere';
import { StrandsFlow } from '@/components/charts/StrandsFlow';
import type { SphereClass } from '@/components/charts/sphereLayout';
import { ChipRow } from '@/components/ui/ChipRow';
import { GradientCard } from '@/components/ui/GradientCard';
import {
  designBudget,
  designGrossCents,
  designPlan,
} from '../../test/dialCases';
import { designHistory } from '../../test/historyCases';

// The Overview design's breakdown and its Oct 2024 / Sep 2026 net worth.
const classes: SphereClass[] = [
  { key: 'cash', label: 'Cash', cents: 4_230_000 },
  { key: 'cpf', label: 'CPF', cents: 6_517_000 },
  { key: 'inv', label: 'Investments', cents: 7_895_000 },
  { key: 'prop', label: 'Property', cents: 12_000_000 },
];

const desktop = Platform.OS === 'macos';

const ranges = ['6', '12', '24'] as const;

// The Trading design's mock health scores, and two extremes to check by eye.
const healthCases: Record<string, number[]> = {
  mock: [69, 77, 80],
  low: [12, 48, 51],
  full: [100, 100, 0],
};

// The Trading design's holdings by instrument type, and its USD/SGD rate.
const mixParts: MixPart[] = [
  { key: 'Stock', label: 'Stock', cents: 4_428_157 },
  { key: 'ETF', label: 'ETF', cents: 4_419_876 },
  { key: 'REIT', label: 'REIT', cents: 636_000 },
];
const USD_SGD = 1.3512;

// Six months of unrealised P&L in S$ that dips below zero and recovers, and
// the same shifted up so it never crosses.
const pnlCases: Record<string, number[]> = {
  crossing: Array.from({ length: 181 }, (_, i) =>
    Math.round(2600 * Math.sin(i / 28) + 18 * i - 900 + 260 * Math.sin(i / 5)),
  ),
};
pnlCases.above = pnlCases.crossing!.map(v => v + 4000);

// The design's scale: the range fills y 6 to 80 of the 100-unit box.
const pnlScale = (values: readonly number[]) => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (v: number) => 6 + (1 - (v - lo) / (hi - lo || 1)) * 74;
};

// Thirty days of prices for a few Watchlist rows, and today's change.
const sparks = [
  { sym: 'NVDA', dayChange: 2.14, drift: 0.9 },
  { sym: 'AAPL', dayChange: -0.62, drift: -0.4 },
  { sym: 'D05', dayChange: 0.18, drift: 0.2 },
  { sym: 'TSLA', dayChange: -3.4, drift: -1.2 },
].map(s => ({
  ...s,
  values: Array.from(
    { length: 29 },
    (_, j) => 100 + s.drift * j + 4 * Math.sin(j / 2 + s.sym.length),
  ),
}));

// The Finance design's last twelve months of income and expenses (S$), capped
// at S$14,500, and its savings rate with two extremes to check by eye.
const flowIncome = [
  6800, 6800, 13600, 6800, 6800, 8900, 6800, 6800, 6800, 6800, 7120, 7862,
];
const flowExpense = [
  4100, 4520, 5900, 3980, 4750, 4200, 4380, 4050, 5200, 4300, 4460, 4660,
];
const flowMonths = [
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
];
const rates: Record<string, number> = {
  '40.7%': (7862 - 4660) / 7862,
  '10%': 0.1,
  '85%': 0.85,
};

/** The Finance flow card's two views, with their own state (see EchoDemo). */
function FlowDemo() {
  const [rate, setRate] = useState('40.7%');
  const [months, setMonths] = useState('12');
  const [month, setMonth] = useState<number | null>(null);
  const n = Number(months);
  const income = useMemo(() => flowIncome.slice(12 - n), [n]);
  const expense = useMemo(() => flowExpense.slice(12 - n), [n]);
  const labels = useMemo(() => flowMonths.slice(12 - n), [n]);
  const sel = month ?? n - 1;
  return (
    <>
      <Text className="font-sans text-[11px] text-muted">
        Savings strands: pick a rate
      </Text>
      <ChipRow
        options={Object.keys(rates).map(r => ({ value: r, label: r }))}
        value={rate}
        onChange={r => setRate(r ?? '40.7%')}
      />
      <GradientCard
        gradient="netWorthHistory"
        className={desktop ? 'h-[200px] w-[560px]' : 'w-full'}
      >
        <View
          className={
            desktop ? 'my-[6px] flex-1' : 'mx-1 mb-[6px] mt-[18px] h-[120px]'
          }
        >
          <StrandsFlow rate={rates[rate]!} compact={!desktop} />
        </View>
      </GradientCard>
      <Text className="font-sans text-[11px] text-muted">
        {`Cash flow: ${desktop ? 'hover' : 'tap or drag'} a month · `}
        {`${flowMonths[12 - n + sel]}: in S$${income[sel]} · out S$${
          expense[sel]
        }`}
      </Text>
      <ChipRow
        options={[
          { value: '6', label: '6M' },
          { value: '12', label: '12M' },
        ]}
        value={months}
        onChange={m => {
          setMonths(m ?? '12');
          setMonth(null);
        }}
      />
      <GradientCard
        gradient="netWorthHistory"
        className={desktop ? 'h-[240px] w-[560px]' : 'w-full'}
      >
        <View className={desktop ? 'mt-3 flex-1' : 'mt-[14px] h-[150px]'}>
          <CashflowArea
            income={income}
            expense={expense}
            labels={labels}
            max={14500}
            onHover={setMonth}
            compact={!desktop}
          />
        </View>
      </GradientCard>
    </>
  );
}

/**
 * The P&L chart with its own hover state, so hovering it re-renders only this
 * demo, not every chart in the gallery (the Trading screen must do the same).
 */
function EchoDemo() {
  const [pnlCase, setPnlCase] = useState<string>('crossing');
  const [pnlHover, setPnlHover] = useState<number | null>(null);
  const pnl = pnlCases[pnlCase]!;
  const pnlY = useMemo(() => pnlScale(pnl), [pnl]);
  return (
    <>
      <Text className="font-sans text-[11px] text-muted">
        {`P&L echo line: ${desktop ? 'hover' : 'drag'} the chart · `}
        {pnlHover === null
          ? 'no day hovered'
          : `day ${pnlHover}: S$${pnl[pnlHover]!.toLocaleString('en-US')}`}
      </Text>
      <ChipRow
        options={[
          { value: 'crossing', label: 'Crosses zero' },
          { value: 'above', label: 'Stays up' },
        ]}
        value={pnlCase}
        onChange={c => {
          setPnlCase(c ?? 'crossing');
          setPnlHover(null);
        }}
      />
      <View
        className={
          desktop
            ? 'h-[260px] w-[560px] pr-[44px]'
            : 'h-[200px] w-full pr-[44px]'
        }
      >
        <EchoLine
          values={pnl}
          y={pnlY}
          onHover={setPnlHover}
          revealKey={pnlCase}
        />
      </View>
    </>
  );
}

export function ChartsGallery() {
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<string>('24');
  const [dialState, setDialState] = useState<string>('normal');
  const [planFocus, setPlanFocus] = useState<string | null>(null);
  const [health, setHealth] = useState<string>('mock');
  const [mixType, setMixType] = useState<string | null>(null);
  const over = dialState === 'over';
  return (
    <View className="gap-y-2">
      <FlowDemo />
      <EchoDemo />
      <Text className="font-sans text-[11px] text-muted">
        Watchlist sparklines: danger on a down day
      </Text>
      {sparks.map(s => (
        <View key={s.sym} className="flex-row items-center gap-x-3">
          <Text className="w-12 font-sans text-[12px] text-ink">{s.sym}</Text>
          <Sparkline
            values={s.values}
            dayChange={s.dayChange}
            compact={!desktop}
          />
          <Text
            className={
              s.dayChange < 0
                ? 'font-sans text-[12px] text-danger'
                : 'font-sans text-[12px] text-ink'
            }
          >
            {`${s.dayChange < 0 ? '−' : '+'}${Math.abs(s.dayChange).toFixed(
              2,
            )}%`}
          </Text>
        </View>
      ))}
      <Text className="font-sans text-[11px] text-muted">
        Portfolio mix ring: tap a type to highlight it (the page will use the
        list's rows)
      </Text>
      <ChipRow
        options={mixParts.map(p => ({ value: p.key, label: p.label }))}
        value={mixType}
        onChange={key => setMixType(t => (t === key ? null : key))}
      />
      <View className={desktop ? 'size-[300px]' : 'size-[200px] self-center'}>
        <MixRing parts={mixParts} usdSgdRate={USD_SGD} selected={mixType} />
      </View>
      <Text className="font-sans text-[11px] text-muted">
        Portfolio health rings: the design's scores, then two extremes
      </Text>
      <ChipRow
        options={[
          { value: 'mock', label: '69 · 77 · 80' },
          { value: 'low', label: '12 · 48 · 51' },
          { value: 'full', label: '100 · 100 · 0' },
        ]}
        value={health}
        onChange={v => setHealth(v ?? 'mock')}
      />
      <GradientCard
        gradient="portfolioHealth"
        className={desktop ? 'w-[340px]' : 'w-full'}
      >
        <Text className="font-sans text-[13px] text-white">
          Portfolio health
        </Text>
        <View className={desktop ? 'mt-1 size-[128px]' : 'mt-1 size-[112px]'}>
          <Rings scores={healthCases[health]!} />
        </View>
      </GradientCard>
      <Text className="font-sans text-[11px] text-muted">
        Dials: budget (left) and monthly plan (right); tap a category to
        highlight it
      </Text>
      <ChipRow
        options={[
          { value: 'normal', label: 'Within limit' },
          { value: 'over', label: 'Over' },
        ]}
        value={dialState}
        onChange={v => setDialState(v ?? 'normal')}
      />
      <ChipRow
        options={designPlan.map(c => ({ value: c.key, label: c.name }))}
        value={planFocus}
        onChange={key => setPlanFocus(f => (f === key ? null : key))}
      />
      <View className={desktop ? 'flex-row gap-x-6' : 'gap-y-4'}>
        <View className={desktop ? 'w-[392px]' : 'w-[300px] self-center'}>
          <RadialDial
            key={`budget-${dialState}`}
            testID="budget-dial"
            {...budgetDial({
              ...designBudget,
              spentCents: over ? 400_000 : designBudget.spentCents,
            })}
          />
        </View>
        <View className={desktop ? 'w-[392px]' : 'w-[300px] self-center'}>
          <RadialDial
            key={`plan-${dialState}`}
            testID="plan-dial"
            selected={planFocus}
            {...allocationDial({
              grossCents: designGrossCents,
              categories: over
                ? designPlan.map(c =>
                    c.key === 'exp' ? { ...c, cents: 400_000 } : c,
                  )
                : designPlan,
            })}
          />
        </View>
      </View>
      <Text className="font-sans text-[11px] text-muted">
        {desktop
          ? 'History: hover for the crosshair; switch range to replay the reveal'
          : 'History: drag or tap for the crosshair'}
      </Text>
      <ChipRow
        options={ranges.map(r => ({ value: r, label: `${r}M` }))}
        value={range}
        onChange={r => setRange(r ?? '24')}
      />
      <GradientCard
        gradient="netWorthHistory"
        className={desktop ? 'h-[272px] w-[460px]' : 'w-full'}
      >
        <Text className="font-sans text-[13px] text-white">
          Net worth history
        </Text>
        <View
          className={
            desktop ? 'mb-2 mt-[18px] flex-1' : 'mb-2 mt-[52px] h-[170px]'
          }
        >
          <MultiStrandLine
            points={designHistory.slice(-Number(range))}
            compact={!desktop}
          />
        </View>
      </GradientCard>
      <Text className="font-sans text-[11px] text-muted">
        {desktop
          ? 'Sphere: hover a tick group'
          : 'Sphere (mobile: no labels): tap a chip'}
        {` · selected: ${selected ?? 'none'}`}
      </Text>
      <View className={desktop ? 'w-[560px]' : 'w-full'}>
        <Sphere
          classes={classes}
          oldest={{ month: '2024-10', cents: 16_820_000 }}
          newestCents={24_242_000}
          selected={selected}
          onSelect={setSelected}
          labels={desktop}
        />
      </View>
      {!desktop && (
        <ChipRow
          options={classes.map(c => ({ value: c.key, label: c.label }))}
          value={selected}
          onChange={key => setSelected(s => (s === key ? null : key))}
        />
      )}
    </View>
  );
}
