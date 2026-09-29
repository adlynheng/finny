import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cx } from '@/components/ui/cardChrome';
import { Glass } from '@/components/ui/Glass';
import { GradientCard } from '@/components/ui/GradientCard';
import { useAccounts } from '@/hooks/useAccounts';
import { useAssetClasses } from '@/hooks/useAssetClasses';
import { useUiStore } from '@/stores/uiStore';
import { tokens } from '@/theme/tokens';
import { classIdOf, shareOfAssets } from '@/utils/derive/networth';
import { formatMoney, formatPercent } from '@/utils/format/money';

type Row = ReturnType<typeof shareOfAssets>[number];

/** The bar's height (h-[34px]), so the hatch lines run its full height. */
const HATCH_HEIGHT = 34;

/** Each account type's square and segment, brightest for cash; any other type as a broker. */
const TYPE_FILL: Record<string, string> = {
  Savings: 'bg-white',
  CPF: 'bg-white/[.72]',
  Broker: 'bg-white/45',
};
const typeFill = (type: string) => TYPE_FILL[type] ?? TYPE_FILL.Broker;

/**
 * The gold card: every asset account's share of the total, as a segmented bar
 * and a list. Hovering a segment or a row sets `hoveredAccountId` and its
 * class's `hoveredAssetClassId`, so the sphere highlights that class; the
 * sphere's own hover lights every account in the class here. The hovered
 * account's balance and share replace the total in the headline.
 */
export function ShareOfAssetsCard() {
  const accounts = useAccounts().data;
  const classes = useAssetClasses().data;
  const hoveredAccount = useUiStore(s => s.hoveredAccountId);
  const hoveredClass = useUiStore(s => s.hoveredAssetClassId);
  const setUi = useUiStore(s => s.set);

  const rows = accounts ? shareOfAssets(accounts) : [];
  const totalCents = rows.reduce((sum, r) => sum + r.cents, 0);
  const classOf = (r: Row) => (classes ? classIdOf(r, classes) : null);
  const lit = (r: Row) =>
    hoveredAccount !== null
      ? r.id === hoveredAccount
      : hoveredClass !== null && classOf(r) === hoveredClass;
  const anyLit = rows.some(lit);
  const shown = rows.find(r => r.id === hoveredAccount);

  const hover = (r: Row) => ({
    onHoverIn: () =>
      setUi({ hoveredAccountId: r.id, hoveredAssetClassId: classOf(r) }),
    onHoverOut: () =>
      setUi({ hoveredAccountId: null, hoveredAssetClassId: null }),
  });

  return (
    <GradientCard
      testID="share-card"
      gradient="shareOfAssets"
      className="flex-1"
    >
      <View className="gap-y-[2px]">
        <Text className="font-sans text-[13px] text-white">
          Share of assets
        </Text>
        <Text className="font-sans text-[11px] text-white opacity-90">
          By account · credit cards excluded
        </Text>
      </View>
      <View className="mt-[10px] flex-row items-baseline justify-between gap-x-[8px]">
        <Text
          testID="share-value"
          className="font-sans text-[36px] font-light leading-[36px] tracking-[-0.02em] text-white"
        >
          {formatMoney(shown?.cents ?? totalCents)}
        </Text>
        <Text
          testID="share-label"
          numberOfLines={1}
          className="shrink font-sans text-[13px] text-white"
        >
          {shown
            ? `${shown.name} · ${formatPercent(shown.fraction * 100)}`
            : `Across ${rows.length} accounts`}
        </Text>
      </View>
      <View className="mt-[14px] h-[34px] flex-row gap-x-[2px]">
        {rows.map(r => (
          <Pressable
            key={r.id}
            testID={`share-segment-${r.id}`}
            {...hover(r)}
            className={cx(
              'min-w-[3px] basis-0 overflow-hidden rounded-[3px]',
              lit(r) ? 'bg-lime' : anyLit ? 'bg-white/25' : typeFill(r.type),
            )}
            // The segment's share of the bar: data, so not a class.
            style={{ flexGrow: r.cents }}
          >
            <Hatch />
          </Pressable>
        ))}
      </View>
      <ScrollView
        className="mt-[14px] min-h-0 flex-1"
        contentContainerClassName="grow gap-y-[4px]"
        showsVerticalScrollIndicator={false}
      >
        {rows.map(r => (
          <Pressable
            key={r.id}
            testID={`share-row-${r.id}`}
            {...hover(r)}
            className="min-h-[34px] grow basis-0"
          >
            <Glass
              recipe="onGradient"
              radius={8}
              fill={lit(r) ? 'bg-white/[.26]' : undefined}
              className="flex-1 flex-row items-center gap-x-[10px] px-[12px]"
            >
              <View
                className={cx(
                  'size-[8px] rounded-[2px]',
                  lit(r) ? 'bg-lime' : typeFill(r.type),
                )}
              />
              <Text
                numberOfLines={1}
                className="min-w-0 flex-1 font-sans text-[12px] text-white"
              >
                {r.name}
              </Text>
              <Text className="font-sans text-[11px] tabular-nums text-white opacity-90">
                {formatMoney(r.cents)}
              </Text>
              <Text className="w-[36px] text-right font-sans text-[12px] tabular-nums text-white">
                {formatPercent(r.fraction * 100, 0)}
              </Text>
            </Glass>
          </Pressable>
        ))}
      </ScrollView>
    </GradientCard>
  );
}

/**
 * The segments' fine hatch: a 1px white line every 4px. Drawn as one path over
 * the measured width, since an SVG pattern left the last tiles undrawn.
 */
function Hatch() {
  const [width, setWidth] = useState(0);
  const d = Array.from(
    { length: Math.ceil(width / 4) },
    (_, i) => `M${i * 4 + 0.5} 0V${HATCH_HEIGHT}`,
  ).join('');
  return (
    <View
      testID="share-hatch"
      pointerEvents="none"
      className="absolute inset-0"
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
    >
      <Svg width="100%" height="100%">
        <Path
          testID="share-hatch-lines"
          d={d}
          stroke={tokens.colors.white}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}
