import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, processColor } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { EchoLine } from '@/components/charts/EchoLine';
import { Sparkline } from '@/components/charts/Sparkline';
import {
  echoPaths,
  sampleIndices,
  sparkPath,
  stepPath,
} from '@/components/charts/lineLayout';
import { tokens } from '@/theme/tokens';

// Hover tracking is the macOS surface here; iOS's drag is ScrubSurface's own test.
jest.mock('@/components/ui/ScrubSurface', () =>
  jest.requireActual('@/components/ui/ScrubSurface.macos'),
);

const hidden = { includeHiddenElements: true };
const byId = (id: string) => screen.getByTestId(id, hidden);
const queryId = (id: string) => screen.queryByTestId(id, hidden);
const classes = (id: string) => String(byId(id).props.className);
const { ink, danger, limeDark } = tokens.colors;
// react-native-svg hands the native view a processed colour.
const stroke = (id: string) =>
  (byId(id).props.stroke as { payload: unknown }).payload;

// 29 days of P&L that dips below zero and recovers, and a run that stays up.
const crossing = Array.from({ length: 29 }, (_, i) =>
  Math.round(1200 * Math.sin(i / 4) - 300),
);
const above = crossing.map(v => v + 2000);

// The design's scale: the range fills y 6 to 80 of the 100-unit box.
const scale = (values: readonly number[]) => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * 74;
};
const yCrossing = scale(crossing);

type Props = Partial<Parameters<typeof EchoLine>[0]>;
const draw = (props: Props = {}) =>
  render(
    <EchoLine
      values={crossing}
      y={yCrossing}
      hover={null}
      onHover={() => {}}
      animate={false}
      {...props}
    />,
  );

describe('echoPaths', () => {
  it('draws the line across the box at the screen’s y', () => {
    const { line } = echoPaths([0, 50, 100], v => v);
    expect(line).toBe('M0.00,0.00L50.00,50.00L100.00,100.00');
  });

  it('stacks six echoes 2.3 units apart, fading with depth, deepest first', () => {
    const { echoes } = echoPaths([10, 20], v => v);
    expect(echoes.map(e => e.d)).toEqual(
      [6, 5, 4, 3, 2, 1].map(
        k =>
          `M0.00,${(10 + k * 2.3).toFixed(2)}L100.00,${(20 + k * 2.3).toFixed(
            2,
          )}`,
      ),
    );
    const opacities = echoes.map(e => e.opacity);
    [0.05, 0.075, 0.1, 0.125, 0.15, 0.175].forEach((o, k) =>
      expect(opacities[k]).toBeCloseTo(o),
    );
  });

  it('draws the zero line only when the series crosses zero', () => {
    expect(echoPaths(crossing, yCrossing).zeroY).toBeCloseTo(yCrossing(0));
    expect(echoPaths(above, scale(above)).zeroY).toBeNull();
    expect(echoPaths([0, 5, 10], v => v).zeroY).toBeNull();
  });
});

describe('sampleIndices', () => {
  it('spaces eight samples evenly, first and last included', () => {
    expect(sampleIndices(29)).toEqual([0, 4, 8, 12, 16, 20, 24, 28]);
    expect(sampleIndices(181)).toEqual([0, 26, 51, 77, 103, 129, 154, 180]);
  });
});

