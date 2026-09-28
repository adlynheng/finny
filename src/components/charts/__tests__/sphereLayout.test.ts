import { arcPath, polar } from '@/components/charts/geometry';
import {
  classAt,
  latitudes,
  referenceRadius,
  sphereGeometry,
  tickGroups,
  type SphereClass,
} from '@/components/charts/sphereLayout';
import { textWidth } from '@/components/charts/textWidth';

// The Overview design's mock breakdown, in cents.
const classes: SphereClass[] = [
  { key: 'cash', label: 'Cash', cents: 4_230_000 },
  { key: 'cpf', label: 'CPF', cents: 6_517_000 },
  { key: 'inv', label: 'Investments', cents: 7_895_000 },
  { key: 'prop', label: 'Property', cents: 12_000_000 },
];

describe('referenceRadius', () => {
  it('sizes the circle by the square root of oldest over newest net worth', () => {
    // The design's Oct 2024 and Sep 2026 net worth.
    expect(referenceRadius(16_820_000, 24_242_000)).toBeCloseTo(
      170 * Math.sqrt(168200 / 242420),
    );
  });

  it('draws outside the sphere when net worth has fallen', () => {
    expect(referenceRadius(200, 100)).toBeGreaterThan(170);
  });

  it('has no circle when either figure is zero or negative', () => {
    expect(referenceRadius(0, 100)).toBeNull();
    expect(referenceRadius(100, -5)).toBeNull();
  });
});

describe('latitudes', () => {
  it('draws thirteen bands, each coloured by the class its height falls in', () => {
    const lats = latitudes(classes);
    expect(lats).toHaveLength(13);
    // Cumulative shares .138, .351, .609, 1 over the band centres (j+.5)/13.
    expect(lats.map(l => l.key)).toEqual([
      'cash',
      'cash',
      'cpf',
      'cpf',
      'cpf',
      'inv',
      'inv',
      'inv',
      'prop',
      'prop',
      'prop',
      'prop',
      'prop',
    ]);
  });

  it('places each band on the sphere, flattened to .17 of its width', () => {
    const [first, , , , , , middle] = latitudes(classes);
    expect(middle).toMatchObject({
      y: expect.closeTo(0),
      rx: expect.closeTo(170),
    });
    expect(middle!.ry).toBeCloseTo(170 * 0.17);
    const phi = -Math.PI / 2 + (0.5 / 13) * Math.PI;
    expect(first!.y).toBeCloseTo(-170 * Math.sin(phi));
    expect(first!.rx).toBeCloseTo(170 * Math.cos(phi));
  });
});

describe('tickGroups', () => {
  const groups = tickGroups(classes);

  it('gives each class ticks in proportion to its share of 96', () => {
    expect(groups.map(g => g.ticks.length)).toEqual([13, 20, 25, 38]);
    expect(groups.map(g => g.firstIndex)).toEqual([0, 13, 33, 58]);
  });

  it('gives a tiny class one tick rather than none', () => {
    const tiny = tickGroups([
      { key: 'a', label: 'Cash', cents: 1 },
      { key: 'b', label: 'CPF', cents: 1_000_000 },
    ]);
    expect(tiny.map(g => g.ticks.length)).toEqual([1, 96]);
  });

  it('sets each class’s tick length, with a wobble of up to 16% shorter', () => {
    const [cash, cpf, inv, prop] = groups;
    const longest = (g: typeof cash) =>
      Math.max(...g!.ticks.map(t => t.length));
    expect(longest(cash)).toBeLessThanOrEqual(30);
    expect(longest(cpf)).toBeLessThanOrEqual(22);
    expect(longest(inv)).toBeLessThanOrEqual(44);
    expect(longest(prop)).toBeLessThanOrEqual(36);
    for (const g of groups) {
      for (const t of g.ticks) {
        expect(t.length).toBeGreaterThanOrEqual(g.tickLength * 0.68);
      }
    }
    // The design's wobble: len · (.84 + .16 · sin(i·1.9 + j·.7)).
    expect(cpf!.ticks[2]!.length).toBeCloseTo(
      22 * (0.84 + 0.16 * Math.sin(15 * 1.9 + 2 * 0.7)),
    );
  });

  it('gives a class the design has no length for the Cash length', () => {
    const [other] = tickGroups([{ key: 'o', label: 'Other', cents: 100 }]);
    expect(other!.tickLength).toBe(30);
  });

  it('draws each tick as a triplet: a full centre line and two shorter sides', () => {
    const t = groups[0]!.ticks[0]!;
    const [x1, y1] = polar(198, t.angle);
    const [x2, y2] = polar(198 + t.length, t.angle);
    expect(
      groups[0]!.chunks[0]!.centre.startsWith(
        `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`,
      ),
    ).toBe(true);
    const [sx, sy] = polar(198 + t.length * 0.8, t.angle - 0.7);
    expect(groups[0]!.chunks[0]!.sides).toContain(
      `L${sx.toFixed(2)} ${sy.toFixed(2)}`,
    );
  });

  it('splits each class into layers of four ticks for the entrance', () => {
    expect(groups[0]!.chunks.map(c => c.firstIndex)).toEqual([0, 4, 8, 12]);
    expect(groups[1]!.chunks.map(c => c.firstIndex)).toEqual([
      13, 17, 21, 25, 29,
    ]);
    const segments = (d: string) => d.split('M').length - 1;
    expect(groups[0]!.chunks.map(c => segments(c.centre))).toEqual([
      4, 4, 4, 1,
    ]);
    expect(groups[0]!.chunks.map(c => segments(c.sides))).toEqual([8, 8, 8, 2]);
  });

  it('hangs a hit arc at 222 over each class’s span', () => {
    const g = groups[3]!;
    expect(g.hitPath).toBe(arcPath(222, g.start, g.end));
  });

  it('puts a bead on the outer ring half a gap before each class', () => {
    const g = groups[1]!;
    const [bx, by] = polar(252, g.start - 2.5);
    expect(g.bead[0]).toBeCloseTo(bx);
    expect(g.bead[1]).toBeCloseTo(by);
  });

  it('formats each class’s value and share', () => {
    expect(groups.map(g => [g.value, g.percent])).toEqual([
      ['S$42.3k', '14%'],
      ['S$65.2k', '21%'],
      ['S$79.0k', '26%'],
      ['S$120.0k', '39%'],
    ]);
  });
});

