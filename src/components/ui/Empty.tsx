import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { PlusIcon } from '@/components/icons/PlusIcon';
import { Button, type ButtonVariant } from './Button';
import { cx } from './cardChrome';

/**
 * The design's empty states (its `empty` variants): a card with nothing in it
 * yet keeps its frame and shows dashed placeholder rows where its rows will
 * go, a short note on what fills it, and the action that does.
 *
 * `glass` is for the white cards (ink lines), `gradient` for the coloured ones
 * (white lines).
 */
export type EmptyTone = 'glass' | 'gradient';

const ROW = {
  glass: {
    row: 'border-ink/[.14] px-[10px]',
    tile: 'bg-ink/[.045]',
    bar: 'bg-ink/[.08]',
    bar2: 'bg-ink/[.05]',
    widths: ['w-[42%]', 'w-[26%]', 'w-[44px]'],
  },
  gradient: {
    row: 'border-white/40 px-[12px]',
    tile: 'bg-white/[.12]',
    bar: 'bg-white/[.24]',
    bar2: 'bg-white/[.14]',
    widths: ['w-[46%]', 'w-[28%]', 'w-[38px]'],
  },
} as const;

/**
 * A figure still loading: a soft bar where it will be, so an unknown amount
 * never reads as a zero. Size it with `className`.
 */
export function Skeleton({
  testID = 'skeleton',
  className,
}: {
  testID?: string;
  className: string;
}) {
  return (
    <View
      testID={testID}
      accessibilityLabel="Loading"
      className={cx('rounded-full bg-ink/[.08]', className)}
    />
  );
}

/** Dashed stand-ins for the rows a card will list: an icon tile, two lines and an amount. */
export function GhostRows({
  count,
  tone,
  testID = 'ghost-rows',
}: {
  count: number;
  tone: EmptyTone;
  testID?: string;
}) {
  const t = ROW[tone];
  return (
    <View testID={testID} className="gap-y-[4px]">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          testID="ghost-row"
          className={cx(
            'flex-row items-center gap-x-[12px] rounded-8 border border-dashed py-[9px]',
            t.row,
          )}
        >
          <View className={cx('size-[30px] rounded-8', t.tile)} />
          <View className="flex-1 gap-y-[6px]">
            <View className={cx('h-[6px] rounded-full', t.widths[0], t.bar)} />
            <View className={cx('h-[5px] rounded-full', t.widths[1], t.bar2)} />
          </View>
          <View className={cx('h-[6px] rounded-full', t.widths[2], t.bar)} />
        </View>
      ))}
    </View>
  );
}

/** An empty card's 17px heading and its explanation. */
export function EmptyNote({
  title,
  body,
  tone,
  action,
  className,
  testID = 'empty-note',
}: {
  title: string;
  body: string;
  tone: EmptyTone;
  action?: ReactNode;
  className?: string;
  testID?: string;
}) {
  return (
    <View testID={testID} className={cx('items-start gap-y-[14px]', className)}>
      <View className="gap-y-[6px]">
        <Text
          className={cx(
            'font-sans text-[17px]',
            tone === 'glass' ? 'text-ink' : 'text-white',
          )}
        >
          {title}
        </Text>
        <Text
          className={cx(
            'max-w-[360px] font-sans text-[12px] leading-[17px]',
            tone === 'glass' ? 'text-muted' : 'text-white',
          )}
        >
          {body}
        </Text>
      </View>
      {action}
    </View>
  );
}

const plus = (color: string) => (
  <PlusIcon size={10} color={color} strokeWidth={1.4} />
);

/** An empty card's call to action: a small button with a plus. */
export function AddButton({
  label,
  onPress,
  variant = 'primary',
  testID,
}: {
  label: string;
  onPress: () => void;
  /** `light` on a gradient card. */
  variant?: Extract<ButtonVariant, 'primary' | 'light'>;
  testID?: string;
}) {
  return (
    <Button
      testID={testID}
      variant={variant}
      size="sm"
      label={label}
      onPress={onPress}
      icon={plus}
    />
  );
}
