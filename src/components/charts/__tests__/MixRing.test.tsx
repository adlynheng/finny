import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { MixRing } from '@/components/charts/MixRing';
import {
  mixCentre,
  mixGroups,
  type MixPart,
} from '@/components/charts/mixLayout';
import { polar } from '@/components/charts/geometry';
import { tokens } from '@/theme/tokens';

const tick = tokens.sphere.tick;
const hidden = { includeHiddenElements: true };
const byId = (id: string) => screen.getByTestId(id, hidden);
const allById = (id: RegExp) => screen.queryAllByTestId(id, hidden);
// An SVG text's string sits in its span.
const text = (id: string) =>
  byId(id)
    .children.map(c => (typeof c === 'string' ? c : String(c.props.content)))
    .join('');
const opacity = (id: string) => byId(id).props.strokeOpacity as number;

// The Trading design's holdings by instrument type, in S$ cents (total
// S$94,840.33).
const parts: MixPart[] = [
  { key: 'Stock', label: 'Stock', cents: 4_428_157 },
  { key: 'ETF', label: 'ETF', cents: 4_419_876 },
  { key: 'REIT', label: 'REIT', cents: 636_000 },
];
const RATE = 1.3512;

type Props = Partial<Parameters<typeof MixRing>[0]>;
const draw = (props: Props = {}) =>
  render(
    <MixRing parts={parts} usdSgdRate={RATE} animate={false} {...props} />,
  );

describe('mixGroups', () => {
  it('shares 72 ticks by value, at least one each', () => {
    expect(mixGroups(parts).map(g => g.ticks.length)).toEqual([34, 34, 5]);
    const tiny = [...parts, { key: 'Bond', label: 'Bond', cents: 1 }];
    expect(mixGroups(tiny).map(g => g.ticks.length)).toEqual([34, 34, 5, 1]);
  });

  it('runs clockwise from the top with a 6° gap after each type', () => {
    const [stock, etf, reit] = mixGroups(parts);
    expect(stock!.start).toBeCloseTo(-87);
    expect(etf!.start).toBeCloseTo(stock!.end + 6);
    expect(reit!.start).toBeCloseTo(etf!.end + 6);
    expect(reit!.end).toBeCloseTo(267);
  });

  it('sizes ticks by type, wobbling between .84 and 1 of it', () => {
    const lengths = (k: number) =>
      mixGroups(parts)[k]!.ticks.map(t => t.length);
    [38, 28, 18].forEach((base, k) =>
      lengths(k).forEach(l => {
        expect(l).toBeGreaterThanOrEqual(base * 0.68 - 1e-9);
        expect(l).toBeLessThanOrEqual(base);
      }),
    );
    expect(mixGroups(parts)[0]!.ticks[0]!.length).toBeCloseTo(38 * 0.84);
    const other = mixGroups([{ key: 'Bond', label: 'Bond', cents: 100 }]);
    expect(other[0]!.ticks[0]!.length).toBeCloseTo(22 * 0.84);
  });

  it('beads each type half a gap before its start, on the outer ring', () => {
    mixGroups(parts).forEach(g => {
      const [x, y] = polar(116, g.start - 3);
      expect(g.bead[0]).toBeCloseTo(x);
      expect(g.bead[1]).toBeCloseTo(y);
    });
  });

  it('leaves out types with no value', () => {
    const some = [...parts.slice(0, 2), { ...parts[2]!, cents: 0 }];
    expect(mixGroups(some).map(g => g.key)).toEqual(['Stock', 'ETF']);
  });
});

describe('mixCentre', () => {
  it('reads the total in S$ over US$', () => {
    expect(mixCentre(parts, null, RATE)).toEqual({
      primary: 'S$94.8k',
      secondary: 'US$70.2k',
    });
  });

  it('reads a highlighted type’s share over its name', () => {
    expect(mixCentre(parts, 'Stock', RATE)).toEqual({
      primary: '47%',
      secondary: 'Stock',
    });
    expect(mixCentre(parts, 'REIT', RATE).primary).toBe('7%');
  });

  it('waits for the rate before showing US$, and ignores an unknown type', () => {
    expect(mixCentre(parts, null, null).secondary).toBeNull();
    expect(mixCentre(parts, 'Bond', RATE).primary).toBe('S$94.8k');
  });
});