describe('labels', () => {
  const groups = tickGroups(classes);

  it('anchors each label outward from its span’s midpoint at 272', () => {
    expect(groups.map(g => g.labelAt.anchor)).toEqual([
      'start',
      'start',
      'middle',
      'end',
    ]);
    // Cash sits near the top (nudged up); Investments at the bottom (down).
    expect(groups.map(g => g.labelAt.dy)).toEqual([-12, 0, 12, 0]);
    const g = groups[1]!;
    const [lx, ly] = polar(272, (g.start + g.end) / 2);
    expect(g.labelAt.x).toBeCloseTo(lx);
    expect(g.labelAt.nameY).toBeCloseTo(ly - 5);
    expect(g.labelAt.valueY).toBeCloseTo(ly + 14);
  });

  it('lays the value and its share out as one run, 6 apart', () => {
    const value = textWidth('S$120.0k', 19, 'light');
    const share = textWidth('39%', 12);
    // End-anchored: the run finishes at the label point.
    const prop = groups[3]!;
    expect(prop.labelAt.valueX).toBeCloseTo(
      prop.labelAt.x - (value + 6 + share),
    );
    expect(prop.labelAt.percentX).toBeCloseTo(prop.labelAt.valueX + value + 6);
    // Middle-anchored: centred on it.
    const inv = groups[2]!;
    const run = textWidth('S$79.0k', 19, 'light') + 6 + textWidth('26%', 12);
    expect(inv.labelAt.valueX).toBeCloseTo(inv.labelAt.x - run / 2);
    // Start-anchored: begins at it.
    expect(groups[0]!.labelAt.valueX).toBeCloseTo(groups[0]!.labelAt.x);
  });
});

describe('classAt', () => {
  const geo = sphereGeometry(classes, { labels: true });

  it('finds the class under a point on its hit arc', () => {
    for (const g of geo.groups) {
      const [x, y] = polar(222, (g.start + g.end) / 2);
      expect(classAt(geo, x, y)).toBe(g.key);
    }
  });

  it('covers the arc’s full 60-unit width, and no further', () => {
    const g = geo.groups[1]!;
    const mid = (g.start + g.end) / 2;
    expect(classAt(geo, ...polar(193, mid))).toBe('cpf');
    expect(classAt(geo, ...polar(251, mid))).toBe('cpf');
    expect(classAt(geo, ...polar(180, mid))).toBeNull();
  });

  it('finds nothing in the gaps between classes or inside the sphere', () => {
    const gapAngle = geo.groups[1]!.start - 2.5;
    expect(classAt(geo, ...polar(222, gapAngle))).toBeNull();
    expect(classAt(geo, 0, 0)).toBeNull();
  });

  it('counts the label as part of its class', () => {
    const l = geo.groups[3]!.labelAt;
    // Just inside the end of Property's name.
    expect(classAt(geo, l.x - 2, l.nameY - 4)).toBe('prop');
  });

  it('ignores label positions when labels are hidden', () => {
    const compact = sphereGeometry(classes, { labels: false });
    const l = compact.groups[3]!.labelAt;
    expect(classAt(compact, l.x - 2, l.nameY - 4)).toBeNull();
  });
});

describe('sphereGeometry', () => {
  it('uses the desktop’s 720 viewBox with labels and the mobile 524 without', () => {
    expect(sphereGeometry(classes, { labels: true }).half).toBe(360);
    expect(sphereGeometry(classes, { labels: false }).half).toBe(262);
  });

  it('drops classes with no value', () => {
    const geo = sphereGeometry(
      [...classes, { key: 'x', label: 'Other', cents: 0 }],
      {
        labels: true,
      },
    );
    expect(geo.groups.map(g => g.key)).toEqual(['cash', 'cpf', 'inv', 'prop']);
  });
});
