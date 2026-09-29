import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GradientCard } from '@/components/ui/GradientCard';
import { GradientFill } from '@/components/ui/GradientFill';
import { linearGradientLine } from '@/components/ui/gradientGeometry';
import { gradients, type GradientSpec } from '@/theme/gradients';
import { tokens } from '@/theme/tokens';

type Host = {
  type: unknown;
  props: Record<string, any>;
  children: (Host | string)[];
};

const classes = (el: { props: { className?: string } }) =>
  (el.props.className ?? '').split(/\s+/).filter(Boolean);

/** Every host element of `type` under `node`, in paint order. */
function findAll(node: Host, type: string): Host[] {
  return node.children.flatMap(child =>
    typeof child === 'string'
      ? []
      : [...(child.type === type ? [child] : []), ...findAll(child, type)],
  );
}

/** react-native-svg packs a gradient as [offset, ARGB, offset, ARGB, …], ARGB as a signed int. */
function stops(gradient: Host) {
  const packed = gradient.props.gradient as number[];
  const out = [];
  for (let i = 0; i < packed.length; i += 2) {
    const signed = packed[i + 1]!;
    const argb = signed < 0 ? signed + 2 ** 32 : signed;
    out.push({
      offset: packed[i]!,
      rgb: argb % 0x1000000,
      alpha: Math.round((Math.floor(argb / 0x1000000) / 255) * 100) / 100,
    });
  }
  return out;
}

async function renderFill(spec: GradientSpec, radius = 6) {
  await render(<GradientFill gradient={spec} radius={radius} testID="fill" />);
  const fill = screen.getByTestId('fill');
  await fireEvent(fill, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 180 } },
  });
  return screen.getByTestId('fill') as unknown as Host;
}

