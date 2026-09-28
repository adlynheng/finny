import {
  linearGradientLine,
  radialGradientShape,
} from '@/components/ui/gradientGeometry';

/** Where a point falls along the gradient line: 0 at the start, 1 at the end. */
function along(
  line: { x1: number; y1: number; x2: number; y2: number },
  x: number,
  y: number,
) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  return ((x - line.x1) * dx + (y - line.y1) * dy) / (dx * dx + dy * dy);
}

describe('linearGradientLine', () => {
  it.each([
    [180, { x1: 100, y1: 0, x2: 100, y2: 100 }],
    [0, { x1: 100, y1: 100, x2: 100, y2: 0 }],
    [90, { x1: 0, y1: 50, x2: 200, y2: 50 }],
    [270, { x1: 200, y1: 50, x2: 0, y2: 50 }],
  ])('reads %i° as CSS does', (angle, expected) => {
    const line = linearGradientLine(angle, 200, 100);
    expect(line.x1).toBeCloseTo(expected.x1, 10);
    expect(line.y1).toBeCloseTo(expected.y1, 10);
    expect(line.x2).toBeCloseTo(expected.x2, 10);
    expect(line.y2).toBeCloseTo(expected.y2, 10);
  });

  it('runs corner to corner at 45° in a square', () => {
    const line = linearGradientLine(45, 100, 100);
    expect(line.x1).toBeCloseTo(0, 10);
    expect(line.y1).toBeCloseTo(100, 10);
    expect(line.x2).toBeCloseTo(100, 10);
    expect(line.y2).toBeCloseTo(0, 10);
  });

  it.each([
    // [angle, corner at 0%, corner at 100%] in a 320×180 card.
    [128, [0, 0], [320, 180]],
    [160, [0, 0], [320, 180]],
    [170, [0, 0], [320, 180]],
    [60, [0, 180], [320, 0]],
    [135, [0, 0], [320, 180]],
  ])(
    'puts the 0%% and 100%% stops on the nearest and farthest corners at %i°, as CSS sizes the line',
    (angle, start, end) => {
      const line = linearGradientLine(angle, 320, 180);
      expect(along(line, start[0]!, start[1]!)).toBeCloseTo(0, 10);
      expect(along(line, end[0]!, end[1]!)).toBeCloseTo(1, 10);
    },
  );

  it('is centred on the box', () => {
    const line = linearGradientLine(128, 320, 180);
    expect((line.x1 + line.x2) / 2).toBeCloseTo(160, 10);
    expect((line.y1 + line.y2) / 2).toBeCloseTo(90, 10);
  });
});

describe('radialGradientShape', () => {
  it('sizes an ellipse as fractions of the box', () => {
    // shareOfAssets: radial-gradient(120% 90% at 20% 100%, …)
    expect(
      radialGradientShape(
        {
          kind: 'radial',
          shape: 'ellipse',
          rx: 1.2,
          ry: 0.9,
          cx: 0.2,
          cy: 1,
          stops: [],
        },
        400,
        200,
      ),
    ).toEqual({ cx: 80, cy: 200, rx: 480, ry: 180 });
  });

  it('sizes a circle to the farthest corner, as CSS does by default', () => {
    // heroGlow: circle at 42% 40%. The farthest corner of 100×100 is (100, 100).
    const shape = radialGradientShape(
      { kind: 'radial', shape: 'circle', cx: 0.42, cy: 0.4, stops: [] },
      100,
      100,
    );
    const r = Math.hypot(58, 60);
    expect(shape.cx).toBeCloseTo(42, 10);
    expect(shape.cy).toBeCloseTo(40, 10);
    expect(shape.rx).toBeCloseTo(r, 10);
    expect(shape.ry).toBeCloseTo(r, 10);
  });

  it('picks the farthest corner whichever side the centre is on', () => {
    const shape = radialGradientShape(
      { kind: 'radial', shape: 'circle', cx: 0.9, cy: 0.8, stops: [] },
      200,
      100,
    );
    expect(shape.rx).toBeCloseTo(Math.hypot(180, 80), 10);
  });
});
