import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { NewTransactionSheet } from '../NewTransactionSheet';
import { accounts } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

// In name order, as the query returns them.
const categories = [
  { id: 3, name: 'Dining', kind: 'expense', icon: 'Food' },
  { id: 2, name: 'Freelance', kind: 'deposit', icon: null },
  { id: 4, name: 'Groceries', kind: 'expense', icon: 'Groceries' },
  { id: 1, name: 'Salary', kind: 'deposit', icon: 'Salary' },
];

const onClose = jest.fn();

beforeEach(() => {
  stub.reset();
  onClose.mockClear();
  freezeToday('2026-09-24');
  stub.respond('account', { data: accounts, error: null });
  stub.respond('category', { data: categories, error: null });
  stub.respond('txn', { data: [], error: null });
});
afterEach(resetToday);

async function open() {
  await renderWithClient(
    <>
      <NewTransactionSheet onClose={onClose} />
      <PortalHost />
    </>,
  );
  await screen.findByLabelText('DBS Altitude');
}

const chips = (row: string) => within(screen.getByTestId(row));
const selected = (row: string) =>
  chips(row)
    .getAllByRole('button')
    .filter(c => c.props.accessibilityState.selected)
    .map(c => c.props.accessibilityLabel);
const saveButton = (label: string) => screen.getByLabelText(label);
const saveDisabled = (label: string) =>
  saveButton(label).props.accessibilityState.disabled;
const type = (kind: string) =>
  fireEvent.press(screen.getByTestId(`tx-type-${kind}`));
const amount = (text: string) =>
  fireEvent.changeText(screen.getByTestId('tx-amount'), text);

/** The rows sent in the one insert. */
function inserted() {
  const [chain] = stub.chainsFor('txn');
  expect(chain?.[0]?.[0]).toBe('insert');
  return chain![0]![1];
}

it('opens on an expense from the card, with the first expense category', async () => {
  await open();

  expect(selected('tx-from')).toEqual(['DBS Altitude']);
  expect(selected('tx-category')).toEqual(['Dining']);
  expect(chips('tx-category').queryByLabelText('Salary')).toBeNull();
  // CPF is left out of every account row.
  expect(chips('tx-from').queryByLabelText('CPF Ordinary')).toBeNull();
  expect(screen.queryByTestId('tx-to')).toBeNull();
  expect(screen.getByText('Paid from')).toBeTruthy();
  expect(screen.getByText('Description')).toBeTruthy();
  expect(screen.getByTestId('tx-note').props.placeholder).toBe('e.g. Kopitiam');
  expect(saveButton('Add expense')).toBeTruthy();
});

it('resets the account and category to the new type’s defaults when the type switches', async () => {
  await open();
  await fireEvent.press(chips('tx-from').getByLabelText('UOB One'));
  await fireEvent.press(chips('tx-category').getByLabelText('Groceries'));
  expect(selected('tx-from')).toEqual(['UOB One']);
  expect(selected('tx-category')).toEqual(['Groceries']);

  await type('deposit');
  expect(selected('tx-from')).toEqual(['DBS Multiplier']);
  expect(selected('tx-category')).toEqual(['Freelance']);
  expect(chips('tx-category').queryByLabelText('Dining')).toBeNull();

  await type('expense');
  expect(selected('tx-from')).toEqual(['DBS Altitude']);
  expect(selected('tx-category')).toEqual(['Dining']);
});

it.each([
  ['deposit', 'Deposited to', 'Source', 'e.g. Tax refund', 'Add deposit'],
  ['transfer', 'From account', 'Note', 'Optional', 'Add transfer'],
])(
  'relabels the form for a %s',
  async (kind, account, note, placeholder, save) => {
    await open();
    await type(kind);

    expect(screen.getByText(account)).toBeTruthy();
    expect(screen.getByText(note)).toBeTruthy();
    expect(screen.getByTestId('tx-note').props.placeholder).toBe(placeholder);
    expect(saveButton(save)).toBeTruthy();
  },
);

it('shows a transfer’s destinations with the source dimmed, and no category', async () => {
  await open();
  await type('transfer');

  expect(screen.getByText('To account')).toBeTruthy();
  expect(screen.queryByTestId('tx-category')).toBeNull();
  expect(selected('tx-from')).toEqual(['DBS Multiplier']);
  expect(selected('tx-to')).toEqual(['UOB One']);
  const source = chips('tx-to').getByLabelText('DBS Multiplier');
  expect(source.props.accessibilityState.disabled).toBe(true);
});

it('keeps save dimmed until the amount is positive', async () => {
  await open();
  expect(saveDisabled('Add expense')).toBe(true);

  await amount('0');
  expect(saveDisabled('Add expense')).toBe(true);

  await amount('12.5');
  expect(saveDisabled('Add expense')).toBe(false);
});

it('keeps a transfer’s save dimmed while both sides are the same account', async () => {
  await open();
  await type('transfer');
  await amount('200');
  expect(saveDisabled('Add transfer')).toBe(false);

  await fireEvent.press(chips('tx-to').getByLabelText('Interactive Brokers'));
  await fireEvent.press(chips('tx-from').getByLabelText('Interactive Brokers'));
  expect(saveDisabled('Add transfer')).toBe(true);

  await fireEvent.press(saveButton('Add transfer'));
  expect(stub.chainsFor('txn')).toHaveLength(0);
});

it('saves an expense as one negative row with its category, then closes', async () => {
  await open();
  await amount('12.50');
  await fireEvent.changeText(screen.getByTestId('tx-note'), ' Kopitiam ');
  await fireEvent.press(saveButton('Add expense'));

  expect(inserted()).toEqual([
    {
      kind: 'expense',
      account_id: 5,
      amount_cents: -1250,
      date: '2026-09-24',
      description: 'Kopitiam',
      category_id: 3,
    },
  ]);
  expect(onClose).toHaveBeenCalled();
});

it('names an undescribed expense after its category', async () => {
  await open();
  await amount('8');
  await fireEvent.press(saveButton('Add expense'));

  expect(inserted()).toEqual([
    expect.objectContaining({ description: 'Dining', amount_cents: -800 }),
  ]);
});

it('saves a transfer as two rows, out of the source and into the destination', async () => {
  await open();
  await type('transfer');
  await amount('2000');
  await fireEvent.press(chips('tx-to').getByLabelText('Interactive Brokers'));
  await fireEvent.press(saveButton('Add transfer'));

  expect(inserted()).toEqual([
    expect.objectContaining({
      kind: 'transfer',
      account_id: 1,
      amount_cents: -200_000,
      description: 'Transfer to Interactive Brokers',
    }),
    expect.objectContaining({
      kind: 'transfer',
      account_id: 4,
      amount_cents: 200_000,
      description: 'Transfer from DBS Multiplier',
    }),
  ]);
  expect(onClose).toHaveBeenCalled();
});

it('stays open with a message when the save fails', async () => {
  stub.respond('txn', { data: null, error: { message: 'offline' } });
  await open();
  await amount('5');
  await fireEvent.press(saveButton('Add expense'));

  expect(await screen.findByTestId('tx-error')).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
});
