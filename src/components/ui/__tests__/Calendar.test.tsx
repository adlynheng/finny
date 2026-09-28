import { fireEvent, render, screen } from '@testing-library/react-native';
import { Calendar } from '@/components/ui/Calendar';
import { freezeToday, resetToday } from '@/lib/today';
import { classes } from '../../../../test/classes';

const tile = (label: string) => screen.getByRole('button', { name: label });

type Cell = { props: { testID?: string; accessibilityLabel?: string } };

/** The cells of the calendar's rows, first to last. */
const weekCells = () =>
  screen
    .getAllByTestId('calendar-week')
    .map(week => week.children as unknown as Cell[]);

const renderCalendar = (selected: string | null) => {
  const onSelect = jest.fn();
  return render(<Calendar selected={selected} onSelect={onSelect} />).then(
    () => onSelect,
  );
};

describe('Calendar', () => {
  beforeEach(() => freezeToday('2026-09-24'));
  afterEach(resetToday);

  it('opens on the selected month, the year large beside the month', async () => {
    await renderCalendar('2026-03-10');
    expect(classes(screen.getByText('2026'))).toEqual(
      expect.arrayContaining(['text-[24px]', 'font-light']),
    );
    expect(classes(screen.getByText('March'))).toEqual(
      expect.arrayContaining(['text-[13px]', 'text-muted']),
    );
  });

  it('opens on the current month when nothing is selected', async () => {
    await renderCalendar(null);
    expect(screen.getByText('September')).toBeTruthy();
  });

  it('heads the columns Monday to Sunday', async () => {
    await renderCalendar(null);
    const headings = screen.getAllByTestId('calendar-weekday');
    expect(headings.map(h => h.props.children)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });

  it('puts the 1st in its weekday column, after blank tiles', async () => {
    await renderCalendar('2026-09-10');
    const [cells = []] = weekCells();
    // 1 Sep 2026 is a Tuesday.
    expect(cells[0]?.props.testID).toBe('calendar-blank');
    expect(cells[1]?.props.accessibilityLabel).toBe('Tue, 1 Sep 2026');
  });

  it('pads the last row with blank tiles', async () => {
    await renderCalendar('2026-09-10');
    const last = weekCells().at(-1) ?? [];
    expect(last).toHaveLength(7);
    // Wed 30 Sep, then Thu to Sun blank.
    expect(last.slice(3).map(c => c.props.testID)).toEqual(
      Array(4).fill('calendar-blank'),
    );
  });

  it('fills the selected day with ink and white text', async () => {
    await renderCalendar('2026-09-10');
    expect(classes(tile('Thu, 10 Sep 2026'))).toEqual(
      expect.arrayContaining(['bg-ink', 'border-transparent']),
    );
    expect(classes(screen.getByText('10'))).toContain('text-white');
    expect(tile('Thu, 10 Sep 2026').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('outlines today without filling it', async () => {
    await renderCalendar('2026-09-10');
    const today = classes(tile('Thu, 24 Sep 2026'));
    expect(today).toEqual(expect.arrayContaining(['border-tile-today']));
    expect(today).not.toContain('bg-ink');
    expect(classes(screen.getByText('24'))).toContain('text-ink');
  });

  it('washes every other day faintly', async () => {
    await renderCalendar('2026-09-10');
    const plain = classes(tile('Fri, 11 Sep 2026'));
    expect(plain).toEqual(
      expect.arrayContaining(['bg-tile', 'border-transparent']),
    );
    expect(plain).not.toContain('border-tile-today');
  });

  it('sizes tiles 32px on desktop and 38px on mobile', async () => {
    await renderCalendar('2026-09-10');
    expect(classes(tile('Fri, 11 Sep 2026'))).toEqual(
      expect.arrayContaining(['h-tile', 'ios:h-tile-touch', 'rounded-8']),
    );
  });

  it('pages forward across the year end without changing the selection', async () => {
    const onSelect = await renderCalendar('2026-12-05');
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('2027')).toBeTruthy();
    expect(screen.getByText('January')).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('pages back across the year start', async () => {
    await renderCalendar('2027-01-15');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Previous month' }),
    );
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.getByText('December')).toBeTruthy();
    // The selection is in January, so no December tile is selected.
    expect(classes(tile('Tue, 15 Dec 2026'))).not.toContain('bg-ink');
  });

  it('chooses the pressed day from the month on show', async () => {
    const onSelect = await renderCalendar('2026-09-10');
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    await fireEvent.press(tile('Mon, 5 Oct 2026'));
    expect(onSelect).toHaveBeenCalledWith('2026-10-05');
  });
});
