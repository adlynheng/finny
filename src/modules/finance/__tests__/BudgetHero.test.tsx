import { Platform } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RadialDial } from '@/components/charts/RadialDial';
import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { BudgetDial } from '../BudgetDial';
import { BudgetStats } from '../BudgetStats';
import { BudgetSummary } from '../BudgetSummary';
import { useBudget } from '../useBudget';
import { classes } from '../../../../test/classes';
import { september, settings, TODAY } from '../../../../test/financeFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

// The dial itself is RadialDial's and budgetDial's to test; here, only what it is given.
jest.mock('@/components/charts/RadialDial', () => ({
  RadialDial: jest.fn(() => null),
}));

const stub = supabase as unknown as SupabaseStub;

function Hero() {
  const budget = useBudget();
  return (
    <>
      <BudgetSummary budget={budget} />
      {budget && <BudgetStats budget={budget} />}
      {budget && <BudgetDial budget={budget} className="h-full" />}
    </>
  );
}

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  jest.mocked(RadialDial).mockClear();
  stub.respond('txn', { data: september, error: null });
  stub.respond('settings', { data: settings(), error: null });
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

const text = (id: string) => screen.getByTestId(id);

it('shows what is left of the limit and the days to go', async () => {
  await renderWithClient(<Hero />);

  // S$3,500 less S$1,366.38 spent to the 24th.
  expect(await screen.findByTestId('budget-left')).toHaveTextContent('2,134');
  expect(text('budget-left-label')).toHaveTextContent('left to spend');
  expect(text('budget-limit')).toHaveTextContent(
    'of S$3,500 monthly limit · 7 days to go',
  );
  expect(classes(text('budget-left'))).toContain('text-ink');
});

it('shows the pace, the daily average and the safe daily spend', async () => {
  await renderWithClient(<Hero />);

  expect(await screen.findByTestId('budget-spent-value')).toHaveTextContent(
    'S$1,366',
  );
  // Even pace by the 24th is S$2,800.
  expect(text('budget-spent-note')).toHaveTextContent('S$1,434 under pace');
  expect(text('budget-daily-value')).toHaveTextContent('S$57');
  expect(text('budget-daily-note')).toHaveTextContent(/over 24 days$/);
  // S$2,133.62 over the 7 days left, today included.
  expect(text('budget-safe-value')).toHaveTextContent('S$305');
  expect(text('budget-safe-note')).toHaveTextContent(/7 days left$/);
});

it('flips to over limit, in the danger colour, once spend passes the limit', async () => {
  stub.respond('settings', { data: settings(100_000), error: null });
  await renderWithClient(<Hero />);

  expect(await screen.findByTestId('budget-left')).toHaveTextContent('366');
  expect(text('budget-left-label')).toHaveTextContent('over limit');
  expect(classes(text('budget-left'))).toContain('text-danger');
  expect(classes(text('budget-left-label'))).toContain('text-danger');
  expect(text('budget-safe-value')).toHaveTextContent('S$0');
});

it('edits the limit in place, and saving writes it and refreshes every figure', async () => {
  stub.respond(
    'settings',
    { data: settings(), error: null },
    { data: settings(200_000), error: null },
  );
  await renderWithClient(<Hero />);
  await fireEvent.press(await screen.findByTestId('budget-edit'));

  expect(screen.queryByTestId('budget-limit')).toBeNull();
  expect(text('budget-limit-input').props.value).toBe('3500');
  await fireEvent.changeText(text('budget-limit-input'), 'S$2,000');
  await fireEvent.press(text('budget-save'));

  expect(stub.chainsFor('settings')).toContainEqual([
    ['update', { monthly_expenditure_cents: 200_000 }],
    ['eq', 'id', 1],
    ['select'],
    ['single'],
  ]);
  await waitFor(() =>
    expect(text('budget-limit')).toHaveTextContent(
      /^of S\$2,000 monthly limit/,
    ),
  );
  expect(text('budget-left')).toHaveTextContent('634');
  expect(jest.mocked(RadialDial).mock.lastCall![0]).toMatchObject({
    arc: { over: false },
  });
});

it('cancelling the edit leaves the limit alone', async () => {
  await renderWithClient(<Hero />);
  await fireEvent.press(await screen.findByTestId('budget-edit'));
  await fireEvent.changeText(text('budget-limit-input'), '10');
  await fireEvent.press(text('budget-cancel'));

  expect(text('budget-limit')).toHaveTextContent(/of S\$3,500 monthly limit/);
  expect(
    stub.chainsFor('settings').some(chain => chain[0]?.[0] === 'update'),
  ).toBe(false);
});

it('gives the dial a tick per day so far, the share used and the even pace', async () => {
  await renderWithClient(<Hero />);
  await screen.findByTestId('budget-left');

  const config = jest.mocked(RadialDial).mock.lastCall![0];
  const ticks = config.groups.flatMap(g => (g.dots ? [] : g.ticks));
  expect(ticks).toHaveLength(24);
  // The 1st (S$1,140) is the biggest day: the full 68.
  expect(ticks[0]).toBeCloseTo(68);
  expect(config.groups.find(g => g.dots)!.ticks).toHaveLength(6);
  expect(config.arc).toMatchObject({ over: false });
  expect(config.arc!.to).toBeCloseTo(136_638 / 350_000);
  expect(config.pace!.at).toBeCloseTo(24 / 30);
  expect(config.stagger).toEqual({ ms: 25, from: 1 });
  expect(config.centre.primary).toBe('39%');
});

it('turns the dial’s arc to danger past the limit', async () => {
  stub.respond('settings', { data: settings(100_000), error: null });
  await renderWithClient(<Hero />);
  await screen.findByTestId('budget-left');

  expect(jest.mocked(RadialDial).mock.lastCall![0].arc).toMatchObject({
    over: true,
  });
});

it('takes no touches: a readout, not a control', async () => {
  await renderWithClient(<Hero />);
  expect((await screen.findByTestId('budget-dial')).props.pointerEvents).toBe(
    'none',
  );
});

it('sets the stats with lime bullets on desktop, in a glass panel on mobile', async () => {
  jest.replaceProperty(Platform, 'OS', 'macos');
  await renderWithClient(<Hero />);
  expect(classes(await screen.findByTestId('budget-stats'))).toContain(
    'border-t',
  );
  expect(text('budget-daily-note')).toHaveTextContent('Average over 24 days');
});
