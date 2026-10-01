/**
 * The pieces both Sheet implementations share. Only the container, its scrim
 * recipe and the footer's layout differ by platform.
 */

import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tokens, type GlassName } from '@/theme/tokens';
import { cx } from './cardChrome';
import { Glass } from './Glass';
import { touchSlop } from './touch';

/** The full-window scrim behind the container; pressing it closes. */
export function SheetScrim({
  recipe,
  onClose,
}: {
  recipe: Extract<GlassName, 'modalScrim' | 'sheetScrim'>;
  onClose: () => void;
}) {
  return (
    <Pressable
      testID="sheet-scrim"
      accessibilityRole="button"
      accessibilityLabel="Dismiss"
      onPress={onClose}
      className="absolute inset-0"
    >
      <Glass
        recipe={recipe}
        pointerEvents="none"
        className="absolute inset-0"
      />
    </Pressable>
  );
}

const closeIconSize = Platform.OS === 'ios' ? 11 : 10;

/**
 * The title row: the title, and a close button at the far end. Desktop: a
 * 24px title and a bare 28px close that washes on hover. Mobile: 22px and a
 * 40px soft-filled close.
 */
export function SheetHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <View
      testID="sheet-header"
      className={cx(
        'flex-row gap-[12px]',
        // A subtitle hangs the close button from the top on desktop, as the Sell form's.
        subtitle === undefined
          ? 'items-center'
          : 'items-start ios:items-center',
      )}
    >
      <View className="min-w-0 flex-1 gap-y-[4px] ios:gap-y-[2px]">
        <Text
          accessibilityRole="header"
          className="font-sans text-[24px] font-normal tracking-[-0.01em] text-ink ios:text-[22px]"
        >
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text
            testID="sheet-subtitle"
            className="font-sans text-[12px] text-muted"
          >
            {subtitle}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        hitSlop={touchSlop(40, 40)}
        className="size-[28px] items-center justify-center rounded-6 hover:bg-icon-hover ios:size-[40px] ios:rounded-10 ios:bg-soft"
      >
        <Svg width={closeIconSize} height={closeIconSize} viewBox="0 0 10 10">
          <Path
            d="M2 2l6 6M8 2L2 8"
            stroke={tokens.colors.ink}
            strokeWidth={1.3}
            fill="none"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

/** A footer note: text in the muted note style, anything else as given. */
export function SheetNote({ note }: { note: ReactNode }) {
  return typeof note === 'string' ? (
    <Text testID="sheet-note" className="font-sans text-[12px] text-muted">
      {note}
    </Text>
  ) : (
    <View testID="sheet-note" className="min-w-0 shrink">
      {note}
    </View>
  );
}

/**
 * The form, scrolling on its own when the container reaches its height cap, so
 * the header and footer stay put.
 */
export function SheetBody({
  gapClassName,
  children,
}: {
  gapClassName: string;
  children: ReactNode;
}) {
  return (
    <ScrollView
      testID="sheet-body"
      className="shrink grow-0"
      contentContainerClassName={gapClassName}
      showsVerticalScrollIndicator={false}
      // With the keyboard up, a tap on a chip or a search match acts at once
      // rather than only dismissing the keyboard.
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
