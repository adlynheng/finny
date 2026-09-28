import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { Sphere, meridianScaleX } from '@/components/charts/Sphere';
import { tickGroups, type SphereClass } from '@/components/charts/sphereLayout';
import { polar } from '@/components/charts/geometry';
import { tokens } from '@/theme/tokens';

// Hover tracking is macOS-only; these tests drive the macOS surface.
jest.mock('@/components/ui/HoverSurface', () =>
  jest.requireActual('@/components/ui/HoverSurface.macos'),
);

const look = tokens.sphere;
const hidden = { includeHiddenElements: true };
const byId = (id: string) => screen.getByTestId(id, hidden);
const allById = (id: RegExp) => screen.queryAllByTestId(id, hidden);

// The Overview design's mock breakdown, in cents.
const classes: SphereClass[] = [
  { key: 'cash', label: 'Cash', cents: 4_230_000 },
  { key: 'cpf', label: 'CPF', cents: 6_517_000 },
  { key: 'inv', label: 'Investments', cents: 7_895_000 },
  { key: 'prop', label: 'Property', cents: 12_000_000 },
];

type Props = Partial<Parameters<typeof Sphere>[0]>;
const draw = (props: Props = {}) =>
  render(
    <Sphere
      classes={classes}
      oldest={{ month: '2024-10', cents: 16_820_000 }}
      newestCents={24_242_000}
      selected={null}
      animate={false}
      {...props}
    />,
  );

const opacity = (id: string) => byId(id).props.strokeOpacity as number;
// An SVG text's string sits in its span.
const text = (id: string) =>
  byId(id)
    .children.map(c => (typeof c === 'string' ? c : String(c.props.content)))
    .join('');
const centres = (key: string) => allById(new RegExp(`^sphere-centres-${key}-`));

