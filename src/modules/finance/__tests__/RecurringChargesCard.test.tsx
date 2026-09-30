import { PortalHost } from '@rn-primitives/portal';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { RecurringChargesCard } from '../RecurringChargesCard';
import { categories, charges, TODAY } from '../../../../test/financeFixtures';
import { accounts } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  stub.respond('recurring_charge', { data: charges, error: null });
  stub.respond('category', {
    data: categories.filter(c => c.kind === 'expense'),
    error: null,
  });
  stub.respond('account', { data: accounts, error: null });
  stub.respond('txn', { data: [], error: null });
});
afterEach(resetToday);

async function open() {
  await renderWithClient(
    <>
      <RecurringChargesCard />
      <PortalHost />
    </>,
  );
  await screen.findByTestId('recurring-row-1');
}

const row = (id: number) => screen.getByTestId(`recurring-row-${id}`);
const inside = (id: string) => within(screen.getByTestId(id));

/** The last insert, update or delete on recurring_charge (reads follow it). */
const lastWrite = () =>
  stub
    .chainsFor('recurring_charge')
    .filter(chain =>
      ['insert', 'update', 'delete'].includes(String(chain[0]?.[0])),
    )
    .at(-1)!;

describe('the card', () => {
  it('totals the charges as a monthly figure', async () => {
    await open();
    // 1,140 + 60 × 52 / 12 + 186 / 3 + 624 / 12 + 19.98
    expect(screen.getByTestId('recurring-total')).toHaveTextContent('S$1,534');
    expect(screen.getByText('per month · 5 charges')).toBeTruthy();
  });

  it('lists them largest first', async () => {
    await open();
    const ids = screen
      .getAllByTestId(/^recurring-row-\d+$/)
      .map(r => r.props.testID);
    expect(ids).toEqual([
      'recurring-row-1',
      'recurring-row-4',
      'recurring-row-3',
      'recurring-row-2',
      'recurring-row-5',
    ]);
  });

  it('gives each its category, interval, next due date and period', async () => {
    await open();
    expect(screen.getByTestId('recurring-row-1-sub')).toHaveTextContent(
      'Housing · Monthly · next 1 Oct',
    );
    expect(screen.getByTestId('recurring-row-2-sub')).toHaveTextContent(
      'Bills · Weekly · next 26 Sep',
    );
    expect(screen.getByTestId('recurring-row-5-amount')).toHaveTextContent(
      'S$19.98',
    );
    expect(within(row(4)).getByText('per year')).toBeTruthy();
  });

  it('lifts a hovered row with style, never by changing its classes', async () => {
    await open();
    const before = row(1).props.className;
    await fireEvent(row(1), 'hoverIn');

    // A class change here would make NativeWind remount the row.
    expect(row(1).props.className).toBe(before);
    expect(row(1)).toHaveStyle({ transform: [{ translateY: -2 }] });
    expect(within(row(1)).getByTestId('glass-fill').props.className).toContain(
      'bg-white/[.24]',
    );

    await fireEvent(row(1), 'hoverOut');
    expect(row(1).props.style).toBeUndefined();
  });
});

