import { Platform } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { categoryIconKeys } from '@/components/icons/registry';
import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import {
  initialUiState,
  useUiStore,
  type SettingsPanel,
} from '@/stores/uiStore';
import { SettingsScreen } from '../SettingsScreen';
import { classes } from '../../../../test/classes';
import { TODAY } from '../../../../test/financeFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import { respondSettings } from '../../../../test/settingsFixtures';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  useUiStore.setState(initialUiState());
  jest.replaceProperty(Platform, 'OS', 'macos');
  respondSettings(stub);
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

const draw = async (panel: SettingsPanel = 'accounts') => {
  useUiStore.setState({ settingsPanel: panel });
  await renderWithClient(
    <>
      <SettingsScreen />
      <PortalHost />
    </>,
  );
  await screen.findByTestId('settings-panel');
};
const text = (testID: string) => screen.getByTestId(testID).props.children;
const row = (testID: string) =>
  within(screen.getByTestId(testID))
    .queryAllByText(/.*/)
    .map(t => t.props.children);
const summary = () => text('settings-panel-summary');
const sheet = () => within(screen.getByTestId('sheet-surface'));
/** The drawer's Remove action. */
const danger = () => sheet().getByLabelText(/^Remove /);
const inserts = (table: string) =>
  stub.chainsFor(table).filter(chain => chain[0]?.[0] === 'insert');

describe('the nav', () => {
  it('lists the four panels with their counts, the selected one white with a lime dot', async () => {
    await draw();
    const nav = within(screen.getByTestId('settings-nav'));
    expect(
      nav.getAllByRole('tab').map(t => t.props.accessibilityLabel),
    ).toEqual([
      'Accounts & balances',
      'Expenditure categories',
      'Deposit categories',
      'Fixed variables',
    ]);
    expect(nav.getByText('5 accounts')).toBeTruthy();
    expect(nav.getByText('5 categories')).toBeTruthy();
    expect(nav.getByText('2 categories')).toBeTruthy();
    expect(nav.getByText('3 income streams')).toBeTruthy();
    expect(classes(screen.getByTestId('settings-nav-accounts'))).toContain(
      'bg-white',
    );
    expect(
      within(screen.getByTestId('settings-nav-accounts')).getByTestId(
        'settings-nav-dot',
      ),
    ).toBeTruthy();
  });

  it('switches the panel, its title, summary and action', async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('settings-nav-fixed'));
    expect(summary()).toBe('3 income streams · S$13,450 / month');
    expect(screen.getByLabelText('Add income')).toBeTruthy();
  });
});

