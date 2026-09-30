import { Platform } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { PortalHost } from '@rn-primitives/portal';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import { RadialDial } from '@/components/charts/RadialDial';
import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { usePlanStore } from '@/stores/planStore';
import { PlannerScreen } from '../PlannerScreen';
import { classes } from '../../../../test/classes';
import { TODAY } from '../../../../test/financeFixtures';
import {
  goals,
  plannerSettings,
  respondPlanner,
} from '../../../../test/plannerFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import { testIDsInOrder } from '../../../../test/sheetCases';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

// The dial itself is RadialDial's and allocationDial's to test; here, only what it is given.
jest.mock('@/components/charts/RadialDial', () => ({
  RadialDial: jest.fn(() => null),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  usePlanStore.setState({ draft: null });
  respondPlanner(stub);
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

async function open() {
  await renderWithClient(
    <>
      <PlannerScreen />
      <PortalHost />
    </>,
  );
  await screen.findByTestId('plan-left');
}

const byId = (id: string) => screen.getByTestId(id);
const has = (id: string, text: string | RegExp) =>
  expect(byId(id)).toHaveTextContent(text, { exact: false });
const amount = (id: string) => byId(`plan-${id}-amount`);
const dial = () => jest.mocked(RadialDial).mock.lastCall![0];
const disabled = (id: string) =>
  byId(id).props.accessibilityState.disabled as boolean;

/** Types into an allocation's field, as focusing and typing do. */
async function type(id: string, text: string) {
  await fireEvent(amount(id), 'focus');
  await fireEvent.changeText(amount(id), text);
}

describe('on macOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'macos'));

  it('lays out the design’s grid: the hero over the goals, beside the commitments', async () => {
    await open();
    const flex = (el: ReturnType<typeof byId>) =>
      classes(el).filter(c => /^(grow|basis)/.test(c));
    // The left column spans three grid columns, so starts from two gaps.
    expect(flex(byId('planner-hero').parent!)).toEqual([
      'grow-[3.25]',
      'basis-[28px]',
    ]);
    expect(flex(byId('planner-rec'))).toEqual(['grow-[1.15]', 'basis-0']);
    expect(classes(byId('planner-hero'))).toContain('h-planner-row');
  });

  describe('the hero', () => {
    it('shows what is left of gross once CPF, fixed costs and the plan are taken', async () => {
      await open();
      has('plan-month', 'Sep 2026');
      expect(byId('plan-left')).toHaveTextContent('566');
      expect(byId('plan-left-label')).toHaveTextContent('left to allocate');
      expect(classes(byId('plan-left-label'))).toContain('text-muted');
      // S$2,400 of CPF and S$1,533.98 of charges.
      expect(byId('plan-sub')).toHaveTextContent(
        'of S$12,000 gross · S$3,934 goes to CPF and fixed costs first',
      );
      expect(amount('investments').props.value).toBe('2,000');
      expect(amount('expenditure').props.value).toBe('3,500');
      expect(byId('plan-expenditure-percent')).toHaveTextContent(
        '29% of gross',
      );
    });

    it('reads “All allocated” at exactly zero, and “over income” in danger past it', async () => {
      await open();
      await type('expenditure', '4066');
      expect(byId('plan-left')).toHaveTextContent('0');
      expect(byId('plan-left-label')).toHaveTextContent(
        'All allocated · every dollar has a job',
      );
      expect(classes(byId('plan-left-label'))).toContain('text-ink');

      await fireEvent.changeText(amount('expenditure'), '5000');
      expect(byId('plan-left')).toHaveTextContent('934');
      expect(byId('plan-left-label')).toHaveTextContent('over income');
      expect(classes(byId('plan-left-label'))).toContain('text-danger');
      expect(dial().arc).toMatchObject({ over: true });
    });

    it('updates as it is typed, clamped to five digits and to gross income', async () => {
      await open();
      await type('savings', 'S$1,234,567');
      // The field keeps five digits; the amount stops at gross.
      expect(amount('savings').props.value).toBe('12345');
      expect(byId('plan-savings-percent')).toHaveTextContent('100% of gross');

      await fireEvent(amount('savings'), 'blur');
      expect(amount('savings').props.value).toBe('12,000');
    });

    it('snaps a drag to S$50, and drops anything half-typed', async () => {
      await open();
      await fireEvent(byId('plan-investments-track'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 28 } },
      });
      await type('investments', '12');
      // A third of the way along S$5,000 is S$1,666.67: S$1,650.
      await act(() =>
        fireGestureHandler(getByGestureTestId('plan-investments-track-drag'), [
          { state: State.BEGAN, x: 100 },
          { state: State.ACTIVE, x: 100 },
          { x: 150 },
          { state: State.END, x: 150 },
        ]),
      );
      await waitFor(() =>
        expect(amount('investments').props.value).toBe('2,500'),
      );
      await waitFor(() =>
        expect(
          getAnimatedStyle(byId('plan-investments-track-fill') as any),
        ).toMatchObject({ width: '50%' }),
      );
    });

    it('marks unsaved changes; Reset restores the saved plan', async () => {
      await open();
      has('plan-saved', '· matches saved plan');
      expect(disabled('plan-save')).toBe(true);
      expect(disabled('plan-reset')).toBe(true);

      await type('investments', '2500');
      has('plan-saved', '· unsaved changes');
      expect(disabled('plan-save')).toBe(false);

      await fireEvent.press(byId('plan-reset'));
      expect(amount('investments').props.value).toBe('2,000');
      has('plan-saved', '· matches saved plan');
    });

    it('typing the saved amount back is clean again', async () => {
      await open();
      await type('investments', '2500');
      await fireEvent.changeText(amount('investments'), '2000');
      has('plan-saved', '· matches saved plan');
    });

    it('saves the three amounts to the settings row', async () => {
      await open();
      await type('savings', '2500');
      await fireEvent(amount('savings'), 'blur');
      stub.respond('settings', {
        data: plannerSettings({ savings: 250_000 }),
        error: null,
      });
      await fireEvent.press(byId('plan-save'));

      expect(stub.chainsFor('settings')).toContainEqual([
        [
          'update',
          {
            monthly_investment_cents: 200_000,
            monthly_savings_cents: 250_000,
            monthly_expenditure_cents: 350_000,
          },
        ],
        ['eq', 'id', 1],
        ['select'],
        ['single'],
      ]);
      await waitFor(() => has('plan-saved', '· matches saved plan'));
      expect(amount('savings').props.value).toBe('2,500');
    });

    it('highlights a hovered or focused row, and its group on the dial', async () => {
      await open();
      expect(dial().selected).toBeNull();
      await fireEvent(byId('plan-savings'), 'hoverIn');
      expect(classes(byId('plan-savings'))).toContain('bg-white/55');
      expect(dial().selected).toBe('savings');
      await fireEvent(byId('plan-savings'), 'hoverOut');
      expect(dial().selected).toBeNull();

      await fireEvent(amount('expenditure'), 'focus');
      expect(dial().selected).toBe('expenditure');
      await fireEvent(amount('expenditure'), 'blur');
      expect(dial().selected).toBeNull();
    });
  });

  describe('the dial', () => {
    it('groups CPF, fixed costs and the three allocations, the rest as dots', async () => {
      await open();
      const { groups, centre, arc } = dial();
      expect(groups.map(g => [g.key, g.ticks.length, !!g.dots])).toEqual([
        // 96 ticks shared by amount, out of S$12,000.
        ['cpf', 19, false],
        ['fixed', 12, false],
        ['investments', 16, false],
        ['savings', 16, false],
        ['expenditure', 28, false],
        ['unallocated', 5, true],
      ]);
      expect(groups[0]!.label).toEqual({ name: 'CPF', value: 'S$2,400' });
      expect(centre).toMatchObject({
        primary: 'S$12,000',
        secondary: 'gross income · 95% allocated',
      });
      expect(arc).toMatchObject({ to: 'groups', over: false });
    });

    it('tracks the sliders, and drops the dots once nothing is left', async () => {
      await open();
      await type('investments', '3000');
      // S$3,000 of S$12,434 now allocated: 23 of the 96 ticks.
      expect(
        dial().groups.find(g => g.key === 'investments')!.ticks,
      ).toHaveLength(23);
      await fireEvent.changeText(amount('investments'), '2566');
      expect(dial().groups.some(g => g.dots)).toBe(false);
    });
  });

  describe('fixed commitments', () => {
    it('groups the charges by category as monthly equivalents', async () => {
      await open();
      has('commitments-total', 'S$1,534');
      expect(byId('commitments-sub')).toHaveTextContent(
        'per month · 12.8% of gross',
      );
      has('commitment-5-amount', 'S$1,140');
      expect(byId('commitment-5-detail')).toHaveTextContent(
        '1 charge · HDB home loan',
      );
      // The cleaner (S$260), term life (S$62) and HealthShield (S$52).
      has('commitment-7-amount', 'S$374');
      expect(byId('commitment-7-detail')).toHaveTextContent(
        '3 charges · Home cleaner, Great Eastern term life, AIA HealthShield',
      );
      has('commitment-6', '1%');
    });

    it('sizes each bar and its row together by amount, a small one no shorter than S$110’s', async () => {
      await open();
      const pair = (key: string) => byId(`commitment-pair-${key}`);
      expect(pair('5').props.style).toMatchObject({ flex: 114_000 });
      expect(pair('6').props.style).toMatchObject({ flex: 11_000 });
      // The bar and the row share one row, so the bar is exactly the row's height.
      expect(within(pair('5')).getByTestId('commitment-bar-5')).toBeTruthy();
      expect(within(pair('5')).getByTestId('commitment-5')).toBeTruthy();
      expect(classes(pair('5'))).toEqual(
        expect.arrayContaining(['min-h-[52px]', 'flex-row']),
      );
    });

    it('links hover across the bars and the rows', async () => {
      await open();
      const fill = (key: string) =>
        within(byId(`commitment-${key}`)).getByTestId('glass-fill').props
          .className;
      await fireEvent(byId('commitment-bar-7'), 'hoverIn');
      expect(fill('7')).toContain('bg-white/[.24]');
      expect(classes(byId('commitment-bar-7'))).toContain('bg-white/[.34]');
      await fireEvent(byId('commitment-bar-7'), 'hoverOut');
      expect(fill('7')).toContain('bg-white/10');

      await fireEvent(byId('commitment-5').parent!, 'hoverIn');
      expect(classes(byId('commitment-bar-5'))).toContain('bg-white/[.34]');
    });
  });

  describe('goals', () => {
    it('paces each goal against its pot', async () => {
      await open();
      has('plan-goals-summary', '3 of 3 on track');
      has('plan-impact', '3 of 3 goals on track');
      expect(byId('plan-goal-1-source')).toHaveTextContent('Savings · 75%');
      expect(byId('plan-goal-1-status')).toHaveTextContent(
        'On track · Nov 2026',
      );
      expect(byId('plan-goal-1-contribution')).toHaveTextContent(
        'S$1,500/mo · reached Nov 2026',
      );
      has('plan-goal-1-percent', '88%');
      expect(byId('plan-goal-3-source')).toHaveTextContent('Investments · 97%');
    });

    it('re-derives shares and statuses as a slider moves', async () => {
      await open();
      await type('savings', '1000');
      expect(byId('plan-goal-1-source')).toHaveTextContent('Savings · 100%');
      expect(byId('plan-goal-1-status')).toHaveTextContent('S$500/mo short');
      expect(classes(byId('plan-goal-1-status'))).toContain('text-danger');
      expect(byId('plan-goal-2-source')).toHaveTextContent('Savings · 45%');
      has('plan-impact', '2 of 3 goals on track');
    });

    it('asks before deleting a goal, and Cancel keeps it', async () => {
      await open();
      await fireEvent.press(byId('plan-goal-2-remove'));
      expect(screen.getByText('Delete “Japan trip”?')).toBeTruthy();
      has(
        'confirm-detail',
        'S$3,150 saved toward S$4,500. The S$450 a month it takes stays in your savings, free for your other goals. This can’t be undone.',
      );
      await fireEvent.press(screen.getByLabelText('Cancel'));
      expect(screen.queryByTestId('confirm-overlay')).toBeNull();
      expect(stub.chainsFor('goal')).not.toContainEqual([
        ['delete'],
        ['eq', 'id', 2],
      ]);
      expect(byId('plan-goal-2')).toBeTruthy();
    });

    it('deletes a goal once confirmed', async () => {
      await open();
      stub.respond('goal', { data: [], error: null });
      await fireEvent.press(byId('plan-goal-2-remove'));
      await fireEvent.press(byId('confirm-delete'));
      expect(stub.chainsFor('goal')).toContainEqual([
        ['delete'],
        ['eq', 'id', 2],
      ]);
      await waitFor(() =>
        expect(screen.queryByTestId('plan-goal-2')).toBeNull(),
      );
    });

    it('asks for a first goal when there are none, beside dashed stand-ins', async () => {
      respondPlanner(stub, { goalRows: [] });
      await open();
      has('plan-goals-summary', 'None yet');
      has('plan-goals-empty', 'Create your first goal');
      expect(screen.getAllByTestId('plan-goal-ghost')).toHaveLength(3);
      has('plan-impact', '0 of 0 goals on track');
      await fireEvent.press(byId('plan-goal-first'));
      expect(await screen.findByTestId('goal-name')).toBeTruthy();
    });

    describe('the New goal form', () => {
      async function openForm() {
        await open();
        await fireEvent.press(byId('plan-goal-new'));
        await screen.findByTestId('goal-name');
      }
      const add = () => screen.getAllByLabelText('Add goal').at(-1)!;

      it('waits for a name and a target', async () => {
        await openForm();
        has('sheet-note', 'Enter a target and date to see the timeline.');
        expect(add().props.accessibilityState.disabled).toBe(true);
        await fireEvent.changeText(byId('goal-name'), 'New car');
        expect(add().props.accessibilityState.disabled).toBe(true);
        await fireEvent.changeText(byId('goal-target'), '12000');
        expect(add().props.accessibilityState.disabled).toBe(false);
      });

      it('previews the contribution from the pot it picks, and adds the goal', async () => {
        await openForm();
        await fireEvent.changeText(byId('goal-name'), '  New car ');
        await fireEvent.changeText(byId('goal-target'), '12000');
        await fireEvent.changeText(byId('goal-saved'), '6000');
        await fireEvent.press(screen.getByLabelText('Target date'));
        await fireEvent.press(await screen.findByLabelText('Next month'));
        await fireEvent.press(await screen.findByText('24'));
        // S$6,000 in the 1 month to 24 Oct: all S$2,000 of savings, reaching it in December.
        has('sheet-note', 'S$2,000/mo · 100% of savings · reached Dec 2026');
        // …so fund it from investments, for its 12 months to 24 Sep 2027.
        await fireEvent.press(screen.getByText(/^Investments · S\$2,000\/mo/));
        await fireEvent.press(screen.getByLabelText('Target date'));
        for (let i = 0; i < 11; i++) {
          await fireEvent.press(await screen.findByLabelText('Next month'));
        }
        await fireEvent.press(await screen.findByText('24'));
        has('sheet-note', 'S$500/mo · 25% of investments · reached Sep 2027');

        // The insert, then the list it refreshes.
        stub.respond(
          'goal',
          { data: { id: 9 }, error: null },
          { data: goals, error: null },
        );
        await fireEvent.press(add());
        await waitFor(() =>
          expect(screen.queryByTestId('goal-name')).toBeNull(),
        );
        expect(stub.chainsFor('goal')).toContainEqual([
          [
            'insert',
            {
              name: 'New car',
              target_amount_cents: 1_200_000,
              current_amount_cents: 600_000,
              target_date: '2027-09-24',
              src: 'investment',
              sort_order: 4,
            },
          ],
          ['select'],
          ['single'],
        ]);
      });
    });
  });
});

