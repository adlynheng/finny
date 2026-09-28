import { render, screen } from '@testing-library/react-native';
import { Glass } from '@/components/ui/Glass';
import type { GlassName } from '@/theme/tokens';
import { blurred, describeGlass } from '../../../../test/glassCases';

// Jest resolves Glass.tsx, the iOS implementation (the preset's default
// platform); Glass.macos.test.tsx covers the macOS one. expo-blur's BlurView is
// mocked in test/jestSetup.js as a View that keeps its props.

describe('Glass on iOS', () => {
  describeGlass(Glass);

  it.each(blurred)('%s: blurs with expo-blur', async recipe => {
    await render(<Glass recipe={recipe} />);
    expect(screen.getByTestId('glass-blur')).toBeTruthy();
  });

  it('blurs with expo-blur, harder for a larger recipe blur', async () => {
    const intensityOf = async (recipe: GlassName) => {
      const { unmount } = await render(<Glass recipe={recipe} />);
      const blur = screen.getByTestId('glass-blur');
      expect(blur.props.tint).toBe('default');
      const intensity = blur.props.intensity as number;
      await unmount();
      return intensity;
    };
    // card 20 > chip 18 > onGradient 12 > modalScrim 8 > sheetScrim 6
    const order: number[] = [];
    for (const recipe of [
      'card',
      'chip',
      'onGradient',
      'modalScrim',
      'sheetScrim',
    ] as const) {
      order.push(await intensityOf(recipe));
    }
    expect([...order].sort((a, b) => b - a)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
    expect(Math.max(...order)).toBeLessThanOrEqual(100);
    expect(Math.min(...order)).toBeGreaterThan(0);
  });
});
