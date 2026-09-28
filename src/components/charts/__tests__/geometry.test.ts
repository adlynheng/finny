import {
  arcPath,
  distributeTicks,
  interpolate,
  labelAnchor,
  polar,
  rad,
  smoothPath,
} from '@/components/charts/geometry';

describe('rad and polar', () => {
  it('converts degrees to radians', () => {
    expect(rad(0)).toBe(0);
    expect(rad(180)).toBeCloseTo(Math.PI);
    expect(rad(-90)).toBeCloseTo(-Math.PI / 2);
  });

  it('measures angles clockwise from 3 o’clock, as SVG’s y-down axis does', () => {
    const [x0, y0] = polar(10, 0);
    expect(x0).toBeCloseTo(10);
    expect(y0).toBeCloseTo(0);
    // -90° is the top of the circle.
    const [x1, y1] = polar(10, -90);
    expect(x1).toBeCloseTo(0);
    expect(y1).toBeCloseTo(-10);
    const [x2, y2] = polar(10, 90);
    expect(x2).toBeCloseTo(0);
    expect(y2).toBeCloseTo(10);
  });
});

describe('arcPath', () => {
  it('draws a clockwise arc between two angles', () => {
    expect(arcPath(100, 0, 90)).toBe('M100,0 A100,100 0 0 1 0,100');
  });

  it('takes the short way round up to 180°', () => {
    expect(arcPath(100, -90, 90)).toBe('M0,-100 A100,100 0 0 1 0,100');
    expect(arcPath(100, -90, 89)).toMatch(/ 0 0 1 /);
  });

  it('sets the large-arc flag once the sweep passes 180°', () => {
    expect(arcPath(100, -90, 91)).toMatch(/ 0 1 1 /);
    expect(arcPath(208, -90, 269.9)).toMatch(/^M0,-208 A208,208 0 1 1 /);
  });

  it('never writes exponent notation for near-zero coordinates', () => {
    expect(arcPath(222, -90, 0)).toBe('M0,-222 A222,222 0 0 1 222,0');
    expect(arcPath(222, -90, 0)).not.toMatch(/e/);
  });
});

describe('smoothPath', () => {
  it('draws nothing for no points, and a bare move for one', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([[1, 2]])).toBe('M1.0,2.0');
  });

  it('smooths two points into one cubic, controls a sixth of the way in', () => {
    // With no neighbours, each end borrows itself: controls sit a sixth of
    // the way along the segment from each end.
    expect(
      smoothPath([
        [0, 0],
        [60, 30],
      ]),
    ).toBe('M0.0,0.0 C10.0,5.0 50.0,25.0 60.0,30.0');
  });

  it('derives each control point from the neighbouring points', () => {
    const d = smoothPath([
      [0, 0],
      [60, 60],
      [120, 0],
      [180, 60],
    ]);
    expect(d).toBe(
      'M0.0,0.0' +
        ' C10.0,10.0 40.0,60.0 60.0,60.0' +
        ' C80.0,60.0 100.0,0.0 120.0,0.0' +
        ' C140.0,0.0 170.0,50.0 180.0,60.0',
    );
  });

  it('passes through every point', () => {
    const pts: [number, number][] = [
      [0, 400],
      [41.7, 312.4],
      [83.3, 350],
      [125, 200.25],
    ];
    const ends = [...smoothPath(pts).matchAll(/ (-?[\d.]+,-?[\d.]+)(?= C|$)/g)];
    expect(ends.map(m => m[1])).toEqual([
      '41.7,312.4',
      '83.3,350.0',
      '125.0,200.3',
    ]);
  });
});

describe('interpolate', () => {
  const a = [10, 20, 30];
  const b = [20, 40, 70];

  it('returns the first series at 0 and the second at 1', () => {
    expect(interpolate(a, b, 0)).toEqual(a);
    expect(interpolate(a, b, 1)).toEqual(b);
  });

  it('blends each index at the fraction between', () => {
    expect(interpolate(a, b, 0.25)).toEqual([12.5, 25, 40]);
    expect(interpolate(a, b, 0.5)).toEqual([15, 30, 50]);
  });

  it('rejects series of different lengths', () => {
    expect(() => interpolate(a, [1, 2], 0.5)).toThrow(
      'interpolate: series lengths differ (3 vs 2)',
    );
  });
});