describe('on iOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

  it('gives the goal form’s date its own row, so its calendar opens full width', async () => {
    await open();
    await fireEvent.press(byId('plan-goal-new'));
    expect(classes(byId('goal-when'))).toContain('ios:flex-col');
    await fireEvent.press(screen.getByLabelText('Target date'));
    expect(within(byId('goal-when')).getByTestId('calendar')).toBeTruthy();
  });

  it('stacks the summary, dial, sliders, goals, then the commitments', async () => {
    await open();
    const order = testIDsInOrder(byId('planner-column')).filter(id =>
      [
        'plan-left',
        'plan-dial',
        'plan-investments',
        'plan-save',
        'plan-goals',
        'commitments-card',
      ].includes(id),
    );
    expect(order).toEqual([
      'plan-left',
      'plan-dial',
      'plan-investments',
      'plan-save',
      'plan-goals',
      'commitments-card',
    ]);
    expect(screen.queryByTestId('planner-grid')).toBeNull();
  });

  it('sets an amount where the track is tapped', async () => {
    await open();
    await fireEvent(byId('plan-savings-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 36 } },
    });
    await act(() =>
      fireGestureHandler(getByGestureTestId('plan-savings-track-tap'), [
        { state: State.BEGAN, x: 70 },
        { state: State.ACTIVE, x: 70 },
        { state: State.END, x: 70 },
      ]),
    );
    // A fifth of S$5,000.
    await waitFor(() => expect(amount('savings').props.value).toBe('1,000'));
  });

  it('only drags sideways, leaving vertical swipes to the page', async () => {
    await open();
    const drag = getByGestureTestId('plan-savings-track-drag');
    expect(drag.config).toMatchObject({
      activeOffsetXStart: -4,
      activeOffsetXEnd: 4,
      failOffsetYStart: -8,
      failOffsetYEnd: 8,
    });
  });

  it('keeps every goal in the page’s own scroll', async () => {
    await open();
    expect(byId('plan-goals-list').props.scrollEnabled).toBe(false);
    expect(screen.getAllByTestId(/^plan-goal-\d+$/)).toHaveLength(goals.length);
  });
});
