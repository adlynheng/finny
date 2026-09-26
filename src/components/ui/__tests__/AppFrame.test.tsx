import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { AppFrame } from '@/components/ui/AppFrame';
import { DotGrid } from '@/components/ui/DotGrid';

// Jest does not compile NativeWind, so these assert the class names; the
// tailwind.config test asserts that each frame-* name resolves to its token.
const classes = (el: { props: { className?: string } }) =>
  (el.props.className ?? '').split(/\s+/).filter(Boolean);

describe('DotGrid', () => {
  it('tiles one 1px dot at 7% ink every 14px', async () => {
    await render(<DotGrid />);
    const dot = screen.getByTestId('dot-grid-dot');
    expect(dot.props).toMatchObject({ cx: 7, cy: 7, r: 1 });

    // react-native-svg packs colours as ARGB integers: rgba(28,28,26,.07).
    const argb = dot.props.fill.payload as number;
    expect(argb % 0x1000000).toBe(0x1c1c1a);
    const alpha = Math.floor(argb / 0x1000000) / 255;
    expect(alpha).toBeCloseTo(0.07, 2);

    const pattern = dot.parent!;
    expect(pattern.type).toBe('RNSVGPattern');
    // patternUnits 1 = userSpaceOnUse: the tile is 14pt, not a fraction of the box.
    expect(pattern.props).toMatchObject({
      name: 'dot-grid',
      width: 14,
      height: 14,
      patternUnits: 1,
    });
  });

  it('fills its container and never takes touches', async () => {
    await render(<DotGrid />);
    const grid = screen.getByTestId('dot-grid');
    expect(grid.props.pointerEvents).toBe('none');
    expect(classes(grid)).toEqual(
      expect.arrayContaining(['absolute', 'inset-0']),
    );
  });
});

describe('AppFrame', () => {
  it('renders the header row and the page content', async () => {
    await render(
      <AppFrame header={<Text>Finny</Text>}>
        <Text>Page</Text>
      </AppFrame>,
    );
    expect(screen.getByText('Finny')).toBeTruthy();
    expect(screen.getByText('Page')).toBeTruthy();
  });

  it('uses the desktop frame geometry on the canvas', async () => {
    await render(
      <AppFrame header={null}>
        <Text>Page</Text>
      </AppFrame>,
    );
    expect(classes(screen.getByTestId('app-frame'))).toEqual(
      expect.arrayContaining(['flex-1', 'bg-canvas']),
    );
    expect(classes(screen.getByTestId('app-frame-header'))).toEqual(
      expect.arrayContaining([
        'h-frame-header',
        'px-frame-header-x',
        'gap-x-frame-header-gap',
        'flex-row',
        'items-center',
      ]),
    );
    expect(classes(screen.getByTestId('app-frame-content'))).toEqual(
      expect.arrayContaining([
        'flex-1',
        'min-h-0',
        'pt-frame-top',
        'px-frame-x',
        'pb-frame-bottom',
      ]),
    );
  });

  it('puts the dot grid behind everything, so presses reach the content', async () => {
    const onPress = jest.fn();
    await render(
      <AppFrame header={null}>
        <Pressable onPress={onPress}>
          <Text>Card</Text>
        </Pressable>
      </AppFrame>,
    );
    const frame = screen.getByTestId('app-frame');
    const [first] = frame.children as { props: { testID?: string } }[];
    expect(first?.props.testID).toBe('dot-grid');
    fireEvent.press(screen.getByText('Card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