describe('MixRing', () => {
  it('draws each type’s ticks four to a layer, with a bead apiece', async () => {
    await draw();
    expect(allById(/^mix-ticks-Stock-/)).toHaveLength(9);
    expect(allById(/^mix-ticks-ETF-/)).toHaveLength(9);
    expect(allById(/^mix-ticks-REIT-/)).toHaveLength(2);
    expect(allById(/^mix-bead-/)).toHaveLength(3);
    expect(byId('mix-outer').props.r).toBe(116);
    expect(byId('mix-inner').props.r).toBe(50);
  });

  it('puts the lime head at the top of the outer ring', async () => {
    await draw();
    expect(byId('mix-head').props.cx).toBe(0);
    expect(byId('mix-head').props.cy).toBe(-116);
  });

  it('swaps the centre to the highlighted type', async () => {
    const view = await draw();
    expect(text('mix-primary')).toBe('S$94.8k');
    expect(text('mix-secondary')).toBe('US$70.2k');
    await view.rerender(
      <MixRing
        parts={parts}
        usdSgdRate={RATE}
        selected="ETF"
        animate={false}
      />,
    );
    expect(text('mix-primary')).toBe('47%');
    expect(text('mix-secondary')).toBe('ETF');
  });

  it('rests at the sphere’s tick strokes with nothing highlighted', async () => {
    await draw();
    expect(opacity('mix-centres-ETF-0')).toBe(tick.centre.opacity);
    expect(opacity('mix-sides-ETF-0')).toBe(tick.side.opacity);
  });

  it('brings the highlighted type forward and dims the rest to .3', async () => {
    await draw({ selected: 'ETF' });
    expect(opacity('mix-centres-ETF-0')).toBe(tick.centre.hotOpacity);
    expect(byId('mix-centres-ETF-0').props.strokeWidth).toBe(
      tick.centre.hotWidth,
    );
    expect(opacity('mix-sides-ETF-0')).toBe(tick.side.hotOpacity);
    expect(opacity('mix-centres-Stock-0')).toBeCloseTo(
      tick.centre.opacity * 0.3,
    );
    expect(opacity('mix-sides-REIT-0')).toBeCloseTo(tick.side.opacity * 0.3);
    expect(byId('mix-centres-REIT-0').props.strokeWidth).toBe(
      tick.centre.width,
    );
  });

  describe('motion', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const layerOpacity = (id: string) =>
      (getAnimatedStyle(byId(id)) as { opacity: number }).opacity;

    it('turns the dashed ring once every two minutes', async () => {
      await draw({ animate: true });
      const turn = () =>
        parseFloat(
          (
            getAnimatedStyle(byId('mix-spin-ring')) as {
              transform: { rotate: string }[];
            }
          ).transform[0]!.rotate,
        );
      expect(turn()).toBe(0);
      await act(() => jest.advanceTimersByTime(30_000));
      expect(turn()).toBeCloseTo(90, 0);
    });

    it('grows the ticks in, staggered 12 ms a tick', async () => {
      await draw({ animate: true });
      expect(layerOpacity('mix-ticks-Stock-0')).toBe(0);
      await act(() => jest.advanceTimersByTime(950));
      expect(layerOpacity('mix-ticks-Stock-0')).toBe(1);
      // The REIT's last layer starts at tick 72.
      expect(layerOpacity('mix-ticks-REIT-1')).toBeLessThan(1);
      await act(() => jest.advanceTimersByTime(72 * 12));
      expect(layerOpacity('mix-ticks-REIT-1')).toBe(1);
    });

    it('pulses the head, and rests at a faint halo', async () => {
      await draw({ animate: true });
      expect(layerOpacity('mix-pulse')).toBeCloseTo(0.35);
      await act(() => jest.advanceTimersByTime(1400));
      expect(layerOpacity('mix-pulse')).toBeCloseTo(0, 1);
    });
  });
});
