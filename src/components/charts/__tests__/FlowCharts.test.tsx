import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { CashflowArea } from '@/components/charts/CashflowArea';
import { StrandsFlow } from '@/components/charts/StrandsFlow';
import {
  cashflowGeometry,
  columnAt,
  strandPaths,
} from '@/components/charts/flowLayout';
import { smoothPath } from '@/components/charts/geometry';

// Hover tracking is the macOS surface here; iOS's drag is ScrubSurface's own test.
jest.mock('@/components/ui/ScrubSurface', () =>
  jest.requireActual('@/components/ui/ScrubSurface.macos'),
);

const hidden = { includeHiddenElements: true };
const byId = (id: string) => screen.getByTestId(id, hidden);
const queryId = (id: string) => screen.queryByTestId(id, hidden);
const classes = (id: string) => String(byId(id).props.className);

// The Finance design's month: income S$7,862, expenses S$4,660.
const RATE = (7862 - 4660) / 7862;

describe('strandPaths', () => {
  it('sends round(rate × 22) strands to Saved and the rest to Spent', () => {
    const count = (rate: number) =>
      strandPaths(rate).filter(p => p.saved).length;
    expect(strandPaths(RATE)).toHaveLength(22);
    expect(count(RATE)).toBe(9);
    expect(count(0)).toBe(0);
    expect(count(0.5)).toBe(11);
    expect(count(1)).toBe(22);
    // Out of range rates hold at the ends.
    expect(count(-0.2)).toBe(0);
    expect(count(1.4)).toBe(22);
  });

  it('draws the design’s curve from the origin to each destination', () => {
    const [first] = strandPaths(RATE);
    // Strand 0: oy = 50 − 11 × .9, ey = 18 − 4.5 × .8.
    expect(first!.d).toBe('M0,50 C35,40.1 45,40.1 55,27.25 S80,14.4 100,18');
    const last = strandPaths(RATE)[21]!;
    expect(last.saved).toBe(false);
    expect(last.d.endsWith(' 100,82')).toBe(true);
  });
});

describe('StrandsFlow', () => {
  it('draws the saved strands brighter than the spent', async () => {
    await render(<StrandsFlow rate={RATE} />);
    const opacity = (i: number) =>
      byId(`strands-strand-${i}`).props.strokeOpacity;
    expect(opacity(0)).toBe(0.75);
    expect(opacity(8)).toBe(0.75);
    expect(opacity(9)).toBe(0.38);
    expect(opacity(21)).toBe(0.38);
    expect(queryId('strands-strand-22')).toBeNull();
    expect(byId('strands-strand-0').props.strokeWidth).toBe(0.8);
  });

  it('tracks the rate as it changes', async () => {
    const view = await render(<StrandsFlow rate={RATE} />);
    await view.rerender(<StrandsFlow rate={0.25} />);
    const saved = Array.from({ length: 22 }, (_, i) =>
      byId(`strands-strand-${i}`),
    ).filter(s => s.props.strokeOpacity === 0.75);
    expect(saved).toHaveLength(6);
  });

  it('marks the origin, Saved in lime and Spent outlined, with labels', async () => {
    await render(<StrandsFlow rate={RATE} />);
    expect(classes('strands-origin')).toContain('top-1/2');
    expect(classes('strands-saved')).toContain('top-[18%]');
    expect(classes('strands-saved')).toContain('bg-lime/35');
    expect(classes('strands-spent')).toContain('top-[82%]');
    expect(classes('strands-spent')).toContain('border-white');
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Spent')).toBeTruthy();
  });

  it('leaves a 70-point gutter for the labels, 54 on mobile', async () => {
    const view = await render(<StrandsFlow rate={RATE} />);
    expect(classes('strands')).toContain('pr-[70px]');
    await view.rerender(<StrandsFlow rate={RATE} compact />);
    expect(classes('strands')).toContain('pr-[54px]');
  });
});

// The Finance design's last twelve months, capped at S$14,500.
const INCOME = [
  6800, 6800, 13600, 6800, 6800, 8900, 6800, 6800, 6800, 6800, 7120, 7862,
];
const EXPENSE = [
  4100, 4520, 5900, 3980, 4750, 4200, 4380, 4050, 5200, 4300, 4460, 4660,
];
const LABELS = [
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
];
const MAX = 14500;

describe('cashflowGeometry', () => {
  const geo = cashflowGeometry(INCOME, EXPENSE, MAX);

  it('centres each month in its column and scales to the cap', () => {
    expect(geo.lefts[0]).toBeCloseTo(0.5 / 12);
    expect(geo.lefts[11]).toBeCloseTo(11.5 / 12);
    expect(geo.incomeTops[2]).toBeCloseTo(1 - 13600 / 14500);
    expect(geo.expenseTops[11]).toBeCloseTo(1 - 4660 / 14500);
    expect(cashflowGeometry([20000], [0], MAX).incomeTops[0]).toBe(0);
  });

  it('smooths both lines and closes the band between them', () => {
    const pts = (v: number[]) =>
      v.map((x, i): [number, number] => [
        ((i + 0.5) / 12) * 1000,
        200 - (x / MAX) * 200,
      ]);
    expect(geo.income).toBe(smoothPath(pts(INCOME)));
    expect(geo.expense).toBe(smoothPath(pts(EXPENSE)));
    // Along income, across to the last expense, back along expenses.
    expect(geo.band.startsWith(geo.income)).toBe(true);
    const back = smoothPath(pts(EXPENSE).reverse()).replace(/^M[^ ]+/, '');
    expect(geo.band.endsWith(`${back} Z`)).toBe(true);
    const [lx, ly] = pts(EXPENSE)[11]!;
    expect(geo.band).toContain(` L${lx},${ly} C`);
  });

  it('drops a line from the bottom to each month’s income', () => {
    expect(geo.drops).toHaveLength(12);
    expect(geo.drops[2]![1]).toBeCloseTo(200 - (13600 / MAX) * 200);
  });
});