describe('GradientFill', () => {
  it('sits behind the content, fills its parent and never takes touches', async () => {
    await render(<GradientFill gradient={gradients.goals} testID="fill" />);
    const fill = screen.getByTestId('fill');
    expect(classes(fill)).toEqual(
      expect.arrayContaining(['absolute', 'inset-0']),
    );
    expect(fill.props.pointerEvents).toBe('none');
  });

  it('draws nothing until it knows its size', async () => {
    await render(<GradientFill gradient={gradients.goals} testID="fill" />);
    expect(
      findAll(screen.getByTestId('fill') as unknown as Host, 'RNSVGRect'),
    ).toEqual([]);
  });

  it('draws a rounded rect of its size, filled by the gradient', async () => {
    const fill = await renderFill(gradients.goals, 8);
    const [rect] = findAll(fill, 'RNSVGRect');
    const [gradient] = findAll(fill, 'RNSVGLinearGradient');

    expect(rect!.props).toMatchObject({
      width: 320,
      height: 180,
      rx: 8,
      ry: 8,
    });
    expect(rect!.props.fill).toMatchObject({ brushRef: gradient!.props.name });
    // userSpaceOnUse (1): the line is in points, sized for this box.
    expect(gradient!.props.gradientUnits).toBe(1);
    const line = linearGradientLine(180, 320, 180);
    expect(gradient!.props).toMatchObject({
      x1: line.x1,
      y1: line.y1,
      x2: line.x2,
      y2: line.y2,
    });
  });

  it('keeps every stop, in order', async () => {
    const fill = await renderFill(gradients.portfolioHealth);
    const [gradient] = findAll(fill, 'RNSVGLinearGradient');
    expect(stops(gradient!)).toEqual([
      { offset: 0, rgb: 0x415d72, alpha: 1 },
      { offset: 0.4, rgb: 0x5f778b, alpha: 1 },
      { offset: 0.74, rgb: 0x8a8a8e, alpha: 1 },
      { offset: 1, rgb: 0xad9f8c, alpha: 1 },
    ]);
  });

  it('carries a stop colour’s alpha, which react-native-svg would otherwise drop', async () => {
    const fill = await renderFill(gradients.heroGlow);
    const [gradient] = findAll(fill, 'RNSVGRadialGradient');
    expect(stops(gradient!).map(s => s.alpha)).toEqual([0.45, 0.35, 0.28, 0]);
    expect(stops(gradient!)[0]!.rgb).toBe(0xd8f23a);
  });

  it('paints a layered gradient bottom first: shareOfAssets’ glow over its base', async () => {
    const fill = await renderFill(gradients.shareOfAssets);
    const rects = findAll(fill, 'RNSVGRect');
    const [linear] = findAll(fill, 'RNSVGLinearGradient');
    const [radial] = findAll(fill, 'RNSVGRadialGradient');

    expect(rects).toHaveLength(2);
    expect(rects[0]!.props.fill.brushRef).toBe(linear!.props.name);
    expect(rects[1]!.props.fill.brushRef).toBe(radial!.props.name);
    // radial-gradient(120% 90% at 20% 100%) on 320×180.
    expect(radial!.props).toMatchObject({
      cx: 64,
      cy: 180,
      rx: 384,
      ry: 162,
      gradientUnits: 1,
    });
    expect(stops(radial!)).toEqual([
      { offset: 0, rgb: 0xe6c43a, alpha: 1 },
      { offset: 0.6, rgb: 0xe6c43a, alpha: 0 },
    ]);
  });

  it('blurs a glow by its blur radius', async () => {
    const fill = await renderFill(gradients.heroGlow);
    const [blur] = findAll(fill, 'RNSVGFeGaussianBlur');
    const [filter] = findAll(fill, 'RNSVGFilter');
    const [rect] = findAll(fill, 'RNSVGRect');
    expect(blur!.props.stdDeviationX).toBe(34);
    expect(blur!.props.stdDeviationY).toBe(34);
    expect(rect!.props.filter).toBe(filter!.props.name);
  });

  it('lets a glow’s blur bleed three deviations past its box, as CSS blur does', async () => {
    const fill = await renderFill(gradients.heroGlow);
    const [svg] = findAll(fill, 'RNSVGSvgView');
    const [filter] = findAll(fill, 'RNSVGFilter');
    // The last group: react-native-svg wraps the drawing in its own first.
    const group = findAll(fill, 'RNSVGGroup').at(-1);
    const [rect] = findAll(fill, 'RNSVGRect');
    expect(svg!.props.bbWidth).toBe(320 + 2 * 102);
    expect(svg!.props.bbHeight).toBe(180 + 2 * 102);
    expect(svg!.props.style).toContainEqual({ margin: -102 });
    expect(filter!.props).toMatchObject({
      x: -102,
      y: -102,
      width: 524,
      height: 384,
    });
    expect(group!.props.matrix.slice(4)).toEqual([102, 102]);
    expect(rect!.props).toMatchObject({ width: 320, height: 180 });
  });

  it('does not blur a card gradient', async () => {
    const fill = await renderFill(gradients.thisMonth);
    expect(findAll(fill, 'RNSVGFilter')).toEqual([]);
  });

  it('gives each instance its own gradient ids', async () => {
    await render(
      <>
        <GradientFill gradient={gradients.goals} testID="a" />
        <GradientFill gradient={gradients.goals} testID="b" />
      </>,
    );
    const layout = {
      nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 100 } },
    };
    await fireEvent(screen.getByTestId('a'), 'layout', layout);
    await fireEvent(screen.getByTestId('b'), 'layout', layout);
    const name = (id: string) =>
      findAll(
        screen.getByTestId(id) as unknown as Host,
        'RNSVGLinearGradient',
      )[0]!.props.name;
    expect(name('a')).not.toBe(name('b'));
  });
});

describe('GradientCard', () => {
  it('renders its children over the gradient', async () => {
    await render(
      <GradientCard gradient="thisMonth" testID="card">
        <Text>This month</Text>
      </GradientCard>,
    );
    const card = screen.getByTestId('card') as unknown as Host;
    expect(screen.getByText('This month')).toBeTruthy();
    const first = card.children[0] as Host;
    expect(first.props.pointerEvents).toBe('none');
  });

  it('has the card chrome: 6px desktop / 8px mobile radius and 18px padding', async () => {
    await render(
      <GradientCard gradient="goals" testID="card" className="flex-1" />,
    );
    expect(classes(screen.getByTestId('card'))).toEqual(
      expect.arrayContaining([
        'rounded-6',
        'ios:rounded-8',
        'p-card',
        'flex-1',
      ]),
    );
  });

  it('rounds the gradient to the mobile radius on iOS', async () => {
    await render(<GradientCard gradient="goals" testID="card" />);
    const card = screen.getByTestId('card') as unknown as Host;
    const fill = card.children[0] as Host;
    await fireEvent(fill as never, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } },
    });
    const [rect] = findAll(
      screen.getByTestId('card') as unknown as Host,
      'RNSVGRect',
    );
    expect(rect!.props.rx).toBe(tokens.card.radius.mobile);
  });

  it.each([
    'netWorthHistory',
    'thisMonth',
    'upcomingPayments',
    'shareOfAssets',
    'goals',
    'commitments',
    'portfolioHealth',
  ] as const)('renders %s', async name => {
    await render(<GradientCard gradient={name} testID="card" />);
    expect(screen.getByTestId('card')).toBeTruthy();
  });
});
