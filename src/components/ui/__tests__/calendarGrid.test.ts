import {
  calendarTiles,
  calendarWeeks,
  type CalendarTile,
} from '@/components/ui/calendarGrid';

const days = (tiles: CalendarTile[]) =>
  tiles.flatMap(t => (t.kind === 'day' ? [t] : []));
const leading = (tiles: CalendarTile[]) =>
  tiles.findIndex(t => t.kind === 'day');
const trailing = (tiles: CalendarTile[]) =>
  [...tiles].reverse().findIndex(t => t.kind === 'day');

const none = { selected: null, today: '2026-01-01' };

describe('calendarTiles', () => {
  it.each([
    // 1 Sep 2026 is a Tuesday: one blank before it, four after the 30th.
    ['2026-09', 1, 30, 4],
    // 1 Feb 2026 is a Sunday: six blanks, then 28 days, then one to fill the row.
    ['2026-02', 6, 28, 1],
    // 1 Jun 2026 is a Monday: no leading blanks.
    ['2026-06', 0, 30, 5],
    // Feb 2027 starts on a Monday and fills exactly four rows.
    ['2027-02', 0, 28, 0],
  ])(
    '%s: %i leading blanks, %i days, %i trailing blanks',
    (month, before, count, after) => {
      const tiles = calendarTiles(month, none);
      expect(leading(tiles)).toBe(before);
      expect(days(tiles)).toHaveLength(count);
      expect(trailing(tiles)).toBe(after);
      expect(tiles.length % 7).toBe(0);
    },
  );

  it('numbers the days from the 1st, as dates', () => {
    const [first, second] = days(calendarTiles('2026-09', none));
    expect(first).toMatchObject({ day: 1, date: '2026-09-01' });
    expect(second).toMatchObject({ day: 2, date: '2026-09-02' });
  });

  it('marks the selected day, today, and every other day', () => {
    const tiles = days(
      calendarTiles('2026-09', { selected: '2026-09-10', today: '2026-09-24' }),
    );
    const state = (day: number) => tiles[day - 1]?.state;
    expect(state(10)).toBe('selected');
    expect(state(24)).toBe('today');
    expect(state(11)).toBe('default');
    expect(tiles.filter(t => t.state !== 'default')).toHaveLength(2);
  });

  it('shows the selected day as selected even when it is today', () => {
    const tiles = days(
      calendarTiles('2026-09', { selected: '2026-09-24', today: '2026-09-24' }),
    );
    expect(tiles[23]?.state).toBe('selected');
    expect(tiles.filter(t => t.state === 'today')).toEqual([]);
  });

  it('marks nothing in a month holding neither the selection nor today', () => {
    const tiles = days(
      calendarTiles('2026-10', { selected: '2026-09-10', today: '2026-09-24' }),
    );
    expect(tiles.every(t => t.state === 'default')).toBe(true);
  });

  it('keys every tile uniquely', () => {
    const keys = calendarTiles('2026-02', none).map(t => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('calendarWeeks', () => {
  it('splits the tiles into Monday-first rows of seven', () => {
    const weeks = calendarWeeks(calendarTiles('2026-09', none));
    expect(weeks).toHaveLength(5);
    expect(weeks.every(w => w.length === 7)).toBe(true);
    expect(weeks[0]?.[0]?.kind).toBe('blank');
    expect(weeks[0]?.[1]).toMatchObject({ kind: 'day', day: 1 });
    // Monday the 7th starts the second row.
    expect(weeks[1]?.[0]).toMatchObject({ kind: 'day', day: 7 });
  });
});
