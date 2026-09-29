import { Pressable, Text, View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { useUiStore } from '@/stores/uiStore';
import { formatKMoney } from '@/utils/format/money';
import { useClassSlices } from './OverviewSphere';

type Slice = ReturnType<typeof useClassSlices>[number];

/**
 * Mobile's stand-in for the sphere's class labels: a two-column grid of glass
 * chips, one per asset class, with its share and balance. There is no hover on
 * a phone, so tapping a chip highlights its class on the sphere and tapping the
 * highlighted one clears it. The highlighted chip turns solid white.
 */
export function AssetClassChips() {
  const slices = useClassSlices();
  const selected = useUiStore(s => s.hoveredAssetClassId);
  const setUi = useUiStore(s => s.set);

  const rows: Slice[][] = [];
  for (let i = 0; i < slices.length; i += 2) {
    rows.push(slices.slice(i, i + 2));
  }

  return (
    <View testID="asset-chips" className="gap-y-[6px]">
      {rows.map(row => (
        <View key={row[0]!.id} className="flex-row gap-x-[6px]">
          {row.map(c => (
            <Pressable
              key={c.id}
              testID={`asset-chip-${c.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: c.id === selected }}
              onPress={() =>
                setUi({
                  hoveredAssetClassId: c.id === selected ? null : c.id,
                  hoveredAccountId: null,
                })
              }
              className="flex-1 basis-0"
            >
              <Glass
                recipe="chip"
                radius={8}
                fill={c.id === selected ? 'bg-white' : undefined}
                className="gap-y-[3px] px-[12px] py-[10px]"
              >
                <View className="flex-row items-baseline justify-between gap-x-[6px]">
                  <Text className="font-sans text-[12px] text-muted">
                    {c.label}
                  </Text>
                  <Text className="font-sans text-[11px] text-muted">
                    {Math.round(c.fraction * 100)}%
                  </Text>
                </View>
                <Text className="font-sans text-[22px] font-light leading-[22px] tracking-[-0.02em] text-ink">
                  {formatKMoney(c.cents)}
                </Text>
              </Glass>
            </Pressable>
          ))}
          {/* An odd last chip keeps its column's width. */}
          {row.length === 1 && <View className="flex-1 basis-0" />}
        </View>
      ))}
    </View>
  );
}