describe('EchoLine', () => {
  it('draws the line over its echoes at graded opacity', async () => {
    await draw();
    const line = byId('echo-line');
    expect(line.props.strokeOpacity).toBe(0.9);
    expect(line.props.strokeWidth).toBe(1.5);
    // react-native-svg's code for non-scaling-stroke.
    expect(line.props.vectorEffect).toBe(1);
    const echoes = Array.from({ length: 6 }, (_, k) => byId(`echo-echo-${k}`));
    echoes.forEach(e => expect(e.props.strokeWidth).toBe(0.7));
    const opacities = echoes.map(e => e.props.strokeOpacity as number);
    expect(opacities).toEqual([...opacities].sort((a, b) => a - b));
    expect(opacities[5]).toBeCloseTo(0.175);
    expect(queryId('echo-echo-6')).toBeNull();
  });

  it('dashes the zero line when the series crosses zero, and only then', async () => {
    const view = await draw();
    const zero = byId('echo-zero');
    expect(zero.props.y1).toBeCloseTo(yCrossing(0));
    expect(zero.props.strokeDasharray).toEqual(['2', '4']);
    expect(zero.props.strokeOpacity).toBe(0.3);
    await view.rerender(
      <EchoLine
        values={above}
        y={scale(above)}
        hover={null}
        onHover={() => {}}
        animate={false}
      />,
    );
    expect(queryId('echo-zero')).toBeNull();
  });

  it('draws the capital invested as a lime step line, and only when given', async () => {
    const view = await draw();
    expect(queryId('echo-capital')).toBeNull();
    const capital = {
      values: [100, 100, 100, 250, 250, 250, 400, 400],
      y: (v: number) => 60 - v / 10,
    };
    await view.rerender(
      <EchoLine
        values={crossing.slice(0, 8)}
        y={yCrossing}
        hover={null}
        onHover={() => {}}
        capital={capital}
        animate={false}
      />,
    );
    const line = byId('echo-capital');
    expect(line.props.d).toBe(stepPath(capital.values, capital.y));
    expect(stroke('echo-capital')).toBe(processColor(limeDark));
    expect(line.props.strokeWidth).toBe(1.2);
  });

  it('places the eight sample dots on the line', async () => {
    await draw();
    sampleIndices(29).forEach(i => {
      const dot = byId(`echo-sample-${i}`);
      expect(dot.props.style).toEqual({
        left: `${(i / 28) * 100}%`,
        top: `${yCrossing(crossing[i]!)}%`,
      });
      expect(dot.props.className).toContain('size-[7px]');
      expect(dot.props.className).toContain('bg-canvas');
    });
  });

  it('shows no crosshair or halo until hovered', async () => {
    await draw();
    expect(queryId('echo-crosshair')).toBeNull();
    expect(queryId('echo-halo')).toBeNull();
  });

  it('moves the crosshair and halo to the hovered day, filling its sample', async () => {
    await draw({ hover: 8 });
    expect(classes('echo-sample-8')).toContain('size-[9px]');
    expect(classes('echo-sample-8')).toContain('bg-lime');
    expect(classes('echo-sample-4')).toContain('bg-canvas');
    const at = {
      left: `${(8 / 28) * 100}%`,
      top: `${yCrossing(crossing[8]!)}%`,
    };
    expect(byId('echo-halo').props.style).toEqual(at);
    expect(byId('echo-crosshair').props.style).toEqual({ left: at.left });
  });

  it('halos a day between samples without filling a sample', async () => {
    await draw({ hover: 10 });
    expect(byId('echo-halo').props.style.left).toBe(`${(10 / 28) * 100}%`);
    sampleIndices(29).forEach(i =>
      expect(classes(`echo-sample-${i}`)).toContain('bg-canvas'),
    );
  });

  it('ignores a hover past the end of a shorter series', async () => {
    await draw({ hover: 40 });
    expect(queryId('echo-halo')).toBeNull();
  });

  describe('pointer', () => {
    const at = (x: number) => ({
      nativeEvent: { x, y: 50, width: 280, height: 200 },
    });
    // 28 gaps across 280 points: a day every 10.
    const move = (x: number) =>
      fireEvent(byId('echo-scrub'), 'hoverMove', at(x));
    const leave = () => fireEvent(byId('echo-scrub'), 'hoverEnd');

    it('reports the nearest day under the pointer, and null when it leaves', async () => {
      const onHover = jest.fn();
      await draw({ onHover });
      await move(84);
      expect(onHover).toHaveBeenLastCalledWith(8);
      await move(500);
      expect(onHover).toHaveBeenLastCalledWith(28);
      await leave();
      expect(onHover).toHaveBeenLastCalledWith(null);
    });

    it('reports each day once, however much the pointer moves within it', async () => {
      const onHover = jest.fn();
      await draw({ onHover });
      await move(81);
      await move(83);
      await move(84);
      expect(onHover).toHaveBeenCalledTimes(1);
    });

    it('moves the crosshair itself, without waiting for the screen', async () => {
      // The screen never passes the day back.
      await draw();
      await move(84);
      expect(byId('echo-halo').props.style.left).toBe(`${(8 / 28) * 100}%`);
      expect(classes('echo-sample-8')).toContain('bg-lime');
      await leave();
      expect(queryId('echo-halo')).toBeNull();
    });

    it('wins over the screen’s day while on the chart, and hands it back on leaving', async () => {
      await draw({ hover: 20 });
      await move(84);
      expect(byId('echo-halo').props.style.left).toBe(`${(8 / 28) * 100}%`);
      await leave();
      expect(byId('echo-halo').props.style.left).toBe(`${(20 / 28) * 100}%`);
    });

    it('forgets the pointer day for a new series', async () => {
      const view = await draw({ revealKey: '6M' });
      await move(84);
      await view.rerender(
        <EchoLine
          values={crossing}
          y={yCrossing}
          onHover={() => {}}
          revealKey="1Y"
          animate={false}
        />,
      );
      expect(queryId('echo-halo')).toBeNull();
    });
  });

  it('shows a crosshair cursor over the chart on macOS', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'macos');
    await draw();
    expect(byId('echo').props.style).toEqual({ cursor: 'crosshair' });
    os.restore();
  });

  it('leaves the cursor alone on iOS', async () => {
    await draw();
    expect(byId('echo').props.style).toBeUndefined();
  });

  describe('reveal', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const clipX = () =>
      (
        getAnimatedStyle(byId('echo-reveal')) as {
          transform: { translateX: number }[];
        }
      ).transform[0]!.translateX;

    it('opens left to right over 1.1 s once measured', async () => {
      await draw({ animate: true });
      await fireEvent(byId('echo'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 200 } },
      });
      // The new width reaches the styles on the next frame.
      await act(() => jest.advanceTimersByTime(1));
      expect(clipX()).toBeLessThan(-0.99 * 280);
      await act(() => jest.advanceTimersByTime(1100));
      expect(clipX() + 0).toBe(0); // −0 is 0
    });
  });
});

