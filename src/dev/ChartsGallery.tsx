/**
 * Temporary: Phase G's charts with the design's mock data, so they can be
 * checked by eye on macOS and iOS. Mounted from SurfacesGallery until the
 * pages exist (Phase H); delete it then.
 */

import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { MultiStrandLine } from '@/components/charts/MultiStrandLine';
import { Sphere } from '@/components/charts/Sphere';
import type { SphereClass } from '@/components/charts/sphereLayout';
import { ChipRow } from '@/components/ui/ChipRow';
import { GradientCard } from '@/components/ui/GradientCard';
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

export function ChartsGallery() {
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<string>('24');
  return (
    <View className="gap-y-2">
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