describe('Sphere', () => {
  describe('from a class breakdown', () => {
    it('draws ten meridians and thirteen latitudes', async () => {
      await draw();
      expect(allById(/^sphere-meridian-/)).toHaveLength(10);
      expect(allById(/^sphere-latitude-/)).toHaveLength(13);
    });

    it('gives each class ticks in proportion to its share, four to a layer', async () => {
      await draw();
      const count = (key: string) =>
        centres(key).reduce(
          (n, el) => n + (el.props.d as string).split('M').length - 1,
          0,
        );
      expect(classes.map(c => count(c.key))).toEqual([13, 20, 25, 38]);
      expect(allById(/^sphere-ticks-/)).toHaveLength(4 + 5 + 7 + 10);
    });

    it('puts a bead before each class and labels it with its value and share', async () => {
      await draw();
      expect(allById(/^sphere-bead-/)).toHaveLength(4);
      expect(text('sphere-value-prop')).toBe('S$120.0k');
      expect(text('sphere-percent-prop')).toBe('39%');
      expect(text('sphere-name-inv')).toBe('Investments');
    });

    it('lays the share out after the value, from the measured widths', async () => {
      await draw();
      const inv = tickGroups(classes)[2]!.labelAt;
      expect(byId('sphere-value-inv').props.x).toEqual([inv.valueX]);
      expect(byId('sphere-percent-inv').props.x).toEqual([inv.percentX]);
    });

    it('draws the dashed reference circle with the oldest month and value', async () => {
      await draw();
      expect(byId('sphere-reference').props.r).toBeCloseTo(
        170 * Math.sqrt(168200 / 242420),
      );
      expect(text('sphere-reference-label')).toBe('Oct 2024 · S$168.2k');
    });

    it('leaves the reference circle out when a net worth is not positive', async () => {
      await draw({ oldest: { month: '2024-10', cents: -500 } });
      expect(allById(/^sphere-reference/)).toHaveLength(0);
    });

    it('drops the labels and tightens the viewBox on mobile', async () => {
      await draw({ labels: false });
      expect(allById(/^sphere-value-/)).toHaveLength(0);
      expect(allById(/^sphere-name-/)).toHaveLength(0);
      expect(allById(/^sphere-ticks-/)).toHaveLength(26);
    });
  });

  describe('highlighting', () => {
    it('rests at the design’s strokes with nothing selected', async () => {
      await draw();
      expect(opacity('sphere-meridian-0')).toBe(look.meridian.opacity);
      expect(opacity('sphere-latitude-6')).toBe(look.latitude.rest.opacity);
      expect(opacity('sphere-centres-cpf-0')).toBe(look.tick.centre.opacity);
      expect(opacity('sphere-sides-cpf-0')).toBe(look.tick.side.opacity);
      expect(byId('sphere-value-cash').props.fillOpacity).toBe(1);
    });

    it('brings the selected class forward and dims the others', async () => {
      await draw({ selected: 'cpf' });
      const t = look.tick;
      // cpf's own ticks: darker and heavier.
      expect(opacity('sphere-centres-cpf-0')).toBe(t.centre.hotOpacity);
      expect(byId('sphere-centres-cpf-0').props.strokeWidth).toBe(
        t.centre.hotWidth,
      );
      expect(opacity('sphere-sides-cpf-0')).toBe(t.side.hotOpacity);
      // Everyone else's at .35 of rest.
      expect(opacity('sphere-centres-prop-0')).toBeCloseTo(
        t.centre.opacity * t.dim,
      );
      expect(byId('sphere-centres-prop-0').props.strokeWidth).toBe(
        t.centre.width,
      );
      expect(opacity('sphere-sides-cash-0')).toBeCloseTo(
        t.side.opacity * t.dim,
      );
      // Value labels: the others fade.
      expect(byId('sphere-value-cpf').props.fillOpacity).toBe(1);
      expect(byId('sphere-value-prop').props.fillOpacity).toBe(
        look.valueDimOpacity,
      );
      expect(byId('sphere-percent-prop').props.fillOpacity).toBe(
        look.valueDimOpacity,
      );
      // Latitudes 2–4 are cpf's band; the meridians recede.
      expect(opacity('sphere-latitude-3')).toBe(look.latitude.hot.opacity);
      expect(byId('sphere-latitude-3').props.strokeWidth).toBe(
        look.latitude.hot.width,
      );
      expect(opacity('sphere-latitude-9')).toBe(look.latitude.dim.opacity);
      expect(opacity('sphere-meridian-0')).toBe(look.meridian.dimOpacity);
    });
  });

  describe('hover on macOS', () => {
    // The surface reports points; at 720pt one point is one viewBox unit.
    const at = (r: number, deg: number) => {
      const [x, y] = polar(r, deg);
      return {
        nativeEvent: { x: x + 360, y: y + 360, width: 720, height: 720 },
      };
    };
    const mid = (k: number) => {
      const g = tickGroups(classes)[k]!;
      return (g.start + g.end) / 2;
    };

    it('selects the class under the pointer, once per change', async () => {
      const onSelect = jest.fn();
      await draw({ onSelect });
      const surface = byId('sphere-hover');
      await fireEvent(surface, 'hoverMove', at(222, mid(1)));
      await fireEvent(surface, 'hoverMove', at(230, mid(1) + 3));
      await fireEvent(surface, 'hoverMove', at(222, mid(3)));
      expect(onSelect.mock.calls).toEqual([['cpf'], ['prop']]);
    });

    it('clears the selection in a gap, off the ring and on leaving', async () => {
      const onSelect = jest.fn();
      await draw({ onSelect });
      const surface = byId('sphere-hover');
      await fireEvent(surface, 'hoverMove', at(222, mid(0)));
      await fireEvent(surface, 'hoverMove', at(100, mid(0)));
      await fireEvent(surface, 'hoverMove', at(222, mid(2)));
      await fireEvent(surface, 'hoverEnd');
      expect(onSelect.mock.calls).toEqual([['cash'], [null], ['inv'], [null]]);
    });

    it('scales the pointer into the viewBox at any rendered size', async () => {
      const onSelect = jest.fn();
      await draw({ onSelect });
      const [x, y] = polar(222, mid(2));
      await fireEvent(byId('sphere-hover'), 'hoverMove', {
        nativeEvent: {
          x: (x + 360) / 2,
          y: (y + 360) / 2,
          width: 360,
          height: 360,
        },
      });
      expect(onSelect).toHaveBeenCalledWith('inv');
    });
  });

  describe('motion', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const layerOpacity = (id: string) =>
      (getAnimatedStyle(byId(id)) as { opacity: number }).opacity;

    it('holds the design’s resting frame when not animating', async () => {
      await draw();
      // scaleX(cos(i/10 · π)).
      expect(byId('sphere-meridian-3').props.matrix[0]).toBeCloseTo(
        Math.cos(0.3 * Math.PI),
        3,
      );
      expect(layerOpacity('sphere-ticks-prop-9')).toBe(1);
      expect(layerOpacity('sphere-pulse')).toBe(look.pole.pulseRestOpacity);
    });

    it('grows the ticks in, staggered 12 ms a tick', async () => {
      await draw({ animate: true });
      expect(layerOpacity('sphere-ticks-cash-0')).toBe(0);
      // The first layer is done after .9 s; the last starts at tick 92.
      await act(() => jest.advanceTimersByTime(950));
      expect(layerOpacity('sphere-ticks-cash-0')).toBe(1);
      expect(layerOpacity('sphere-ticks-prop-9')).toBeLessThan(1);
      await act(() => jest.advanceTimersByTime(92 * 12));
      expect(layerOpacity('sphere-ticks-prop-9')).toBe(1);
    });

    it('turns the dashed ring', async () => {
      await draw({ animate: true });
      const turn = () =>
        (
          getAnimatedStyle(byId('sphere-spin-ring')) as {
            transform: { rotate: string }[];
          }
        ).transform[0]!.rotate;
      expect(turn()).toBe('0deg');
      await act(() => jest.advanceTimersByTime(30_000));
      expect(parseFloat(turn())).toBeCloseTo(90, 0);
    });

    it('pulses about the pole itself', async () => {
      await draw({ animate: true, labels: false });
      // Half 262: the pole is (262 − 170) / 524 down; the dot is 18 across.
      expect(byId('sphere-pulse').props.style).toEqual(
        expect.arrayContaining([
          {
            left: '50%',
            top: `${(92 / 524) * 100}%`,
            width: `${(18 / 524) * 100}%`,
            marginLeft: `${(-9 / 524) * 100}%`,
            marginTop: `${(-9 / 524) * 100}%`,
          },
        ]),
      );
    });

    it('pulses the pole out and back', async () => {
      await draw({ animate: true });
      expect(layerOpacity('sphere-pulse')).toBeCloseTo(0.35);
      await act(() => jest.advanceTimersByTime(1400));
      expect(layerOpacity('sphere-pulse')).toBeCloseTo(0, 1);
      await act(() => jest.advanceTimersByTime(1400));
      expect(layerOpacity('sphere-pulse')).toBeCloseTo(0.35, 1);
    });
  });

  describe('meridian scale', () => {
    it('swings each meridian from 1 to −1 and back over the two-leg clock', () => {
      expect(meridianScaleX(0, 0)).toBe(1);
      expect(meridianScaleX(0.5, 0)).toBeCloseTo(0);
      expect(meridianScaleX(1, 0)).toBe(-1);
      expect(meridianScaleX(1.5, 0)).toBeCloseTo(0);
      expect(meridianScaleX(2, 0)).toBe(1);
    });

    it('starts each meridian a tenth of a cycle ahead of the last', () => {
      // A tenth of a 14 s cycle is 1.4 s: a tenth of one leg.
      expect(meridianScaleX(0, 5)).toBeCloseTo(0);
      expect(meridianScaleX(0.3, 2)).toBeCloseTo(meridianScaleX(0.5, 0));
    });
  });
});