describe('the form', () => {
  it('adds a charge', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('recurring-add'));
    expect(screen.getByText('New recurring charge')).toBeTruthy();

    const save = screen.getByLabelText('Add charge');
    expect(save.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('rf-name'), ' Disney+ ');
    await fireEvent.changeText(screen.getByTestId('rf-amount'), '13.98');
    await fireEvent.press(inside('rf-account').getByLabelText('UOB One'));
    expect(save.props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(save);

    expect(lastWrite()).toEqual([
      [
        'insert',
        {
          name: 'Disney+',
          amount_cents: 1_398,
          category_id: 6,
          account_id: 2,
          frequency: 'monthly',
          custom_every: null,
          custom_unit: null,
          start_date: '2026-10-01',
        },
      ],
      ['select'],
      ['single'],
    ]);
    await waitFor(() =>
      expect(screen.queryByText('New recurring charge')).toBeNull(),
    );
  });

  it('offers the recurring-charge categories, Subscriptions first', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('recurring-add'));
    const labels = inside('rf-category')
      .getAllByRole('button')
      .map(b => b.props.accessibilityLabel);
    expect(labels).toEqual(['Subscriptions', 'Bills', 'Housing']);
    // Groceries and Dining are everyday spending, not recurring.
  });

  it('shows the Every row only for Custom, and previews the monthly figure', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('recurring-add'));
    await fireEvent.changeText(screen.getByTestId('rf-amount'), '60');
    expect(screen.queryByTestId('rf-custom')).toBeNull();
    expect(screen.getByTestId('sheet-note')).toHaveTextContent(
      '≈ S$60.00 per month',
    );

    await fireEvent.press(inside('rf-interval').getByLabelText('Weekly'));
    expect(screen.getByTestId('sheet-note')).toHaveTextContent(
      '≈ S$260.00 per month',
    );

    await fireEvent.press(inside('rf-interval').getByLabelText('Custom'));
    expect(screen.getByTestId('rf-custom')).toBeTruthy();
    // Every 2 weeks: 60 × 52 / 12 / 2.
    expect(screen.getByTestId('sheet-note')).toHaveTextContent(
      '≈ S$130.00 per month',
    );
    await fireEvent.press(screen.getByTestId('rf-unit-months'));
    expect(screen.getByTestId('sheet-note')).toHaveTextContent(
      '≈ S$30.00 per month',
    );

    await fireEvent.press(inside('rf-interval').getByLabelText('Yearly'));
    expect(screen.queryByTestId('rf-custom')).toBeNull();
    expect(screen.getByTestId('sheet-note')).toHaveTextContent(
      '≈ S$5.00 per month',
    );
  });

  it('edits a charge, starting from its fields and next due date', async () => {
    await open();
    await fireEvent.press(row(5));

    expect(screen.getByText('Edit recurring charge')).toBeTruthy();
    expect(screen.getByTestId('rf-name').props.value).toBe('Netflix');
    expect(screen.getByTestId('rf-amount').props.value).toBe('19.98');
    await fireEvent.changeText(screen.getByTestId('rf-amount'), '22.98');
    await fireEvent.press(screen.getByLabelText('Save changes'));

    expect(lastWrite()[0]).toEqual([
      'update',
      expect.objectContaining({
        amount_cents: 2_298,
        category_id: 6,
        account_id: 2,
        frequency: 'monthly',
        start_date: '2026-10-22',
      }),
    ]);
    expect(lastWrite()[1]).toEqual(['eq', 'id', 5]);
  });

  it('asks before deleting a charge: future charges stop, past payments stay', async () => {
    await open();
    await fireEvent.press(row(2));
    await fireEvent.press(screen.getByLabelText('Delete charge'));
    expect(screen.getByTestId('confirm-detail').props.children).toBe(
      'Future charges stop. Its past payments stay in your transactions. This can’t be undone.',
    );
    await fireEvent.press(screen.getAllByLabelText('Cancel').at(-1)!);
    expect(screen.queryByTestId('confirm-overlay')).toBeNull();
    expect(stub.chainsFor('recurring_charge')).not.toContainEqual([
      ['delete'],
      ['eq', 'id', 2],
    ]);
    expect(screen.getByText('Edit recurring charge')).toBeTruthy();
  });

  it('deletes a charge once confirmed, unlinking its past payments first', async () => {
    await open();
    await fireEvent.press(row(2));
    await fireEvent.press(screen.getByLabelText('Delete charge'));
    await fireEvent.press(screen.getByTestId('confirm-delete'));

    await waitFor(() =>
      expect(lastWrite()).toEqual([['delete'], ['eq', 'id', 2]]),
    );
    expect(stub.chainsFor('txn')).toContainEqual([
      ['update', { recurring_id: null }],
      ['eq', 'recurring_id', 2],
    ]);
    await waitFor(() =>
      expect(screen.queryByText('Edit recurring charge')).toBeNull(),
    );
  });
});
