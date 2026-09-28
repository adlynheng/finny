import {
  accountTypeIcon,
  accountTypeIcons,
  categoryIcon,
  categoryIconKeys,
  depositIcons,
  expenseIcons,
  ideaIcons,
  tabIcons,
  transactionIcon,
  transactionKindIcons,
} from '@/components/icons/registry';
import { ACCOUNT_TYPES, CATEGORY_KINDS, TXN_KINDS } from '@/types/domain';

// A dot is a circle of radius .55: stroked at 1.1 it reads as a solid dot
// 2.2 units across.
const dot = (x: number, y: number) =>
  `M${x - 0.55} ${y}a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0`;
const DOTS = [dot(4, 8), dot(8, 8), dot(12, 8)].join(' ');

// A path of absolute and relative commands and numbers, nothing else.
const PATH_SHAPE = /^M[\d\s.,\-MmLlHhVvCcSsQqTtAaZz]+$/;

const registries = {
  expenseIcons,
  depositIcons,
  transactionKindIcons,
  accountTypeIcons,
  ideaIcons,
  tabIcons,
};

describe('icon registries', () => {
  it.each(Object.entries(registries))(
    '%s holds only well-formed path strings',
    (_, registry) => {
      for (const path of Object.values(registry)) {
        expect(path).toMatch(PATH_SHAPE);
      }
    },
  );

  it('has every expense category the design names', () => {
    expect(Object.keys(expenseIcons)).toEqual([
      'Food',
      'Groceries',
      'Transport',
      'Shopping',
      'Utilities',
      'Subscriptions',
      'Health',
      'Housing',
      'Travel',
      'Insurance',
      'Bills',
      'Services',
      'Other',
    ]);
  });

  it('has every deposit category the design names', () => {
    expect(Object.keys(depositIcons)).toEqual([
      'Salary',
      'Bonus',
      'Dividends',
      'Interest',
      'Refunds',
      'Transfers',
      'Other',
    ]);
  });

  it('has the trading idea icons and the six mobile tabs', () => {
    expect(Object.keys(ideaIcons)).toEqual(['Rebalance', 'Review', 'Idea']);
    expect(Object.keys(tabIcons)).toEqual([
      'overview',
      'finance',
      'trading',
      'plan',
      'finny',
      'settings',
    ]);
  });

  it('draws Other as three dots in both category sets', () => {
    expect(expenseIcons.Other).toBe(DOTS);
    expect(depositIcons.Other).toBe(DOTS);
  });

  it('keeps the design’s paths exactly', () => {
    expect(expenseIcons.Travel).toBe('M2 9.5l12-5-3 9-3-3.5z M8 10l-1.5 3');
    expect(depositIcons.Salary).toBe(
      `M2 4.5h12v7H2z ${dot(8, 8)} M4.5 6.5v3 M11.5 6.5v3`,
    );
    expect(transactionKindIcons.Transfer).toBe('M14 2L2 7l5 2 2 5z M14 2L7 9');
  });
});

describe('dots', () => {
  it.each(Object.entries(registries))(
    '%s draws no dot as a zero-length line, which renders too small',
    (_, registry) => {
      for (const path of Object.values(registry)) {
        expect(path).not.toMatch(/h\.01/);
      }
    },
  );

  it('draws Interest’s two dots at the same size as Other’s', () => {
    expect(depositIcons.Interest).toBe(`M4 12l8-8 ${dot(5, 5)} ${dot(11, 11)}`);
  });
});

describe('exhaustiveness', () => {
  it.each(ACCOUNT_TYPES)('account type %s has its own icon', type => {
    expect(accountTypeIcon(type)).toBe(accountTypeIcons[type]);
    expect(accountTypeIcon(type)).toMatch(PATH_SHAPE);
  });

  it.each(CATEGORY_KINDS)(
    'every icon the %s picker offers resolves to its own path',
    kind => {
      const registry = kind === 'expense' ? expenseIcons : depositIcons;
      expect(categoryIconKeys(kind)).toEqual(Object.keys(registry));
      for (const key of categoryIconKeys(kind)) {
        expect(categoryIcon(kind, key)).toBe(
          registry[key as keyof typeof registry],
        );
      }
    },
  );

  it.each(TXN_KINDS)('a %s transaction always resolves to a path', kind => {
    for (const key of [null, undefined, '', 'Unknown', 'Food', 'Salary']) {
      expect(transactionIcon(kind, key)).toMatch(PATH_SHAPE);
    }
  });
});

describe('fallbacks', () => {
  it.each(CATEGORY_KINDS)(
    'a %s category with no icon, or an unknown one, falls back to Other',
    kind => {
      for (const key of [null, undefined, '', 'Pets', 'constructor']) {
        expect(categoryIcon(kind, key)).toBe(DOTS);
      }
    },
  );

  it('does not borrow an icon from the other kind', () => {
    // Salary is a deposit icon, not an expense one.
    expect(categoryIcon('expense', 'Salary')).toBe(DOTS);
    expect(categoryIcon('deposit', 'Food')).toBe(DOTS);
  });

  it('shows a transfer with the Transfer icon, whatever its category', () => {
    expect(transactionIcon('transfer', 'Food')).toBe(
      transactionKindIcons.Transfer,
    );
    expect(transactionIcon('transfer', null)).toBe(
      transactionKindIcons.Transfer,
    );
  });

  it('shows an expense or deposit with its category icon', () => {
    expect(transactionIcon('expense', 'Food')).toBe(expenseIcons.Food);
    expect(transactionIcon('deposit', 'Salary')).toBe(depositIcons.Salary);
    expect(transactionIcon('deposit', 'Food')).toBe(DOTS);
  });

  it('falls back to Other for an account type the app does not know', () => {
    expect(accountTypeIcon('Crypto')).toBe(DOTS);
  });
});
