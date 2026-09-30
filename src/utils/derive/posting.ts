/**
 * Which payments are due to post, and the transactions they post as. Every charge and income
 * stream posts each occurrence after its `last_posted_date`, up to and including today, dated on
 * the day it fell due, so a day the app was not opened still lands on the right date. A row that
 * has never posted starts from today: history before it is the user's to enter, and backfilling
 * would double what they already have. Nothing posts before a row's `start_date`, the first
 * payment the form was given.
 */

import { addDays, eachMonthOfInterval } from 'date-fns';

import type {
  AccountRow,
  CategoryRow,
  IncomeSourceRow,
  RecurringChargeRow,
  SettingsRow,
  TxnInsert,
} from '@/types/domain';
import { nextDue, scheduleOf, type Schedule } from '@/utils/derive/recurrence';
import {
  daysInMonth,
  monthKey,
  parseDate,
  toIsoDate,
} from '@/utils/format/date';
import { INCOME_LABELS } from '@/modules/settings/income';

const dayAfter = (date: string) => toIsoDate(addDays(parseDate(date), 1));

/** The last day already posted: `last_posted_date`, or yesterday for a row that has never posted. */
export function postedThrough(
  row: { last_posted_date: string | null },
  today: string,
): string {
  return row.last_posted_date ?? toIsoDate(addDays(parseDate(today), -1));
}

/** The schedule's occurrences after `after`, up to and including `today`. */
export function dueDates(
  schedule: Schedule,
  after: string,
  today: string,
): string[] {
  const dates: string[] = [];
  let next = nextDue(schedule, dayAfter(after));
  while (next !== null && next <= today) {
    dates.push(next);
    next = nextDue(schedule, dayAfter(next));
  }
  return dates.filter(d => d >= schedule.start_date);
}

/**
 * The day of the month a salary's free-text pay day names: the first number in it (`25th`,
 * `25`), or the month's last day for `Last day of month` and anything without one.
 */
export function paydayOf(text: string | null): number | 'last' {
  const n = Number(text?.match(/\d{1,2}/)?.[0]);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : 'last';
}

/** A salary's pay dates after `after`, up to and including `today`; a short month pays on its last day. */
export function paydays(
  payday: string | null,
  after: string,
  today: string,
): string[] {
  const day = paydayOf(payday);
  const from = dayAfter(after);
  if (from > today) {
    return [];
  }
  return eachMonthOfInterval({ start: parseDate(from), end: parseDate(today) })
    .map(month => {
      const key = monthKey(month);
      const last = daysInMonth(key);
      return `${key}-${String(
        day === 'last' ? last : Math.min(day, last),
      ).padStart(2, '0')}`;
    })
    .filter(date => date >= from && date <= today);
}

/** A charge's due payments, each an expense on its account. None without an account. */
export function chargePostings(
  charge: RecurringChargeRow,
  today: string,
): TxnInsert[] {
  const schedule = scheduleOf(charge);
  if (!charge.is_active || charge.account_id === null || !schedule) {
    return [];
  }
  return dueDates(schedule, postedThrough(charge, today), today).map(date => ({
    account_id: charge.account_id,
    date,
    description: charge.name,
    category_id: charge.category_id,
    kind: 'expense',
    amount_cents: -charge.amount_cents,
    recurring_id: charge.id,
  }));
}

export type IncomeContext = {
  settings: Pick<
    SettingsRow,
    'cpf_employee_rate' | 'cpf_oa_rate' | 'cpf_sa_rate' | 'cpf_ma_rate'
  >;
  /** Active accounts; the CPF ones take a salary's contributions. */
  accounts: readonly Pick<
    AccountRow,
    'id' | 'type' | 'cpf_type' | 'is_active'
  >[];
  /** Deposit categories; `Salary` and `Freelance` label their streams. */
  categories: readonly Pick<CategoryRow, 'id' | 'name'>[];
};

/**
 * An income stream's due payments. A salary pays its take-home (gross less the employee's CPF
 * share) into its account as a deposit, and each CPF account its share of the gross as a
 * transfer, so the contributions move the CPF balances without counting as money in. Other
 * streams pay their whole amount. None without an account.
 */
export function incomePostings(
  source: IncomeSourceRow,
  { settings, accounts, categories }: IncomeContext,
  today: string,
): TxnInsert[] {
  const schedule = scheduleOf(source);
  if (!source.is_active || source.account_id === null || !schedule) {
    return [];
  }
  const after = postedThrough(source, today);
  const salary = source.type === 'salary';
  const dates = salary
    ? paydays(source.payday, after, today).filter(d => d >= source.start_date)
    : dueDates(schedule, after, today);
  const label = INCOME_LABELS[source.type as keyof typeof INCOME_LABELS];
  const category = categories.find(c => c.name === label)?.id ?? null;
  const gross = source.base_income_cents;
  const cpf = salary
    ? (
        [
          ['OA', settings.cpf_oa_rate],
          ['SA', settings.cpf_sa_rate],
          ['MA', settings.cpf_ma_rate],
        ] as const
      ).flatMap(([type, rate]) => {
        const account = accounts.find(
          a => a.is_active && a.type === 'CPF' && a.cpf_type === type,
        );
        return account
          ? [{ account_id: account.id, cents: Math.round(gross * rate) }]
          : [];
      })
    : [];
  return dates.flatMap(date => [
    {
      account_id: source.account_id,
      date,
      description:
        source.type === 'other' ? source.name : `${label} · ${source.name}`,
      category_id: category,
      kind: 'deposit',
      amount_cents: salary
        ? Math.round(gross * (1 - settings.cpf_employee_rate))
        : gross,
      income_id: source.id,
    },
    ...cpf.map(c => ({
      account_id: c.account_id,
      date,
      description: `CPF contribution · ${source.name}`,
      category_id: null,
      kind: 'transfer',
      amount_cents: c.cents,
      income_id: source.id,
    })),
  ]);
}
