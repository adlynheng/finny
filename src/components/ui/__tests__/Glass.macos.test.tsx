import { render, screen } from '@testing-library/react-native';
import { Glass } from '@/components/ui/Glass.macos';
import { blurred, describeGlass } from '../../../../test/glassCases';

// expo-blur has no macOS support and Expo is not linked into the macOS app
// (Phase A spike report §2), so the macOS Glass must never load it. It blurs
// with Finny's own NSVisualEffectView view instead (macos/FinnyBlur).
jest.mock('expo-blur', () => {
  throw new Error('Glass.macos must not import expo-blur');
});

describe('Glass on macOS', () => {
  describeGlass(Glass);

  // NSVisualEffectView blurs at one fixed, large radius under its own tint, so
  // each recipe takes whichever reading of it looks closest to the design.
  it.each(['chip', 'navPill', 'card', 'modalScrim'] as const)(
    '%s: blurs with the native view in the light popover material',
    async recipe => {
      await render(<Glass recipe={recipe} />);
      const blur = screen.getByTestId('glass-blur');
      expect(blur.type).toBe('FinnyBlurView');
      expect(blur.props).toMatchObject({
        material: 'popover',
        appearance: 'light',
      });
      // RCTViewManager aborts setting pointerEvents on a non-React view.
      expect(blur.props.pointerEvents).toBeUndefined();
    },
  );

  it('sheetScrim: blurs in the dark material, so the scrim darkens', async () => {
    await render(<Glass recipe="sheetScrim" />);
    expect(screen.getByTestId('glass-blur').props).toMatchObject({
      material: 'popover',
      appearance: 'dark',
    });
  });

  it.each(['onGradient', 'onGradientTray', 'tooltip'] as const)(
    '%s: keeps only its faint fill, as a light material would grey out the gradient',
    async recipe => {
      await render(<Glass recipe={recipe} />);
      expect(screen.queryByTestId('glass-blur')).toBeNull();
      expect(screen.getByTestId('glass-fill')).toBeTruthy();
    },
  );

  it('covers every blurred recipe', () => {
    expect([...blurred].sort()).toEqual(
      [
        'bottomBar',
        'card',
        'chip',
        'modalScrim',
        'navPill',
        'onGradient',
        'onGradientTray',
        'sheetScrim',
        'tooltip',
      ].sort(),
    );
  });
});
