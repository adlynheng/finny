import { smoothPath } from '@/components/charts/geometry';
import {
  historyGeometry,
  historyTip,
  indexAt,
  xAt,
} from '@/components/charts/historyLayout';
import type { HistoryPoint } from '@/utils/derive/networth';
import { designHistory } from '../../../../test/historyCases';

const geo = historyGeometry(designHistory);
const maxNet = Math.max(...designHistory.map(p => p.net)) * 1.08;

describe('historyGeometry', () => {
  it('draws sixteen strands: twelve echoes, three bands, then the net line', () => {
    expect(geo.strands.map(s => s.kind)).toEqual([
      ...Array(12).fill('echo'),
      'band',
      'band',
      'band',
      'net',
    ]);
  });

  it('grades the strands’ opacity and width, the net line heaviest', () => {
    const look = (kind: string) =>
      geo.strands.filter(s => s.kind === kind).map(s => [s.opacity, s.width]);
    expect(new Set(look('echo').map(String))).toEqual(new Set(['0.2,0.8']));
    expect(new Set(look('band').map(String))).toEqual(new Set(['0.6,1']));
    expect(look('net')).toEqual([[1, 1.6]]);
  });

  it('plots the net line across 1000 × 400, 8% below the top at its peak', () => {
    const net = geo.strands[15]!.d;
    expect(net).toBe(
      smoothPath(
        designHistory.map((p, i) => [
          (i / 23) * 1000,
          400 - (p.net / maxNet) * 400,
        ]),
      ),
    );
    expect(Math.min(...geo.netTops)).toBeCloseTo(1 - 1 / 1.08);
  });

  it('puts the bands at cash, + investments, + CPF', () => {
    const [cash, inv, cpf] = geo.strands.slice(12, 15);
    const plot = (key: keyof HistoryPoint) =>
      smoothPath(
        designHistory.map((p, i) => [
          (i / 23) * 1000,
          400 - ((p[key] as number) / maxNet) * 400,
        ]),
      );
    expect(cash!.d).toBe(plot('cash'));
    expect(inv!.d).toBe(plot('investments'));
    expect(cpf!.d).toBe(plot('cpf'));
  });

  it('nests three echoes at 25/50/75% under cash and between each pair of bands', () => {
    const first = designHistory[0]!;
    // Each strand starts at month 0: its y is the lerp of the two bands there.
    const startY = (d: string) => Number(d.split(',')[1]!.split(' ')[0]);
    const y = (v: number) => 400 - (v / maxNet) * 400;
    const pairs: [number, number][] = [
      [0, first.cash],
      [first.cash, first.investments],
      [first.investments, first.cpf],
      [first.cpf, first.net],
    ];
    pairs.forEach(([a, b], k) =>
      [0.25, 0.5, 0.75].forEach((t, j) =>
        expect(startY(geo.strands[k * 3 + j]!.d)).toBeCloseTo(
          y(a + (b - a) * t),
          0,
        ),
      ),
    );
  });

  it('labels each band where it ends; the net line has only its end dot', () => {
    const last = designHistory[23]!;
    expect(geo.labels).toEqual([
      { text: '+ CPF', top: 1 - last.cpf / maxNet, opacity: 0.85 },
      {
        text: '+ Invest.',
        top: 1 - last.investments / maxNet,
        opacity: 0.85,
      },
      { text: 'Cash', top: 1 - last.cash / maxNet, opacity: 0.85 },
    ]);
    expect(geo.endTop).toBe(1 - last.net / maxNet);
  });

  it('draws a single month or an empty history without dividing by zero', () => {
    const one = historyGeometry(designHistory.slice(0, 1));
    expect(one.strands.every(s => /^M0\.0,/.test(s.d))).toBe(true);
    const none = historyGeometry([]);
    expect(none.strands.every(s => s.d === '')).toBe(true);
    expect(none.endTop).toBe(1);
  });
});

describe('indexAt', () => {
  it('snaps a pointer to the nearest month', () => {
    // 24 months over 460 points: a month every 20.
    expect(indexAt(0, 460, 24)).toBe(0);
    expect(indexAt(29, 460, 24)).toBe(1);
    expect(indexAt(31, 460, 24)).toBe(2);
    expect(indexAt(460, 460, 24)).toBe(23);
  });

  it('clamps past either edge', () => {
    expect(indexAt(-15, 460, 24)).toBe(0);
    expect(indexAt(480, 460, 24)).toBe(23);
  });

  it('has only month 0 when there is one month or no width', () => {
    expect(indexAt(200, 460, 1)).toBe(0);
    expect(indexAt(200, 0, 24)).toBe(0);
  });
});

describe('historyTip', () => {
  it('names the month, the net figure and each class’s own share', () => {
    const tip = historyTip(designHistory, geo, 0)!;
    expect(tip.month).toBe('Oct 2024');
    // 31,000 + 44,500 + 49,800 + 112,000 − 69,100.
    expect(tip.net).toBe('S$168,200');
    expect(tip.mix).toBe('Cash S$31.0k · Inv S$44.5k · CPF S$49.8k');
    expect(tip.left).toBe(0);
    expect(tip.top).toBe(geo.netTops[0]);
  });

  it('flips to the crosshair’s left past 60% of the width', () => {
    // Month 13 is at 56.5%, month 14 at 60.9%.
    expect(historyTip(designHistory, geo, 13)!.flip).toBe(false);
    expect(historyTip(designHistory, geo, 14)!.flip).toBe(true);
    expect(historyTip(designHistory, geo, 14)!.left).toBe(xAt(14, 24));
  });

  it('has nothing outside the history', () => {
    expect(historyTip(designHistory, geo, 24)).toBeNull();
  });
});
