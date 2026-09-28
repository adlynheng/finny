import { useEffect } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * A shared value that eases to `target` whenever it changes, as a CSS
 * `transition` would. It starts at its first target without animating.
 */
export function useEased(target: number, durationMs: number) {
  const value = useSharedValue(target);
  useEffect(() => {
    value.value = withTiming(target, { duration: durationMs });
  }, [target, durationMs, value]);
  return value;
}