describe('stepPath', () => {
  it('runs flat to each next day, then up or down to its value', () => {
    expect(stepPath([10, 10, 30], v => v)).toBe(
      'M0.00,10.00H50.00V10.00H100.00V30.00',
    );
  });
});

describe('sparkPath', () => {
  it('fits the series to y 2–20 across the 48-unit box', () => {
    expect(sparkPath([5, 10, 0])).toBe('M0.0,11.0L24.0,2.0L48.0,20.0');
  });

  it('draws a flat series along the bottom', () => {
    expect(sparkPath([3, 3, 3])).toBe('M0.0,20.0L24.0,20.0L48.0,20.0');
  });
});

describe('Sparkline', () => {
  const prices = [101, 103, 102, 106, 104, 108];

  it('strokes ink on an up day and danger on a down day', async () => {
    const view = await render(<Sparkline values={prices} dayChange={1.2} />);
    expect(stroke('spark-line')).toBe(processColor(ink));
    expect(byId('spark-line').props.d).toBe(sparkPath(prices));
    await view.rerender(<Sparkline values={prices} dayChange={-0.4} />);
    expect(stroke('spark-line')).toBe(processColor(danger));
    await view.rerender(<Sparkline values={prices} dayChange={0} />);
    expect(stroke('spark-line')).toBe(processColor(ink));
  });

  it('is 96 points wide on desktop and 64 on mobile', async () => {
    const view = await render(<Sparkline values={prices} dayChange={1} />);
    expect(classes('spark')).toContain('w-24');
    await view.rerender(<Sparkline values={prices} dayChange={1} compact />);
    expect(classes('spark')).toContain('w-16');
  });
});