describe('distributeTicks', () => {
  const sum = (ns: number[]) => ns.reduce((s, n) => s + n, 0);

  it('allocates ticks in proportion to each value', () => {
    // The Overview's asset classes: cash, CPF, investments, property.
    const d = distributeTicks([42300, 65170, 78950, 120000], {
      count: 96,
      gap: 5,
    });
    expect(d.groups.map(g => g.n)).toEqual([13, 20, 25, 38]);
  });

  it('gives a non-empty category at least one tick, however small', () => {
    const d = distributeTicks([1, 10000], { count: 96, gap: 5 });
    expect(d.groups.map(g => g.n)).toEqual([1, 96]);
  });

  it('gives an empty category no ticks and no gap', () => {
    const d = distributeTicks([50, 0, 50], { count: 10, gap: 6 });
    expect(d.groups.map(g => g.n)).toEqual([5, 0, 5]);
    // Two groups, two gaps: 360 - 12 = 348° shared by 10 ticks.
    expect(d.step).toBeCloseTo(34.8);
    expect(d.groups[1]?.ticks).toEqual([]);
  });

  it('starts half a gap past the top and leaves a gap after every group', () => {
    const d = distributeTicks([1, 1], { count: 4, gap: 10 });
    // 340° over 4 ticks = 85° each.
    expect(d.step).toBe(85);
    expect(d.groups[0]).toEqual({
      n: 2,
      start: -85,
      end: 85,
      ticks: [-42.5, 42.5],
    });
    expect(d.groups[1]).toEqual({
      n: 2,
      start: 95,
      end: 265,
      ticks: [137.5, 222.5],
    });
    // The last group ends half a gap short of where the first began.
    expect(d.groups[1]!.end + 10 / 2).toBe(-85 + 360 - 10 / 2);
  });

  it('fills the circle exactly: ticks plus gaps make 360°', () => {
    const d = distributeTicks([1900, 1420, 1800, 1500, 2600, 280], {
      count: 96,
      gap: 6,
    });
    const n = sum(d.groups.map(g => g.n));
    expect(n * d.step + 6 * d.groups.length).toBeCloseTo(360);
  });

  it('allocates nothing when every value is zero', () => {
    const d = distributeTicks([0, 0], { count: 96, gap: 5 });
    expect(d.groups.map(g => g.n)).toEqual([0, 0]);
    expect(d.step).toBe(0);
  });
});

describe('labelAnchor', () => {
  it('anchors at the start on the right-hand side', () => {
    expect(labelAnchor(0)).toEqual({ anchor: 'start', dy: 0 });
    expect(labelAnchor(-30)).toEqual({ anchor: 'start', dy: 0 });
  });

  it('anchors at the end on the left-hand side', () => {
    expect(labelAnchor(180)).toEqual({ anchor: 'end', dy: 0 });
    expect(labelAnchor(150)).toEqual({ anchor: 'end', dy: 0 });
  });

  it('centres near the poles, nudged away from the circle', () => {
    // Top: pushed up. Bottom: pushed down.
    expect(labelAnchor(-90)).toEqual({ anchor: 'middle', dy: -12 });
    expect(labelAnchor(90)).toEqual({ anchor: 'middle', dy: 12 });
  });

  it('switches at a cosine of ±.25 and nudges past a sine of ±.6', () => {
    // cos(75°) ≈ .259 → start; cos(76°) ≈ .242 → middle.
    expect(labelAnchor(75).anchor).toBe('start');
    expect(labelAnchor(76).anchor).toBe('middle');
    expect(labelAnchor(105).anchor).toBe('end');
    // sin(36°) ≈ .588 → no nudge; sin(37°) ≈ .602 → nudged.
    expect(labelAnchor(36).dy).toBe(0);
    expect(labelAnchor(37).dy).toBe(12);
  });
});
