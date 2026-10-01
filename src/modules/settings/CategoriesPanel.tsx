import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icons/Icon';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { categoryIcon } from '@/components/icons/registry';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { tokens } from '@/theme/tokens';
import type { CategoryKind, CategoryRow } from '@/types/domain';
import { formatMoneyExact } from '@/utils/format/money';
import { CategorySheet } from './CategorySheet';
import { PanelFrame } from './PanelParts';
import type { PanelHead, SettingsData } from './useSettingsData';

/** What a tile says of its month total, by kind. */
const VERB: Record<CategoryKind, string> = {
  expense: 'spent',
  deposit: 'received',
};

/**
 * Expenditure, Recurring or Deposit categories: one tile per category of the
 * kind (`recurring`: the expense categories marked for recurring charges), with
 * its icon and this month's total, then a dashed New category tile. A tile
 * opens the category drawer. Auto-fill 180px columns on desktop, two on
 * mobile.
 */
export function CategoriesPanel({
  kind,
  recurring = false,
  data,
  head,
}: {
  kind: CategoryKind;
  recurring?: boolean;
  data: SettingsData;
  head: PanelHead;
}) {
  const [open, setOpen] = useState<CategoryRow | 'new' | null>(null);
  const totals = recurring
    ? data.recurring
    : kind === 'expense'
    ? data.expense
    : data.deposit;
  const tiles = [
    ...totals.map(t => (
      <Tile
        key={t.category.id}
        kind={kind}
        category={t.category}
        caption={`${formatMoneyExact(t.cents)} ${VERB[kind]} in ${
          data.monthLabel
        }`}
        onPress={() => setOpen(t.category)}
      />
    )),
    <NewTile key="new" onPress={() => setOpen('new')} />,
  ];
  return (
    <PanelFrame
      head={head}
      onAction={() => setOpen('new')}
      sheet={
        open && (
          <CategorySheet
            kind={kind}
            recurring={recurring}
            category={open === 'new' ? null : open}
            onClose={() => setOpen(null)}
          />
        )
      }
    >
      <ResponsiveGrid
        testID={`category-grid-${recurring ? 'recurring' : kind}`}
        minColumnWidth={180}
        columns={Platform.OS === 'ios' ? 2 : undefined}
        columnGap={8}
        className="mt-[10px] gap-y-[8px] ios:mt-[12px]"
        rowClassName="h-[118px] gap-x-[8px] ios:h-[116px]"
      >
        {tiles}
      </ResponsiveGrid>
    </PanelFrame>
  );
}

function Tile({
  kind,
  category,
  caption,
  onPress,
}: {
  kind: CategoryKind;
  category: CategoryRow;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`category-tile-${category.id}`}
      accessibilityRole="button"
      accessibilityLabel={category.name}
      onPress={onPress}
      className="flex-1 justify-between rounded-8 border border-ink/[.06] bg-white p-[12px] hover:border-ink/20"
    >
      <View className="size-[30px] items-center justify-center rounded-8 bg-ink/[.045]">
        <Icon path={categoryIcon(kind, category.icon)} size={15} />
      </View>
      <View className="gap-y-[3px]">
        <Text numberOfLines={1} className="font-sans text-[13px] text-ink">
          {category.name}
        </Text>
        <Text
          testID={`category-total-${category.id}`}
          numberOfLines={1}
          className="font-sans text-[11px] tabular-nums text-muted"
        >
          {caption}
        </Text>
      </View>
    </Pressable>
  );
}

function NewTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      testID="category-new-tile"
      accessibilityRole="button"
      accessibilityLabel="New category"
      onPress={onPress}
      className="group flex-1 items-center justify-center gap-y-[8px] rounded-8 border border-dashed border-ink/20 hover:bg-white/50"
    >
      <PlusIcon size={14} color={tokens.colors.muted} strokeWidth={1.2} />
      <Text className="font-sans text-[12px] text-muted group-hover:text-ink">
        New category
      </Text>
    </Pressable>
  );
}
