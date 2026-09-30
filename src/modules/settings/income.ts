import type { IncomeSourceRow, IncomeType } from '@/types/domain';
import { monthlyEquivalentCents, scheduleOf } from '@/utils/derive/recurrence';

export const INCOME_LABELS: Record<IncomeType, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  other: 'Others',
};

/** A salary stream's pay day when none is set. */
export const DEFAULT_PAYDAY = 'Last day of month';

/** A rate as the drawer and rows show it: 0.2 is `20%`. */
export const ratePercent = (rate: number) => `${+(rate * 100).toFixed(2)}%`;

/** A stream's per-month equivalent, zero for a frequency the app does not know. */
export function perMonthCents(source: IncomeSourceRow): number {
  const schedule = scheduleOf(source);
  return schedule
    ? monthlyEquivalentCents(source.base_income_cents, schedule)
    : 0;
}
