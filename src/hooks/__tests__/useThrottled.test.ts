import { act, renderHook } from '@testing-library/react-native';
import { useThrottled } from '../useThrottled';

describe('useThrottled', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('passes a change after a quiet spell on at once', async () => {
    const { result, rerender } = await renderHook(
      ({ v }: { v: number }) => useThrottled(v, 80),
      { initialProps: { v: 1 } },
    );
    expect(result.current).toBe(1);
    await act(() => jest.advanceTimersByTime(200));
    await rerender({ v: 2 });
    expect(result.current).toBe(2);
  });

  it('collapses a burst to its latest value, once the interval is up', async () => {
    const { result, rerender } = await renderHook(
      ({ v }: { v: number }) => useThrottled(v, 80),
      { initialProps: { v: 1 } },
    );
    await act(() => jest.advanceTimersByTime(200));
    await rerender({ v: 2 });
    await rerender({ v: 3 });
    await rerender({ v: 4 });
    expect(result.current).toBe(2);
    await act(() => jest.advanceTimersByTime(79));
    expect(result.current).toBe(2);
    await act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe(4);
  });
});
