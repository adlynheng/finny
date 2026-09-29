import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { MultiStrandLine } from '@/components/charts/MultiStrandLine';
import { historyGeometry } from '@/components/charts/historyLayout';
import { designHistory } from '../../../../test/historyCases';

// Hover tracking is the macOS surface here; iOS's drag has its own test file.
jest.mock('@/components/ui/ScrubSurface', () =>
  jest.requireActual('@/components/ui/ScrubSurface.macos'),
);

const hidden = { includeHiddenElements: true };
const byId = (id: string) => screen.getByTestId(id, hidden);
const queryId = (id: string) => screen.queryByTestId(id, hidden);
const classes = (id: string) => String(byId(id).props.className);

type Props = Partial<Parameters<typeof MultiStrandLine>[0]>;
const draw = (props: Props = {}) =>
  render(<MultiStrandLine points={designHistory} animate={false} {...props} />);

// The plot is 460 × 180 points: a month every 20.
const WIDTH = 460;
const at = (x: number) => ({
  nativeEvent: { x, y: 90, width: WIDTH, height: 180 },
});
const hoverAt = (x: number) =>
  fireEvent(byId('history-scrub'), 'hoverMove', at(x));

const geo = historyGeometry(designHistory);

describe('MultiStrandLine', () => {
  describe('strands', () => {
    it('draws sixteen nested strands, the net line last and heaviest', async () => {
      await draw();
      const strands = Array.from({ length: 16 }, (_, i) =>
        byId(`history-strand-${i}`),
      );
      expect(strands.map(s => s.props.d)).toEqual(geo.strands.map(s => s.d));
      expect(strands[15]!.props.strokeWidth).toBe(1.6);
      expect(strands[15]!.props.strokeOpacity).toBe(1);
      expect(queryId('history-strand-16')).toBeNull();
    });

    it('stretches the viewBox without thickening the strokes', async () => {
      await draw();
      const strand = byId('history-strand-0');
      // react-native-svg's code for non-scaling-stroke.
      expect(strand.props.vectorEffect).toBe(1);
    });

    it('labels each band at its last value, beside the chart', async () => {
      await draw();
      for (const l of geo.labels) {
        const label = byId(`history-label-${l.text}`);
        expect(label.props.children).toBe(l.text);
        expect(label.props.style).toEqual({
          top: `${l.top * 100}%`,
          opacity: l.opacity,
        });
        expect(label.props.className).toContain('left-full');
      }
      expect(byId('history-end').props.style).toEqual({
        top: `${geo.endTop * 100}%`,
      });
    });

    it('leaves a 50-point gutter for the labels, 56 on mobile', async () => {
      await draw();
      expect(classes('history')).toContain('pr-[50px]');
      await draw({ compact: true });
      expect(classes('history')).toContain('pr-[56px]');
    });
  });

  describe('crosshair', () => {
    it('has none until the pointer is over the chart', async () => {
      await draw();
      expect(queryId('history-crosshair')).toBeNull();
      expect(queryId('history-tip')).toBeNull();
    });

    it('snaps to the nearest month', async () => {
      await draw();
      await hoverAt(29);
      expect(byId('history-crosshair').props.x1).toBeCloseTo(1000 / 23);
      await hoverAt(31);
      expect(byId('history-crosshair').props.x1).toBeCloseTo(2000 / 23);
      await hoverAt(WIDTH + 30);
      expect(byId('history-crosshair').props.x1).toBeCloseTo(1000);
    });

    it('puts a white dot on the net line there', async () => {
      await draw();
      await hoverAt(100);
      expect(byId('history-dot').props.style).toEqual({
        left: `${(5 / 23) * 100}%`,
        top: `${geo.netTops[5]! * 100}%`,
      });
    });

    it('shows the month, the net figure and the class mix', async () => {
      await draw();
      await hoverAt(0);
      expect(screen.getByText('Oct 2024')).toBeTruthy();
      expect(screen.getByText('S$168,200')).toBeTruthy();
      expect(
        screen.getByText('Cash S$31.0k · Inv S$44.5k · CPF S$49.8k'),
      ).toBeTruthy();
    });

    it('flips the tooltip to the crosshair’s left past 60% of the width', async () => {
      await draw();
      await hoverAt(13 * 20);
      expect(classes('history-tip-box')).toContain('left-[12px]');
      await hoverAt(14 * 20);
      expect(classes('history-tip-box')).toContain('right-[12px]');
    });

    it('clears when the pointer leaves', async () => {
      await draw();
      await hoverAt(100);
      await fireEvent(byId('history-scrub'), 'hoverEnd');
      expect(queryId('history-crosshair')).toBeNull();
      expect(queryId('history-tip')).toBeNull();
    });

    it('clears when the range changes', async () => {
      const { rerender } = await draw();
      await hoverAt(100);
      await rerender(
        <MultiStrandLine points={designHistory.slice(-12)} animate={false} />,
      );
      expect(queryId('history-crosshair')).toBeNull();
    });

    it('puts the mobile tooltip above the chart, without the mix', async () => {
      await draw({ compact: true });
      await hoverAt(14 * 20);
      expect(classes('history-tip-box')).toContain('bottom-full');
      expect(classes('history-tip-box')).toContain('right-[12px]');
      expect(screen.queryByText(/^Cash S\$/)).toBeNull();
      expect(byId('history-tip-net').props.className).toContain('text-[16px]');
    });
  });

  describe('reveal', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const offset = (id: string) =>
      (
        getAnimatedStyle(byId(id)) as {
          transform: { translateX: number }[];
        }
      ).transform[0]!.translateX + 0; // −0 is 0
    // Measuring the chart; the new width reaches the styles on the next frame.
    const layout = async () => {
      await fireEvent(byId('history-reveal').parent!, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: 180 } },
      });
      await act(() => jest.advanceTimersByTime(1));
    };

    it('wipes the strands in from the left over 1.4 s', async () => {
      await draw({ animate: true });
      await layout();
      // The clip starts a full width to the left, its content held in place.
      expect(offset('history-reveal')).toBeLessThan(-0.99 * WIDTH);
      expect(offset('history-reveal-content')).toBeGreaterThan(0.99 * WIDTH);
      await act(() => jest.advanceTimersByTime(700));
      const halfway = offset('history-reveal');
      expect(halfway).toBeGreaterThan(-WIDTH);
      expect(halfway).toBeLessThan(0);
      expect(offset('history-reveal-content')).toBeCloseTo(-halfway);
      await act(() => jest.advanceTimersByTime(700));
      expect(offset('history-reveal')).toBe(0);
    });

    it('plays once: hovering afterwards does not replay it', async () => {
      await draw({ animate: true });
      await layout();
      await act(() => jest.advanceTimersByTime(1400));
      await hoverAt(100);
      await act(() => jest.advanceTimersByTime(16));
      expect(offset('history-reveal')).toBe(0);
    });

    it('waits for the chart’s size before starting', async () => {
      await draw({ animate: true });
      await act(() => jest.advanceTimersByTime(1400));
      await layout();
      expect(offset('history-reveal')).toBeLessThan(-0.99 * WIDTH);
    });

    it('replays for a new range', async () => {
      const { rerender } = await draw({ animate: true });
      await layout();
      await act(() => jest.advanceTimersByTime(1400));
      await rerender(<MultiStrandLine points={designHistory.slice(-12)} />);
      expect(offset('history-reveal')).toBe(-WIDTH);
    });

    it('starts revealed when not animating', async () => {
      await draw();
      await layout();
      expect(offset('history-reveal')).toBe(0);
    });
  });
});
