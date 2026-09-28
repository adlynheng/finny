import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { Rings, overallScore } from '@/components/charts/Rings';
import { arcPath, polar } from '@/components/charts/geometry';

const hidden = { includeHiddenElements: true };
const byId = (id: string) => screen.getByTestId(id, hidden);
const allById = (id: RegExp) => screen.queryAllByTestId(id, hidden);
// An SVG text's string sits in its span.
const text = (id: string) =>
  byId(id)
    .children.map(c => (typeof c === 'string' ? c : String(c.props.content)))
    .join('');

// The Trading design's mock: diversification, risk balance, goal pace.
const scores = [69, 77, 80];

describe('overallScore', () => {
  it('averages the metrics, rounded', () => {
    expect(overallScore(scores)).toBe(75);
    expect(overallScore([70, 71, 71])).toBe(71);
  });

  it('keeps each score within 0–100, and is 0 with no metrics', () => {
    expect(overallScore([120, 100, -30])).toBe(67);
    expect(overallScore([])).toBe(0);
  });
});

describe('Rings', () => {
  it('draws a track, an arc and a cap per metric at decreasing radii', async () => {
    await render(<Rings scores={scores} animate={false} />);
    expect(allById(/^rings-arc-/)).toHaveLength(3);
    expect(
      [0, 1, 2].map(i => byId(`rings-track-${i}`).props.r as number),
    ).toEqual([64, 51, 38]);
  });

  it('runs each arc clockwise from the top to its score', async () => {
    await render(<Rings scores={scores} animate={false} />);
    scores.forEach((s, i) => {
      const r = 64 - i * 13;
      const end = -90 + (s / 100) * 359.9;
      expect(byId(`rings-arc-${i}`).props.d).toBe(arcPath(r, -90, end));
      const [x, y] = polar(r, end);
      expect(byId(`rings-cap-${i}`).props.cx).toBeCloseTo(x);
      expect(byId(`rings-cap-${i}`).props.cy).toBeCloseTo(y);
    });
  });

  it('caps the outermost arc in lime and the rest in white', async () => {
    await render(<Rings scores={scores} animate={false} />);
    const fill = (i: number) => byId(`rings-cap-${i}`).props.fill;
    // react-native-svg turns colours into numbers; compare with a white stroke.
    const whiteStroke = byId('rings-arc-0').props.stroke;
    expect(fill(1)).toEqual(whiteStroke);
    expect(fill(2)).toEqual(whiteStroke);
    expect(fill(0)).not.toEqual(whiteStroke);
  });

  it('shows the average over “of 100”', async () => {
    await render(<Rings scores={scores} animate={false} />);
    expect(text('rings-score')).toBe('75');
    expect(text('rings-of')).toBe('of 100');
  });

  describe('the spin', () => {
    beforeEach(() => jest.useFakeTimers());

    it('turns the dashed outer ring once every 90 s', async () => {
      await render(<Rings scores={scores} />);
      const turn = () =>
        parseFloat(
          (
            getAnimatedStyle(byId('rings-spin-ring')) as {
              transform: { rotate: string }[];
            }
          ).transform[0]!.rotate,
        );
      expect(turn()).toBe(0);
      await act(() => jest.advanceTimersByTime(22_500));
      expect(turn()).toBeCloseTo(90, 0);
      await act(() => jest.advanceTimersByTime(22_500));
      expect(turn()).toBeCloseTo(180, 0);
    });

    it('holds the ring still at rest', async () => {
      await render(<Rings scores={scores} animate={false} />);
      await act(() => jest.advanceTimersByTime(22_500));
      expect(
        (
          getAnimatedStyle(byId('rings-spin-ring')) as {
            transform: { rotate: string }[];
          }
        ).transform[0]!.rotate,
      ).toBe('0deg');
    });
  });
});