describe('Accounts & balances', () => {
  it('groups by type in the fixed order, with totals; a card’s owed balance negated', async () => {
    await draw();
    expect(summary()).toBe('5 accounts · S$142,950 in assets');
    expect(
      ['Savings', 'CPF', 'Broker', 'Credit card'].map(t =>
        text(`account-group-${t}-total`),
      ),
    ).toEqual(['S$42,300', 'S$38,200', 'S$62,450', '−S$1,200.00']);
    expect(row('account-group-Credit card')[0]).toBe('Credit cards');
    expect(row('account-row-5')).toEqual([
      'DBS Altitude',
      'Credit card',
      '−S$1,200.00',
      'liability',
    ]);
    expect(row('account-row-1')).toEqual([
      'DBS Multiplier',
      'Savings',
      'S$28,400',
      '19.9% of assets',
    ]);
  });

  it('hovering a row lights its share segment, and the segment lights the row', async () => {
    await draw();
    await fireEvent(screen.getByTestId('account-row-3'), 'hoverIn');
    expect(classes(screen.getByTestId('account-row-3'))).toContain(
      'bg-ink/[.04]',
    );
    expect(classes(screen.getByTestId('share-segment-3'))).toContain('bg-lime');
    await fireEvent(screen.getByTestId('account-row-3'), 'hoverOut');
    expect(classes(screen.getByTestId('share-segment-3'))).not.toContain(
      'bg-lime',
    );

    await fireEvent(screen.getByTestId('share-row-4'), 'hoverIn');
    expect(classes(screen.getByTestId('account-row-4'))).toContain(
      'bg-ink/[.04]',
    );
  });

  it('New account adds one to its type’s asset class', async () => {
    await draw();
    await fireEvent.press(screen.getByLabelText('New account'));
    expect(screen.getByLabelText('Add').props.accessibilityState.disabled).toBe(
      true,
    );
    await fireEvent.changeText(
      screen.getByLabelText('Account name'),
      'Endowus',
    );
    await fireEvent.press(
      within(screen.getByTestId('account-type')).getByText('Broker'),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Current balance'),
      '16500',
    );
    await fireEvent.press(screen.getByLabelText('Add'));
    expect(inserts('account')[0]![0]).toEqual([
      'insert',
      {
        name: 'Endowus',
        type: 'Broker',
        note: null,
        balance_cents: 1_650_000,
        is_liability: false,
        asset_class_id: 3,
        cpf_type: null,
      },
    ]);
  });

  it('a credit card’s balance is “Balance owed”, a liability', async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('account-row-5'));
    expect(screen.getByText('Edit account')).toBeTruthy();
    expect(screen.getByLabelText('Balance owed').props.value).toBe('1200');
    expect(text('account-hint')).toBe(
      'Card balances count as liabilities, not assets.',
    );
    await fireEvent.press(
      within(screen.getByTestId('account-type')).getByText('Savings'),
    );
    expect(screen.getByLabelText('Current balance')).toBeTruthy();
    expect(text('account-hint')).toBe('Counts toward your share of assets.');
  });

  it('editing saves by id', async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('account-row-2'));
    await fireEvent.changeText(
      screen.getByLabelText('Institution or note'),
      'Bonus interest account',
    );
    await fireEvent.press(screen.getByLabelText('Save changes'));
    const update = stub.chainsFor('account').find(c => c[0]?.[0] === 'update')!;
    expect(update[0]![1]).toMatchObject({
      name: 'UOB One',
      note: 'Bonus interest account',
      balance_cents: 1_390_000,
      asset_class_id: 1,
    });
    expect(update[1]).toEqual(['eq', 'id', 2]);
  });

  it('Remove account asks first, naming its card, then unlinks and deletes', async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('account-row-1'));
    await fireEvent.press(danger());
    expect(text('confirm-detail')).toBe(
      'Its transactions stay, no longer tied to an account. Its card •••• 0157 is removed with it. This can’t be undone.',
    );
    // The dialog's Cancel, over the drawer's.
    await fireEvent.press(screen.getAllByLabelText('Cancel').at(-1)!);
    expect(stub.chainsFor('account').some(c => c[0]?.[0] === 'delete')).toBe(
      false,
    );
    await fireEvent.press(danger());
    await fireEvent.press(screen.getByTestId('confirm-delete'));
    expect(stub.chainsFor('txn')).toContainEqual([
      ['update', { account_id: null }],
      ['eq', 'account_id', 1],
    ]);
    expect(stub.chainsFor('card')).toContainEqual([
      ['delete'],
      ['eq', 'account_id', 1],
    ]);
    expect(stub.chainsFor('account')).toContainEqual([
      ['delete'],
      ['eq', 'id', 1],
    ]);
  });
});

it('an account with two cards says so', async () => {
  await draw();
  await fireEvent.press(screen.getByTestId('account-row-5'));
  await fireEvent.press(danger());
  expect(text('confirm-detail')).toBe(
    'Its transactions stay, no longer tied to an account. Its 2 cards are removed with it. This can’t be undone.',
  );
});

