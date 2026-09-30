import type { CardRow, IncomeSourceRow } from '@/types/domain';
import {
  billOf,
  calendarItems,
  chargesByDay,
  dateOf,
  defaultDay,
  isPastDay,
  tileAmount,
  upcomingDays,
} from '../payments';
import { charges, TODAY } from '../../../../test/financeFixtures';

const names = (byDay: ReturnType<typeof chargesByDay>) =>
  Object.fromEntries([...byDay].map(([day, cs]) => [day, cs.map(c => c.name)]));

describe('chargesByDay', () => {
  it('places monthly and weekly charges on their days', () => {
    expect(names(chargesByDay(charges, '2026-09'))).toEqual({
      1: ['HDB home loan'],
      5: ['Home cleaner'],
      12: ['Home cleaner'],
      19: ['Home cleaner'],
      22: ['Netflix'],
      26: ['Home cleaner'],
    });
  });

  it('places quarterly and yearly charges only in their months', () => {
    const october = names(chargesByDay(charges, '2026-10'));
    expect(october[5]).toEqual(['Great Eastern term life']);
    expect(october[15]).toEqual(['AIA HealthShield']);

    const november = names(chargesByDay(charges, '2026-11'));
    expect(Object.values(november).flat()).not.toContain(
      'Great Eastern term life',
    );
    expect(names(chargesByDay(charges, '2027-01'))[5]).toEqual([
      'Great Eastern term life',
    ]);
    expect(
      Object.values(names(chargesByDay(charges, '2027-09'))).flat(),
    ).not.toContain('AIA HealthShield');
  });

  it('puts two charges on the same day together', () => {
    const both = [
      ...charges,
      { ...charges[0]!, id: 9, name: 'S&CC', start_date: '2026-09-01' },
    ];
    expect(names(chargesByDay(both, '2026-09'))[1]).toEqual([
      'HDB home loan',
      'S&CC',
    ]);
  });

  it('leaves out inactive charges and unknown frequencies', () => {
    const odd = [
      { ...charges[0]!, is_active: false },
      { ...charges[4]!, frequency: 'fortnightly' },
    ];
    expect(chargesByDay(odd, '2026-09').size).toBe(0);
  });
});

describe('the days around today', () => {
  const september = chargesByDay(charges, '2026-09');

  it('counts today as past, so a charge due today reads as paid', () => {
    expect(isPastDay('2026-09', 24, TODAY)).toBe(true);
    expect(isPastDay('2026-09', 25, TODAY)).toBe(false);
    expect(isPastDay('2026-08', 31, TODAY)).toBe(true);
    expect(isPastDay('2026-10', 1, TODAY)).toBe(false);
  });

  it('lists the charge days still to come', () => {
    expect(upcomingDays(september, '2026-09', TODAY)).toEqual([26]);
  });

  it('opens on the next charge day, else the first one', () => {
    expect(defaultDay(september, '2026-09', TODAY)).toBe(26);
    expect(defaultDay(september, '2026-09', '2026-09-30')).toBe(1);
    expect(defaultDay(new Map(), '2026-09', TODAY)).toBeNull();
  });
});

it('writes a tile amount in dollars, or thousands to two places', () => {
  expect(tileAmount(7_200)).toBe('S$72');
  expect(tileAmount(12_455)).toBe('S$125');
  expect(tileAmount(114_000)).toBe('S$1.14k');
});

it('dates a day of a month', () => {
  expect(dateOf('2026-09', 5)).toBe('2026-09-05');
});

describe('card bills', () => {
  // Statement on the 18th, due on the 8th: the bill on 8 Oct is for 19 Aug – 18 Sep.
  const card = {
    card_type: 'credit',
    account_id: 9,
    statement_day: 18,
    bill_due_day: 8,
  };
  const txns = [
    { account_id: 9, date: '2026-08-18', kind: 'expense', amount_cents: -500 },
    {
      account_id: 9,
      date: '2026-08-19',
      kind: 'expense',
      amount_cents: -12_000,
    },
    {
      account_id: 9,
      date: '2026-09-18',
      kind: 'expense',
      amount_cents: -3_000,
    },
    { account_id: 9, date: '2026-09-02', kind: 'deposit', amount_cents: 1_000 },
    {
      account_id: 9,
      date: '2026-09-05',
      kind: 'transfer',
      amount_cents: 40_000,
    },
    {
      account_id: 1,
      date: '2026-09-05',
      kind: 'expense',
      amount_cents: -9_999,
    },
    { account_id: 9, date: '2026-09-19', kind: 'expense', amount_cents: -700 },
  ];

  it('falls due on its bill day, for what the cycle before it spent, less refunds', () => {
    expect(billOf(card, txns, '2026-10')).toEqual({ day: 8, cents: 14_000 });
  });

  it('a cycle still open shows what it has spent so far', () => {
    expect(billOf(card, txns, '2026-11')).toEqual({ day: 8, cents: 700 });
  });

  it('a bill due after its statement closes that month is for that cycle', () => {
    const late = { ...card, statement_day: 3, bill_due_day: 25 };
    // 4 Aug – 3 Sep.
    expect(billOf(late, txns, '2026-09')).toEqual({ day: 25, cents: 11_500 });
  });

  it('a day past the month end falls on its last day', () => {
    expect(billOf({ ...card, bill_due_day: 31 }, txns, '2026-02')?.day).toBe(
      28,
    );
  });

  it('none for a debit card or a card without both days', () => {
    expect(billOf({ ...card, card_type: 'debit' }, txns, '2026-10')).toBeNull();
    expect(
      billOf({ ...card, statement_day: null }, txns, '2026-10'),
    ).toBeNull();
    expect(billOf({ ...card, bill_due_day: null }, txns, '2026-10')).toBeNull();
  });
});

describe('calendarItems', () => {
  const salary = {
    id: 7,
    name: 'Acme',
    type: 'salary',
    base_income_cents: 1_000_000,
    payday: 25,
    is_active: true,
    start_date: '2026-01-10',
  } as IncomeSourceRow;
  const altitude = {
    id: 4,
    bank: 'DBS Altitude',
    card_type: 'credit',
    account_id: 9,
    statement_day: 18,
    bill_due_day: 8,
  } as CardRow;

  it('puts charges, card bills and each salary’s payday on their days', () => {
    const byDay = calendarItems(
      {
        charges,
        cards: [altitude],
        incomes: [salary, { ...salary, id: 8, type: 'freelance' }],
        txns: [],
        employeeRate: 0.2,
      },
      '2026-10',
    );
    expect(byDay.get(8)).toEqual([
      { key: 'bill-4', name: 'DBS Altitude bill', cents: 0, kind: 'bill' },
    ]);
    expect(byDay.get(25)).toEqual([
      {
        key: 'payday-7',
        name: 'Payday · Acme',
        cents: 800_000,
        kind: 'payday',
      },
    ]);
    expect(byDay.get(1)?.map(i => i.kind)).toEqual(['charge']);
  });

  it('no payday before the salary starts, or once it is paused', () => {
    const items = (source: IncomeSourceRow) =>
      calendarItems(
        {
          charges: [],
          cards: [],
          incomes: [source],
          txns: [],
          employeeRate: 0.2,
        },
        '2026-09',
      );
    expect(items({ ...salary, start_date: '2026-09-26' }).size).toBe(0);
    expect(items({ ...salary, is_active: false }).size).toBe(0);
    expect(items({ ...salary, payday: 31 }).has(30)).toBe(true);
  });
});
