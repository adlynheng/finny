import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { today as currentDay } from '@/lib/today';
import { tokens } from '@/theme/tokens';
import {
  formatFullDate,
  formatMonthLong,
  monthKey,
  shiftMonth,
} from '@/utils/format/date';
import { cx } from './cardChrome';
import {
  calendarTiles,
  calendarWeeks,
  type CalendarTile,
  type TileState,
} from './calendarGrid';
import { touchSlop } from './touch';

type Props = {
  /** `YYYY-MM-DD`, or null when nothing is chosen yet. */
  selected: string | null;
  onSelect: (date: string) => void;
  /** The desktop popover's shadow. */
  raised?: boolean;
  className?: string;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const chevronSize = Platform.OS === 'ios' ? 10 : 9;

const tileLook: Record<TileState, { box: string; text: string }> = {
  selected: { box: 'border-transparent bg-ink', text: 'text-white' },
  today: { box: 'border-tile-today bg-tile', text: 'text-ink' },
  default: { box: 'border-transparent bg-tile', text: 'text-ink' },
};

/**
 * One month, Monday first: the year large beside the month name, a prev/next
 * pair, and a grid of day tiles. It opens on the selected date's month (or
 * today's); paging is its own state, so it never changes the selection. A
 * white card with a hairline border; 32px tiles on desktop, 38px on mobile.
 */
export function Calendar({ selected, onSelect, raised, className }: Props) {
  const [month, setMonth] = useState(() => monthKey(selected ?? currentDay()));
  const weeks = calendarWeeks(
    calendarTiles(month, { selected, today: currentDay() }),
  );

  return (
    <View
      testID="calendar"
      style={raised ? { boxShadow: tokens.calendar.popover.shadow } : undefined}
      className={cx(
        'gap-[8px] rounded-12 border border-popover-border bg-white p-[14px]',
        className,
      )}
    >
      <View className="flex-row items-center justify-between gap-[8px]">
        <View className="flex-row items-baseline gap-[8px]">
          <Text className="font-sans text-[24px] font-light leading-[24px] tracking-[-0.02em] text-ink">
            {month.slice(0, 4)}
          </Text>
          <Text className="font-sans text-[13px] text-muted">
            {formatMonthLong(month)}
          </Text>
        </View>
        <View className="flex-row items-center gap-[2px] rounded-6 bg-nav-tray p-[3px] ios:rounded-8">
          <MonthButton
            label="Previous month"
            path="M6.5 2L3.5 5l3 3"
            onPress={() => setMonth(m => shiftMonth(m, -1))}
          />
          <MonthButton
            label="Next month"
            path="M3.5 2l3 3-3 3"
            onPress={() => setMonth(m => shiftMonth(m, 1))}
          />
        </View>
      </View>

      <View className="mt-[4px] flex-row gap-[4px] ios:mt-0">
        {WEEKDAYS.map(day => (
          <Text
            key={day}
            testID="calendar-weekday"
            className="flex-1 text-center font-sans text-[10px] text-muted"
          >
            {day}
          </Text>
        ))}
      </View>

      <View className="gap-[4px]">
        {weeks.map((week, i) => (
          <View key={i} testID="calendar-week" className="flex-row gap-[4px]">
            {week.map(t => (
              <Tile key={t.key} tile={t} onSelect={onSelect} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthButton({
  label,
  path,
  onPress,
}: {
  label: string;
  path: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={touchSlop(32, 36)}
      className="h-[22px] w-[24px] items-center justify-center rounded-4 hover:bg-white ios:h-[32px] ios:w-[36px] ios:rounded-6"
    >
      <Svg width={chevronSize} height={chevronSize} viewBox="0 0 10 10">
        <Path
          d={path}
          stroke={tokens.colors.ink}
          strokeWidth={1.3}
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}

// Blanks carry the same border and padding as days: Yoga counts them into a
// flex-1 tile's width, so a row with blanks would otherwise fall out of column.
const tileBox =
  'h-tile flex-1 rounded-8 border px-[6px] py-[5px] ios:h-tile-touch ios:p-[6px]';

function Tile({
  tile,
  onSelect,
}: {
  tile: CalendarTile;
  onSelect: (date: string) => void;
}) {
  if (tile.kind === 'blank') {
    return (
      <View
        testID="calendar-blank"
        className={cx(tileBox, 'border-transparent')}
      />
    );
  }
  const look = tileLook[tile.state];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatFullDate(tile.date)}
      accessibilityState={{ selected: tile.state === 'selected' }}
      onPress={() => onSelect(tile.date)}
      className={cx(tileBox, 'hover:border-tile-hover', look.box)}
    >
      <Text
        className={cx(
          'font-sans text-[12px] leading-[12px] ios:text-[13px] ios:leading-[13px]',
          look.text,
        )}
      >
        {tile.day}
      </Text>
    </Pressable>
  );
}