describe('Category panels', () => {
  it('expenditure: a tile per expense category with this month’s spend, then New category', async () => {
    await draw('expenditure');
    expect(summary()).toBe('5 categories · S$1,366.38 spent in Sep');
    // The Personal Finance Categories view's figures for September.
    expect([3, 4, 5, 6, 7].map(id => text(`category-total-${id}`))).toEqual([
      'S$86.40 spent in Sep',
      'S$120 spent in Sep',
      'S$1,140 spent in Sep',
      'S$19.98 spent in Sep',
      'S$0 spent in Sep',
    ]);
    expect(screen.getByTestId('category-new-tile')).toBeTruthy();
    expect(screen.queryByTestId('category-tile-1')).toBeNull();
  });

  it('deposit: the same panel on deposit categories, received rather than spent', async () => {
    await draw('deposit');
    expect(summary()).toBe('2 categories · S$8,162 received in Sep');
    expect([1, 2].map(id => text(`category-total-${id}`))).toEqual([
      'S$6,800 received in Sep',
      'S$1,362 received in Sep',
    ]);
    expect(screen.queryByTestId('category-tile-3')).toBeNull();
  });

  it.each([
    ['expenditure', 'expense', 'New category'],
    ['deposit', 'deposit', 'New deposit category'],
  ] as const)(
    '%s: the drawer picks from its own icons, has no limit, and adds to its kind',
    async (panel, kind, title) => {
      await draw(panel);
      await fireEvent.press(screen.getByTestId('category-new-tile'));
      expect(
        within(screen.getByTestId('sheet-header')).getByText(title),
      ).toBeTruthy();
      expect(
        within(screen.getByTestId('category-icons'))
          .getAllByRole('radio')
          .map(r => r.props.accessibilityLabel),
      ).toEqual(categoryIconKeys(kind));
      expect(sheet().queryByText(/limit/i)).toBeNull();
      await fireEvent.changeText(screen.getByLabelText('Name'), 'Pets');
      await fireEvent.press(screen.getByTestId('category-icon-Other'));
      await fireEvent.press(screen.getByLabelText('Add'));
      expect(inserts('category')[0]![0]).toEqual([
        'insert',
        { name: 'Pets', icon: 'Other', kind },
      ]);
    },
  );

  it('the chosen icon is ink with a lime glyph', async () => {
    await draw('expenditure');
    await fireEvent.press(screen.getByTestId('category-tile-3'));
    expect(classes(screen.getByTestId('category-icon-Groceries'))).toContain(
      'bg-ink',
    );
    expect(classes(screen.getByTestId('category-icon-Food'))).toContain(
      'bg-white',
    );
  });

  it('Remove category asks first, then leaves its transactions uncategorised', async () => {
    await draw('expenditure');
    await fireEvent.press(screen.getByTestId('category-tile-4'));
    await fireEvent.press(danger());
    expect(text('confirm-detail')).toBe(
      'Its transactions and recurring charges stay, uncategorised. This can’t be undone.',
    );
    await fireEvent.press(screen.getByTestId('confirm-delete'));
    expect(stub.chainsFor('txn')).toContainEqual([
      ['update', { category_id: null }],
      ['eq', 'category_id', 4],
    ]);
    expect(stub.chainsFor('category')).toContainEqual([
      ['delete'],
      ['eq', 'id', 4],
    ]);
  });
});

