import { act, render, screen } from '@testing-library/react-native';
import Animated, {
  getAnimatedStyle,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useEased } from '@/components/charts/useEased';

function Probe({ target }: { target: number }) {
  const value = useEased(target, 200);
  const style = useAnimatedStyle(() => ({ opacity: value.value }));
  return <Animated.View testID="probe" style={style} />;
}

const opacity = () =>
  (getAnimatedStyle(screen.getByTestId('probe')) as { opacity: number })
    .opacity;

describe('useEased', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts at its first target', async () => {
    await render(<Probe target={0.55} />);
    expect(opacity()).toBe(0.55);
  });

  it('eases to a new target over its duration', async () => {
    await render(<Probe target={1} />);
    await screen.rerender(<Probe target={0} />);
    await act(() => jest.advanceTimersByTime(100));
    expect(opacity()).toBeGreaterThan(0);
    expect(opacity()).toBeLessThan(1);
    await act(() => jest.advanceTimersByTime(150));
    expect(opacity()).toBe(0);
  });
});
