import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cardChrome';
import { Card } from '@/components/ui/Card';
import { AddButton, EmptyNote, GhostRows } from '@/components/ui/Empty';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import type { PanelHead } from './useSettingsData';

/**
 * The panel's frame: glass, with the title and summary on the left and the
 * panel's action on the right (stacked on mobile), then the body. On desktop
 * the body scrolls within the row; on mobile the page scrolls. An empty
 * panel shows dashed rows and its empty note (with the action again) instead.
 */
export function PanelFrame({
  head,
  onAction,
  children,
}: {
  head: PanelHead;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <Card
      testID="settings-panel"
      className="min-h-0 flex-1 py-[16px] ios:flex-none ios:p-[16px]"
    >
      <View className="min-h-[30px] flex-row items-center justify-between gap-x-[8px]">
        <View className="min-w-0 shrink flex-row items-baseline gap-x-[10px] ios:flex-col ios:items-start ios:gap-y-[2px]">
          <Text className="font-sans text-[13px] text-ink">{head.title}</Text>
          <Text
            testID="settings-panel-summary"
            numberOfLines={1}
            className="shrink font-sans text-[12px] text-muted"
          >
            {head.summary}
          </Text>
        </View>
        <Button
          testID="settings-panel-action"
          variant="soft"
          size="sm"
          label={head.action}
          onPress={onAction}
          className="ios:h-[38px] ios:px-[13px]"
        />
      </View>
      <ScrollView
        className="min-h-0 flex-1 ios:flex-none"
        showsVerticalScrollIndicator={false}
        // Mobile shows the whole panel in the page's own scroll.
        scrollEnabled={Platform.OS !== 'ios'}
      >
        {head.empty ? (
          <View
            testID="settings-panel-empty"
            className="mt-[10px] flex-row gap-x-[40px] ios:mt-[12px] ios:flex-col ios:gap-y-[14px]"
          >
            <View className="min-w-0 flex-1 ios:flex-none">
              <GhostRows count={4} tone="glass" />
            </View>
            <EmptyNote
              tone="glass"
              className="w-[320px] justify-end self-stretch ios:w-auto"
              title={head.empty.title}
              body={head.empty.body}
              action={
                <AddButton
                  testID="settings-panel-empty-action"
                  label={head.action}
                  onPress={onAction}
                />
              }
            />
          </View>
        ) : (
          children
        )}
      </ScrollView>
    </Card>
  );
}

/** The accounts and income panels' body: groups in auto-fill 340px columns, one column on mobile. */
export function GroupGrid({ children }: { children: ReactNode }) {
  return (
    <ResponsiveGrid
      testID="settings-groups"
      minColumnWidth={340}
      columns={Platform.OS === 'ios' ? 1 : undefined}
      columnGap={32}
      className="mt-[10px] gap-y-[18px] ios:mt-[12px] ios:gap-y-[16px]"
      rowClassName="gap-x-[32px] items-start"
    >
      {children}
    </ResponsiveGrid>
  );
}

/** A group's uppercase heading and total, over its rows. */
export function PanelGroup({
  label,
  total,
  children,
  testID,
}: {
  label: string;
  total: string;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID}>
      <View className="flex-row items-baseline justify-between pb-[6px] pt-[2px]">
        <Text className="font-sans text-[11px] uppercase tracking-[.06em] text-muted">
          {label}
        </Text>
        <Text
          testID={testID && `${testID}-total`}
          className="font-sans text-[11px] tabular-nums text-muted"
        >
          {total}
        </Text>
      </View>
      {children}
    </View>
  );
}

/**
 * An account or income row: a type icon in a tile, the name over its
 * subtitle, and the amount over a muted note. It lights while hovered, or
 * while its match elsewhere is (`lit`), and opens its drawer on a press.
 */
export function PanelRow({
  icon,
  name,
  sub,
  value,
  note,
  lit = false,
  onPress,
  onHoverIn,
  onHoverOut,
  testID,
}: {
  icon: string;
  name: string;
  sub: string;
  value: string;
  note: string;
  lit?: boolean;
  onPress: () => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      className={cx(
        'mx-[-6px] flex-row items-center gap-x-[12px] rounded-6 border-t border-ink/[.06] px-[6px] py-[8px] ios:py-[10px]',
        lit && 'bg-ink/[.04]',
      )}
    >
      <View className="size-[32px] items-center justify-center rounded-8 bg-ink/[.045] ios:size-[34px] ios:rounded-9">
        <Icon path={icon} size={16} />
      </View>
      <View className="min-w-0 flex-1 gap-y-px">
        <Text
          numberOfLines={1}
          className="font-sans text-[13px] text-ink ios:text-[14px]"
        >
          {name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-[11px] text-muted">
          {sub}
        </Text>
      </View>
      <View className="items-end gap-y-px">
        <Text className="font-sans text-[14px] tabular-nums text-ink">
          {value}
        </Text>
        <Text className="font-sans text-[10px] text-muted">{note}</Text>
      </View>
    </Pressable>
  );
}