describe('Fixed variables', () => {
  it('groups income by type with per-month totals and shares, then CPF', async () => {
    await draw('fixed');
    expect(row('income-group-salary')).toEqual([
      'Salary',
      'S$12,000 / mo',
      'Salary',
      'Paid on the 25th · take-home ≈ S$9,600',
      'S$12,000',
      '89.2% of income',
    ]);
    expect(row('income-row-2')).toEqual([
      'Design retainer',
      'Monthly · no CPF',
      'S$850',
      '6.3% of income',
    ]);
    expect(row('income-row-3')).toEqual([
      'Condo rental share',
      'Every 6 months · ≈ S$600 / mo · no CPF',
      'S$3,600',
      '4.5% of income',
    ]);
    expect(text('income-group-other-total')).toBe('S$600 / mo');
    expect(row('income-group-cpf')).toEqual([
      'CPF contributions',
      '37% of salary',
      'Employee CPF',
      '20% deducted from salary',
      'S$2,400',
      'per month',
      'Employer CPF',
      '17% paid on top of salary',
      'S$2,040',
      'per month',
    ]);
  });

  it('the CPF drawer edits only the two rates', async () => {
    await draw('fixed');
    await fireEvent.press(screen.getByTestId('cpf-row-employer'));
    expect(screen.getByLabelText('Employee CPF rate').props.value).toBe('20');
    await fireEvent.changeText(
      screen.getByLabelText('Employer CPF rate'),
      '17.5',
    );
    await fireEvent.press(screen.getByLabelText('Save changes'));
    expect(
      stub.chainsFor('settings').find(c => c[0]?.[0] === 'update')![0],
    ).toEqual(['update', { cpf_employee_rate: 0.2, cpf_employer_rate: 0.175 }]);
  });

  it('the income drawer: a salary’s pay day, another stream’s frequency, Custom’s interval', async () => {
    await draw('fixed');
    await fireEvent.press(screen.getByLabelText('Add income'));
    expect(screen.getByLabelText('Monthly amount')).toBeTruthy();
    expect(screen.getByLabelText('Pay day').props.value).toBe('31');
    expect(text('income-hint')).toBe(
      'Day of the month, 1–31; 31 pays on the last day. Salary is subject to CPF contributions.',
    );
    // A pay day is a day of the month.
    await fireEvent.changeText(screen.getByLabelText('Source'), 'Acme');
    await fireEvent.changeText(screen.getByLabelText('Monthly amount'), '9000');
    await fireEvent.changeText(screen.getByLabelText('Pay day'), '32');
    expect(screen.getByLabelText('Add').props.accessibilityState.disabled).toBe(
      true,
    );
    await fireEvent.changeText(screen.getByLabelText('Pay day'), '2a5');
    expect(screen.getByLabelText('Pay day').props.value).toBe('25');
    expect(screen.getByLabelText('Add').props.accessibilityState.disabled).toBe(
      false,
    );
    expect(screen.queryByTestId('income-frequency')).toBeNull();

    await fireEvent.press(
      within(screen.getByTestId('income-type')).getByText('Others'),
    );
    expect(screen.getByLabelText('Source').props.placeholder).toBe(
      'e.g. Rental income',
    );
    expect(screen.queryByLabelText('Pay day')).toBeNull();
    expect(text('income-hint')).toBe(
      'Not subject to CPF. Converted to a monthly equivalent for planning.',
    );
    await fireEvent.press(
      within(screen.getByTestId('income-frequency')).getByText('Quarterly'),
    );
    expect(screen.getByLabelText('Amount per payment')).toBeTruthy();
    expect(screen.queryByLabelText('Repeats every')).toBeNull();

    await fireEvent.press(
      within(screen.getByTestId('income-frequency')).getByText('Custom'),
    );
    await fireEvent.changeText(screen.getByLabelText('Source'), 'Tutoring');
    await fireEvent.changeText(
      screen.getByLabelText('Amount per payment'),
      '300',
    );
    await fireEvent.changeText(screen.getByLabelText('Repeats every'), '');
    expect(screen.getByLabelText('Add').props.accessibilityState.disabled).toBe(
      true,
    );
    await fireEvent.changeText(screen.getByLabelText('Repeats every'), '2');
    await fireEvent.press(
      within(screen.getByTestId('income-unit')).getByText('Weeks'),
    );
    // Paid into a savings account: the first, unless another is picked.
    const into = within(screen.getByTestId('income-account'));
    expect(into.queryByText('CPF Ordinary')).toBeNull();
    await fireEvent.press(into.getByText('UOB One'));
    await fireEvent.press(screen.getByLabelText('Add'));
    expect(inserts('income_source')[0]![0]).toEqual([
      'insert',
      {
        type: 'other',
        name: 'Tutoring',
        base_income_cents: 30_000,
        frequency: 'custom',
        custom_every: 2,
        custom_unit: 'weeks',
        payday: null,
        start_date: TODAY,
        account_id: 2,
      },
    ]);
  });

  it('Remove income stream asks first, keeping its past payments', async () => {
    await draw('fixed');
    await fireEvent.press(screen.getByTestId('income-row-2'));
    await fireEvent.press(danger());
    await fireEvent.press(screen.getByTestId('confirm-delete'));
    expect(stub.chainsFor('txn')).toContainEqual([
      ['update', { income_id: null }],
      ['eq', 'income_id', 2],
    ]);
    expect(stub.chainsFor('income_source')).toContainEqual([
      ['delete'],
      ['eq', 'id', 2],
    ]);
  });
});

describe('Share of assets (Settings)', () => {
  it('says Gross assets and totals what the cards owe, liabilities only', async () => {
    await draw();
    expect(text('share-label')).toBe('Gross assets');
    expect(screen.getByTestId('share-owed-total')).toHaveTextContent(
      '−S$1,200.00',
    );
  });
});
