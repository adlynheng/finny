import { fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { PaymentsCalendarCard } from '../PaymentsCalendarCard';
import { classes } from '../../../../test/classes';
import { charges, TODAY } from '../../../../test/financeFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  useUiStore.setState(initialUiState());
  stub.respond('recurring_charge', { data: charges, error: null });
});
afterEach(resetToday);

const day = (d: number) => screen.getByTestId(`payments-day-${d}`);

async function open() {
  await renderWithClient(<PaymentsCalendarCard />);
  await screen.findByTestId('payments-paid-1');
}

it('sums what is still due this month', async () => {
  await open();
  expect(screen.getByTestId('payments-due')).toHaveTextContent(
    'S$60 due for the rest of September',
  );
});

it('checks off the charge days that have passed, and shows the amount on those to come', async () => {
  await open();

  for (const d of [1, 5, 12, 19, 22]) {
    expect(within(day(d)).getByTestId(`payments-paid-${d}`)).toBeTruthy();
  }
  expect(within(day(26)).getByTestId('payments-due-26')).toHaveTextContent(
    'S$60',
  );
  expect(screen.queryByTestId('payments-paid-26')).toBeNull();
});

it('outlines today, brightens the selected day and dims past days with nothing on', async () => {
  await open();

  expect(classes(day(24))).toContain('border-white/75');
  // The next charge day is selected to begin with.
  expect(classes(day(26))).toEqual(
    expect.arrayContaining(['bg-white/[.32]', 'border-white/45']),
  );
  expect(classes(day(1))).toContain('bg-white/[.18]');
  expect(classes(day(2))).toContain('opacity-60');
  expect(classes(day(27))).not.toContain('opacity-60');
});

it('lets only charge days be pressed', async () => {
  await open();
  expect(day(2).props.accessibilityState.disabled).toBe(true);
  expect(day(1).props.accessibilityState.disabled).toBe(false);
});

it('names the selected day’s charges and their total in the strip', async () => {
  await open();
  expect(screen.getByTestId('payments-strip-day')).toHaveTextContent(
    'Sat 26 Sep',
  );
  expect(screen.getByTestId('payments-strip-names')).toHaveTextContent(
    'Home cleaner',
  );
  expect(screen.getByTestId('payments-strip-total')).toHaveTextContent('S$60');

  await fireEvent.press(day(1));
  expect(screen.getByTestId('payments-strip-day')).toHaveTextContent(
    'Tue 1 Sep',
  );
  expect(screen.getByTestId('payments-strip-names')).toHaveTextContent(
    'HDB home loan',
  );
  expect(screen.getByTestId('payments-strip-total')).toHaveTextContent(
    'S$1,140',
  );
});

it('steps from this month to three ahead, and no further either way', async () => {
  await open();
  const prev = screen.getByTestId('payments-month-prev');
  const next = screen.getByTestId('payments-month-next');
  expect(prev.props.accessibilityState.disabled).toBe(true);

  await fireEvent.press(next);
  expect(useUiStore.getState().calendarMonth).toBe('2026-10');
  expect(screen.getByTestId('payments-due')).toHaveTextContent(
    'S$2,269.98 due in October',
  );
  // Every October day is to come, so it opens on the first charge day.
  expect(screen.getByTestId('payments-strip-day')).toHaveTextContent(
    'Thu 1 Oct',
  );
  expect(screen.getByTestId('payments-due-15')).toHaveTextContent('S$624');

  await fireEvent.press(next);
  await fireEvent.press(next);
  expect(useUiStore.getState().calendarMonth).toBe('2026-12');
  expect(
    screen.getByTestId('payments-month-next').props.accessibilityState.disabled,
  ).toBe(true);
});

it('says so when the month has no charges', async () => {
  stub.respond('recurring_charge', { data: [], error: null });
  await renderWithClient(<PaymentsCalendarCard />);

  expect(await screen.findByTestId('payments-strip-day')).toHaveTextContent(
    'No charges',
  );
  expect(screen.queryByTestId('payments-strip-total')).toBeNull();
});