describe('columnAt', () => {
  it('finds the column under the pointer, clamped', () => {
    expect(columnAt(0, 480, 12)).toBe(0);
    expect(columnAt(39, 480, 12)).toBe(0);
    expect(columnAt(40, 480, 12)).toBe(1);
    expect(columnAt(479, 480, 12)).toBe(11);
    expect(columnAt(900, 480, 12)).toBe(11);
    expect(columnAt(-5, 480, 12)).toBe(0);
  });
});

describe('CashflowArea', () => {
  type Props = Partial<Parameters<typeof CashflowArea>[0]>;
  const draw = (props: Props = {}) =>
    render(
      <CashflowArea
        income={INCOME}
        expense={EXPENSE}
        labels={LABELS}
        max={MAX}
        {...props}
      />,
    );
  // Twelve 40-point columns across 480.
  const at = (x: number) => ({
    nativeEvent: { x, y: 60, width: 480, height: 130 },
  });
  const move = (x: number) =>
    fireEvent(byId('cashflow-scrub'), 'hoverMove', at(x));
  const leave = () => fireEvent(byId('cashflow-scrub'), 'hoverEnd');
  const dotAt = (id: string) => byId(id).props.style;
  const geo = cashflowGeometry(INCOME, EXPENSE, MAX);
  const marker = (i: number) => ({
    income: {
      left: `${geo.lefts[i]! * 100}%`,
      top: `${geo.incomeTops[i]! * 100}%`,
    },
    expense: {
      left: `${geo.lefts[i]! * 100}%`,
      top: `${geo.expenseTops[i]! * 100}%`,
    },
  });

  it('draws a solid income line over a dashed expense line and a faint band', async () => {
    await draw();
    expect(byId('cashflow-income').props.strokeWidth).toBe(1.4);
    expect(byId('cashflow-expense').props.strokeDasharray).toEqual(['3', '3']);
    expect(byId('cashflow-expense').props.strokeOpacity).toBe(0.8);
    expect(byId('cashflow-band').props.d).toBe(geo.band);
    expect(byId('cashflow-band').props.fillOpacity).toBe(0.12);
    // react-native-svg's code for non-scaling-stroke.
    expect(byId('cashflow-income').props.vectorEffect).toBe(1);
  });

  it('marks the latest month until a column is hovered', async () => {
    await draw();
    expect(dotAt('cashflow-income-dot')).toEqual(marker(11).income);
    expect(dotAt('cashflow-expense-dot')).toEqual(marker(11).expense);
    expect(classes('cashflow-income-dot')).toContain('bg-lime');
    expect(classes('cashflow-expense-dot')).toContain('border-white');
    // Every drop line faint: the latest month is selected, not hovered.
    geo.drops.forEach((_, i) =>
      expect(byId(`cashflow-drop-${i}`).props.strokeOpacity).toBe(0.22),
    );
  });

  it('moves both markers to the hovered column and brightens its drop', async () => {
    await draw();
    await move(3 * 40 + 20);
    expect(dotAt('cashflow-income-dot')).toEqual(marker(3).income);
    expect(dotAt('cashflow-expense-dot')).toEqual(marker(3).expense);
    expect(byId('cashflow-drop-3').props.strokeOpacity).toBe(0.7);
    expect(byId('cashflow-drop-11').props.strokeOpacity).toBe(0.22);
    expect(classes('cashflow-label-3')).not.toContain('opacity-75');
    expect(classes('cashflow-label-11')).toContain('opacity-75');
    await leave();
    expect(dotAt('cashflow-income-dot')).toEqual(marker(11).income);
  });

  it('tells the screen each hovered month once, and null on leaving', async () => {
    const onHover = jest.fn();
    await draw({ onHover });
    await move(90);
    await move(100);
    expect(onHover).toHaveBeenCalledTimes(1);
    expect(onHover).toHaveBeenLastCalledWith(2);
    await leave();
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it('starts a new range on its latest month', async () => {
    const view = await draw();
    await move(20);
    await view.rerender(
      <CashflowArea
        income={INCOME.slice(6)}
        expense={EXPENSE.slice(6)}
        labels={LABELS.slice(6)}
        max={MAX}
      />,
    );
    const six = cashflowGeometry(INCOME.slice(6), EXPENSE.slice(6), MAX);
    expect(dotAt('cashflow-income-dot')).toEqual({
      left: `${six.lefts[5]! * 100}%`,
      top: `${six.incomeTops[5]! * 100}%`,
    });
    expect(queryId('cashflow-label-6')).toBeNull();
  });

  it('labels the months, the selected one at full strength', async () => {
    const view = await draw();
    expect(byId('cashflow-label-0').props.children).toBe('Oct');
    expect(classes('cashflow-label-11')).not.toContain('opacity-75');
    expect(classes('cashflow-label-0')).toContain('opacity-75');
    expect(classes('cashflow-label-0')).toContain('text-[10px]');
    await view.rerender(
      <CashflowArea
        income={INCOME}
        expense={EXPENSE}
        labels={LABELS}
        max={MAX}
        compact
      />,
    );
    expect(classes('cashflow-label-0')).toContain('text-[9px]');
  });

  it('shows a crosshair cursor over the plot on macOS', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'macos');
    await draw();
    expect(byId('cashflow-scrub').parent!.props.style).toEqual({
      cursor: 'crosshair',
    });
    os.restore();
  });
});
