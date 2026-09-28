import { allocationDial, budgetDial } from '@/components/charts/dialConfigs';
import { dialGeometry } from '@/components/charts/dialLayout';
import { arcPath, polar } from '@/components/charts/geometry';
import {
  designBudget,
  designGrossCents,
  designPlan,
} from '../../../../test/dialCases';

const close = ([x, y]: [number, number], [ex, ey]: [number, number]) => {
  expect(x).toBeCloseTo(ex);
  expect(y).toBeCloseTo(ey);
};

describe('the budget dial', () => {
  const config = budgetDial(designBudget);
  const geo = dialGeometry(config);
  const max = Math.max(...designBudget.dailyCents);

  it('gives each elapsed day a tick and each day to come a dot', () => {
    expect(config.groups.map(g => [g.key, g.ticks.length, !!g.dots])).toEqual([
      ['past', 23, false],
      ['today', 1, false],
      ['future', 6, true],
    ]);
    expect(geo.groups[2]!.dots).toHaveLength(6);
  });

  it('sizes each day’s tick by its spend: 10, plus up to 58 for the biggest day', () => {
    const lengths = [...config.groups[0]!.ticks, ...config.groups[1]!.ticks];
    lengths.forEach((len, i) =>
      expect(len).toBeCloseTo(10 + (designBudget.dailyCents[i]! / max) * 58),
    );
  });

  it('spaces the days evenly from the top, 12° each with no gaps', () => {
    // Day 1's tick at −84°; day 25's dot at 204° on the 116 ring.
    expect(geo.groups[0]!.start).toBe(-90);
    expect(
      geo.groups[0]!.runs[0]!.centre.startsWith(
        `M${polar(110, -84)[0].toFixed(2)} ${polar(110, -84)[1].toFixed(2)}L`,
      ),
    ).toBe(true);
    close(geo.groups[2]!.dots[0]!, polar(116, 204));
  });

  it('puts the pulsing head at the tip of today’s tick', () => {
    const len = config.groups[1]!.ticks[0]!;
    close(geo.head!, polar(110 + len, -90 + 23.5 * 12));
    expect(geo.groups[1]!.today).toBe(true);
  });

  it('runs the arc to the share of the limit used, ending in a dot', () => {
    const used = 271_200 / 350_000;
    expect(geo.arc).toMatchObject({
      d: arcPath(208, -90, -90 + used * 360),
      over: false,
      cap: 'dot',
    });
    expect(config.centre).toEqual({
      primary: '77%',
      secondary: 'of limit used',
      primarySize: 40,
    });
  });

  it('turns over-range past the limit, the arc stopping just short of a full turn', () => {
    const over = dialGeometry(
      budgetDial({ ...designBudget, spentCents: 400_000 }),
    );
    expect(over.arc!.over).toBe(true);
    expect(over.arc!.d).toBe(arcPath(208, -90, -90 + 0.9999 * 360));
    expect(budgetDial({ ...designBudget, spentCents: 350_000 }).arc!.over).toBe(
      false,
    );
  });

  it('marks even pace at today’s share of the month', () => {
    const a = -90 + (24 / 30) * 360;
    close(geo.pace!.at, polar(208, a));
    close(geo.pace!.labelAt, polar(192, a));
    expect(geo.pace!.label).toBe('even pace');
  });

  it('staggers its entrance 25 ms a day, from day 1', () => {
    expect(config.stagger).toEqual({ ms: 25, from: 1 });
  });

  it('has no beads or labels', () => {
    expect(geo.groups.every(g => g.bead === null && g.label === null)).toBe(
      true,
    );
  });
});

describe('the allocation dial', () => {
  const config = allocationDial({
    grossCents: designGrossCents,
    categories: designPlan,
  });
  const geo = dialGeometry(config);

  it('shares 96 ticks by amount, the unallocated remainder as dots', () => {
    // S$9,500 gross, S$9,220 allocated, S$280 over.
    expect(config.groups.map(g => [g.key, g.ticks.length, !!g.dots])).toEqual([
      ['cpf', 19, false],
      ['fixed', 14, false],
      ['inv', 18, false],
      ['sav', 15, false],
      ['exp', 26, false],
      ['unallocated', 3, true],
    ]);
  });

  it('gives each category its length with the design’s wobble', () => {
    // Investments’ third tick is tick 35 round the ring.
    expect(config.groups[2]!.ticks[2]).toBeCloseTo(
      62 * (0.84 + 0.16 * Math.sin(35 * 1.9 + 2 * 0.7)),
    );
  });

  it('leaves 6° between groups, with a bead before each', () => {
    const step = (360 - 6 * 6) / 95;
    expect(geo.groups[0]!.start).toBe(-87);
    expect(geo.groups[1]!.start).toBeCloseTo(-87 + 19 * step + 6);
    close(geo.groups[1]!.bead!, polar(208, geo.groups[1]!.start - 3));
  });

  it('labels each group outside the ring at 226', () => {
    const g = geo.groups[2]!;
    const [x, y] = polar(226, (g.start + g.end) / 2);
    expect(g.label).toMatchObject({
      name: 'Investments',
      value: 'S$1,800',
      x: expect.closeTo(x),
      nameY: expect.closeTo(y - 3),
      valueY: expect.closeTo(y + 13),
    });
    expect(geo.groups[5]!.label).toMatchObject({
      name: 'Unallocated',
      value: 'S$280',
    });
  });

  it('runs the arc to the end of the allocated ticks, the head at its end', () => {
    const end = geo.groups[4]!.end;
    expect(geo.arc!.d).toBe(arcPath(208, -90, end));
    close(geo.head!, polar(208, end));
    expect(geo.arc!.over).toBe(false);
  });

  it('turns over-range when the plan exceeds income, with nothing unallocated', () => {
    const over = allocationDial({
      grossCents: designGrossCents,
      categories: designPlan.map(c =>
        c.key === 'exp' ? { ...c, cents: 400_000 } : c,
      ),
    });
    expect(over.groups.map(g => g.key)).not.toContain('unallocated');
    const g = dialGeometry(over);
    expect(g.arc!.over).toBe(true);
    // The last group ends half a gap short of the top, and so does the arc.
    expect(g.arc!.d).toBe(arcPath(208, -90, g.groups[4]!.end));
  });

  it('reads gross income and the share allocated in the centre', () => {
    expect(config.centre).toEqual({
      primary: 'S$9,500',
      secondary: 'gross income · 97% allocated',
      primarySize: 36,
    });
  });

  it('staggers its entrance 12 ms a tick', () => {
    expect(config.stagger).toEqual({ ms: 12, from: 0 });
  });
});
