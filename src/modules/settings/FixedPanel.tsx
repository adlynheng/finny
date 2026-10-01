import { useState } from 'react';
import { Platform } from 'react-native';

import { accountTypeIcons, incomeTypeIcons } from '@/components/icons/registry';
import { INCOME_TYPES, type IncomeSourceRow } from '@/types/domain';
import { intervalLabel, scheduleOf } from '@/utils/derive/recurrence';
import { formatMoney, formatPercent } from '@/utils/format/money';
import { CpfSheet } from './CpfSheet';
import { IncomeSheet } from './IncomeSheet';
import {
  DEFAULT_PAYDAY,
  dayOfMonthLabel,
  INCOME_LABELS,
  perMonthCents,
  ratePercent,
} from './income';
import { GroupGrid, PanelFrame, PanelGroup, PanelRow } from './PanelParts';
import type { PanelHead, SettingsData } from './useSettingsData';

/** Under the stream's name: when it is paid and what reaches the bank. */
function subtitle(source: IncomeSourceRow, employeeRate: number) {
  if (source.type === 'salary') {
    const takeHome = source.base_income_cents * (1 - employeeRate);
    return `Paid on the ${dayOfMonthLabel(
      source.payday ?? DEFAULT_PAYDAY,
    )} · take-home ≈ ${formatMoney(takeHome)}`;
  }
  const schedule = scheduleOf(source);
  if (!schedule) {
    return 'no CPF';
  }
  const monthly =
    schedule.frequency === 'monthly'
      ? ''
      : ` · ≈ ${formatMoney(perMonthCents(source))} / mo`;
  return `${intervalLabel(schedule)}${monthly} · no CPF`;
}

/**
 * Fixed variables: the income streams by type (Salary, Freelance, Others),
 * each with its share of monthly income and group totals per month, then
 * the CPF contributions worked out from the salaries. An income row opens
 * the income drawer; either CPF row opens the CPF rates drawer.
 */
export function FixedPanel({
  data,
  head,
}: {
  data: SettingsData;
  head: PanelHead;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [income, setIncome] = useState<IncomeSourceRow | 'new' | null>(null);
  const [cpfOpen, setCpfOpen] = useState(false);
  const desktop = Platform.OS !== 'ios';
  const { settings, incomes, incomeMonthlyCents } = data;
  const ee = settings.cpf_employee_rate;
  const er = settings.cpf_employer_rate;
  const salaryCents = incomes
    .filter(s => s.type === 'salary')
    .reduce((sum, s) => sum + perMonthCents(s), 0);

  // Local: only this panel's rows light up.
  const hover = (key: string) =>
    desktop
      ? {
          lit: hovered === key,
          onHoverIn: () => setHovered(key),
          onHoverOut: () => setHovered(null),
        }
      : {};

  const groups = INCOME_TYPES.map(type => ({
    type,
    rows: incomes.filter(s => s.type === type),
  })).filter(g => g.rows.length > 0);

  return (
    <PanelFrame
      head={head}
      onAction={() => setIncome('new')}
      sheet={
        <>
          {income && (
            <IncomeSheet
              source={income === 'new' ? null : income}
              onClose={() => setIncome(null)}
            />
          )}
          {cpfOpen && (
            <CpfSheet settings={settings} onClose={() => setCpfOpen(false)} />
          )}
        </>
      }
    >
      <GroupGrid>
        {[
          ...groups.map(({ type, rows }) => (
            <PanelGroup
              key={type}
              testID={`income-group-${type}`}
              label={INCOME_LABELS[type]}
              total={`${formatMoney(
                rows.reduce((sum, s) => sum + perMonthCents(s), 0),
              )} / mo`}
            >
              {rows.map(s => (
                <PanelRow
                  key={s.id}
                  testID={`income-row-${s.id}`}
                  icon={incomeTypeIcons[type]}
                  name={s.name}
                  sub={subtitle(s, ee)}
                  value={formatMoney(s.base_income_cents)}
                  note={`${formatPercent(
                    incomeMonthlyCents > 0
                      ? (perMonthCents(s) / incomeMonthlyCents) * 100
                      : 0,
                  )} of income`}
                  onPress={() => setIncome(s)}
                  {...hover(`income-${s.id}`)}
                />
              ))}
            </PanelGroup>
          )),
          <PanelGroup
            key="cpf"
            testID="income-group-cpf"
            label="CPF contributions"
            total={`${ratePercent(ee + er)} of salary`}
          >
            <PanelRow
              testID="cpf-row-employee"
              icon={accountTypeIcons.CPF}
              name="Employee CPF"
              sub={`${ratePercent(ee)} deducted from salary`}
              value={formatMoney(salaryCents * ee)}
              note="per month"
              onPress={() => setCpfOpen(true)}
              {...hover('ee')}
            />
            <PanelRow
              testID="cpf-row-employer"
              icon={accountTypeIcons.CPF}
              name="Employer CPF"
              sub={`${ratePercent(er)} paid on top of salary`}
              value={formatMoney(salaryCents * er)}
              note="per month"
              onPress={() => setCpfOpen(true)}
              {...hover('er')}
            />
          </PanelGroup>,
        ]}
      </GroupGrid>
    </PanelFrame>
  );
}
