/**
 * The date picker's month as tiles: blanks before the 1st so it lands in its
 * Monday-first column, one tile per day, and blanks after the last day to
 * finish the row.
 */

import { addDays } from 'date-fns';
import {
  daysInMonth,
  firstOfMonth,
  mondayOffset,
  parseDate,
  toIsoDate,
  type MonthKey,
} from '@/utils/format/date';

/**
 * selected: ink with white text. today: outlined, not filled. default: a
 * faint wash. A selected today is shown as selected.
 */
export type TileState = 'selected' | 'today' | 'default';

export type CalendarTile =
  | { kind: 'blank'; key: string }
  | { kind: 'day'; key: string; day: number; date: string; state: TileState };

const WEEK = 7;

export function calendarTiles(
  month: MonthKey,
  { selected, today }: { selected: string | null; today: string },
): CalendarTile[] {
  const first = parseDate(firstOfMonth(month));
  const before = mondayOffset(month);
  const count = daysInMonth(month);
  const after = (WEEK - ((before + count) % WEEK)) % WEEK;

  const blanks = (n: number, side: string): CalendarTile[] =>
    Array.from({ length: n }, (_, i) => ({
      kind: 'blank',
      key: `${side}-${i}`,
    }));

  const days = Array.from({ length: count }, (_, i): CalendarTile => {
    const date = toIsoDate(addDays(first, i));
    const state: TileState =
      date === selected ? 'selected' : date === today ? 'today' : 'default';
    return { kind: 'day', key: date, day: i + 1, date, state };
  });

  return [...blanks(before, 'before'), ...days, ...blanks(after, 'after')];
}

/** The tiles as rows of seven, Monday first. */
export function calendarWeeks(tiles: CalendarTile[]): CalendarTile[][] {
  return Array.from({ length: Math.ceil(tiles.length / WEEK) }, (_, i) =>
    tiles.slice(i * WEEK, (i + 1) * WEEK),
  );
}
