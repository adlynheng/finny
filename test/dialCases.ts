/**
 * The designs' dial data, in cents: FinnyFinance's September budget (24 days
 * in, S$2,712 of a S$3,500 limit) and FinnyPlanner's monthly plan.
 */

import type { AllocationCategory } from '@/components/charts/dialConfigs';

// FinnyFinance `daily()`: weekends heavier, spread to total S$2,712.
const weights = Array.from({ length: 24 }, (_, i) => {
  const d = i + 1;
  const dow = (d + 1) % 7;
  return 1 + (dow === 0 || dow === 6 ? 0.9 : 0) + 0.45 * Math.sin(d * 1.7);
});
const sum = weights.reduce((a, b) => a + b, 0);

export const designBudget = {
  dailyCents: weights.map(w => Math.round((w / sum) * 271_200)),
  daysInMonth: 30,
  spentCents: 271_200,
  limitCents: 350_000,
};

export const designGrossCents = 950_000;

/** CPF and fixed costs first, then the three sliders' starting amounts. */
export const designPlan: AllocationCategory[] = [
  { key: 'cpf', name: 'CPF', cents: 190_000, length: 22 },
  { key: 'fixed', name: 'Fixed', cents: 142_000, length: 30 },
  { key: 'inv', name: 'Investments', cents: 180_000, length: 62 },
  { key: 'sav', name: 'Savings', cents: 150_000, length: 50 },
  { key: 'exp', name: 'Expenditure', cents: 260_000, length: 40 },
];
