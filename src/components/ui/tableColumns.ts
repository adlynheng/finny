/**
 * Column templates: each column's width and alignment, applied identically to
 * a table's header, body rows, expanded sub-rows and totals. A flex column
 * takes its share of the width left after the fixed ones (the design's
 * `minmax(0, <n>fr)`); a fixed column is `w-[…] shrink-0`.
 *
 * Class names are written out in full so Tailwind can find them.
 */

export type Column = {
  className: string;
  /** Numbers and actions sit at the right edge. */
  align?: 'left' | 'right';
};

export type ColumnTemplate = readonly Column[];

/** Chevron, holding, qty, avg cost, total cost, price, market value, P&L, action. */
export const positionsColumns: ColumnTemplate = [
  { className: 'w-[22px] shrink-0' },
  { className: 'flex-[1.4]' },
  { className: 'flex-[0.55]', align: 'right' },
  { className: 'flex-1', align: 'right' },
  { className: 'flex-[1.1]', align: 'right' },
  { className: 'flex-1', align: 'right' },
  { className: 'flex-[1.1]', align: 'right' },
  { className: 'flex-[1.3]', align: 'right' },
  { className: 'w-[118px] shrink-0', align: 'right' },
];

/** Symbol, 30-day trend, price, day change, in portfolio. */
export const watchlistColumns: ColumnTemplate = [
  { className: 'flex-[1.6]' },
  { className: 'flex-1' },
  { className: 'flex-[0.9]', align: 'right' },
  { className: 'flex-[0.9]', align: 'right' },
  { className: 'flex-[0.8]', align: 'right' },
];
