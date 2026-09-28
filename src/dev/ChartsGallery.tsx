/**
 * Temporary: Phase G's charts with the design's mock data, so they can be
 * checked by eye on macOS and iOS. Mounted from SurfacesGallery until the
 * pages exist (Phase H); delete it then.
 */

import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { MixRing } from '@/components/charts/MixRing';
import type { MixPart } from '@/components/charts/mixLayout';
import { MultiStrandLine } from '@/components/charts/MultiStrandLine';
import { RadialDial } from '@/components/charts/RadialDial';
import { Rings } from '@/components/charts/Rings';
import { allocationDial, budgetDial } from '@/components/charts/dialConfigs';
import { Sphere } from '@/components/charts/Sphere';
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
