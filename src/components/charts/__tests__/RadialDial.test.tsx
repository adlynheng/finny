import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { RadialDial } from '@/components/charts/RadialDial';
import { allocationDial, budgetDial } from '@/components/charts/dialConfigs';
import {
  designBudget,
  designGrossCents,
  designPlan,
} from '../../../../test/dialCases';

const hidden = { includeHiddenElements: true };
const byId = (id: string) => screen.getByTestId(id, hidden);
const queryId = (id: string) => screen.queryByTestId(id, hidden);
const allById = (id: RegExp) => screen.queryAllByTestId(id, hidden);
// An SVG text's string sits in its span.
const text = (id: string) =>
  byId(id)
    .children.map(c => (typeof c === 'string' ? c : String(c.props.content)))
    .join('');

const budget = (overrides = {}) =>
  budgetDial({ ...designBudget, ...overrides });
const plan = (categories = designPlan) =>
  allocationDial({ grossCents: designGrossCents, categories });

describe('RadialDial', () => {
  describe('as the budget dial', () => {
    it('draws a tick per elapsed day and a dot per day to come', async () => {
      await render(<RadialDial {...budget()} animate={false} />);
      const ticks = allById(/^dial-centres-/).reduce(
        (n, el) => n + (el.props.d as string).split('M').length - 1,
        0,
      );
      expect(ticks).toBe(24);
      expect(allById(/^dial-dot-future-/)).toHaveLength(6);
    });

    it('highlights today’s tick and pulses at its tip', async () => {
      await render(<RadialDial {...budget()} animate={false} />);
      expect(byId('dial-centres-today-0')).toBeTruthy();
      expect(byId('dial-head')).toBeTruthy();
      expect(byId('dial-pulse')).toBeTruthy();
    });

    it('reads the share of the limit used, with an even-pace marker', async () => {
      await render(<RadialDial {...budget()} animate={false} />);
      expect(text('dial-primary')).toBe('77%');
      expect(text('dial-secondary')).toBe('of limit used');
      expect(text('dial-pace-label')).toBe('even pace');
      expect(byId('dial-arc-cap')).toBeTruthy();
    });

    it('turns the arc danger-coloured past the limit', async () => {
      await render(<RadialDial {...budget()} animate={false} />);
      expect(byId('dial-arc').props.stroke).toEqual(
        byId('dial-arc-cap').props.fill,
      );
      const inkStroke = byId('dial-arc').props.stroke;
      await render(
        <RadialDial {...budget({ spentCents: 400_000 })} animate={false} />,
      );
      expect(byId('dial-arc').props.stroke).not.toEqual(inkStroke);
      expect(text('dial-primary')).toBe('114%');
    });
  });

  describe('as the allocation dial', () => {
    it('draws a labelled, beaded group per category and dots for the rest', async () => {
      await render(<RadialDial {...plan()} animate={false} />);
      for (const c of [...designPlan.map(p => p.key), 'unallocated']) {
        expect(byId(`dial-bead-${c}`)).toBeTruthy();
        expect(byId(`dial-name-${c}`)).toBeTruthy();
      }
      expect(text('dial-value-inv')).toBe('S$1,800');
      expect(allById(/^dial-dot-unallocated-/)).toHaveLength(3);
      expect(allById(/^dial-centres-unallocated/)).toHaveLength(0);
    });

    it('draws the labels on a layer that overhangs the dial, as iOS clips an SVG to its box', async () => {
      await render(<RadialDial {...plan()} animate={false} />);
      expect(byId('dial-labels').props.style).toEqual(
        expect.arrayContaining([
          { top: '-25%', left: '-25%', right: '-25%', bottom: '-25%' },
        ]),
      );
    });

    it('ends the arc in the pulsing head, with no cap dot or pace marker', async () => {
      await render(<RadialDial {...plan()} animate={false} />);
      expect(byId('dial-head')).toBeTruthy();
      expect(queryId('dial-arc-cap')).toBeNull();
      expect(queryId('dial-pace')).toBeNull();
      expect(text('dial-primary')).toBe('S$9,500');
      expect(text('dial-secondary')).toBe('gross income · 97% allocated');
    });

    it('turns the arc danger-coloured when the plan exceeds income', async () => {
      await render(<RadialDial {...plan()} animate={false} />);
      const inkStroke = byId('dial-arc').props.stroke;
      await render(
        <RadialDial
          {...plan(
            designPlan.map(c =>
              c.key === 'exp' ? { ...c, cents: 400_000 } : c,
            ),
          )}
          animate={false}
        />,
      );
      expect(byId('dial-arc').props.stroke).not.toEqual(inkStroke);
    });

    it('thickens the highlighted group’s centre strokes', async () => {
      await render(<RadialDial {...plan()} selected="sav" animate={false} />);
      expect(byId('dial-centres-sav-0').props.strokeWidth).toBe(1.2);
      expect(byId('dial-centres-inv-0').props.strokeWidth).toBe(0.9);
    });
  });

  describe('entrance', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const opacity = (id: string) =>
      (getAnimatedStyle(byId(id)) as { opacity: number }).opacity;

    it('grows the allocation ticks in 12 ms a tick', async () => {
      await render(<RadialDial {...plan()} />);
      // Expenditure's last layer starts at tick 90 (66 + 24): 1,080 ms.
      expect(opacity('dial-ticks-cpf-0')).toBe(0);
      await act(() => jest.advanceTimersByTime(920));
      expect(opacity('dial-ticks-cpf-0')).toBe(1);
      expect(opacity('dial-ticks-exp-6')).toBe(0);
      // 1,180 ms: under way.
      await act(() => jest.advanceTimersByTime(260));
      expect(opacity('dial-ticks-exp-6')).toBeGreaterThan(0);
      await act(() => jest.advanceTimersByTime(900));
      expect(opacity('dial-ticks-exp-6')).toBe(1);
    });

    it('grows the budget ticks in 25 ms a day, day 1 first', async () => {
      await render(<RadialDial {...budget()} />);
      // Today (day 24) starts at 24 × 25 = 600 ms and is done by 1.5 s.
      await act(() => jest.advanceTimersByTime(599));
      expect(opacity('dial-ticks-today-0')).toBe(0);
      await act(() => jest.advanceTimersByTime(901));
      expect(opacity('dial-ticks-today-0')).toBe(1);
    });

    it('holds the finished frame when not animating', async () => {
      await render(<RadialDial {...budget()} animate={false} />);
      expect(opacity('dial-ticks-past-0')).toBe(1);
    });
  });
});
