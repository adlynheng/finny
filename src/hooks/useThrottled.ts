import { useEffect, useRef, useState } from 'react';

/**
 * `value`, passed on at most once every `ms`: a change after a quiet spell
 * goes through at once, and changes during a burst collapse to the latest,
 * which follows when the interval is up. For a costly view that has to keep
 * pace with a drag (the Planner's dial) without costing every frame.
 */
export function useThrottled<T>(value: T, ms: number): T {
  const [shown, setShown] = useState(value);
  const latest = useRef(value);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  latest.current = value;

  useEffect(() => {
    if (timer.current !== null) {
      return;
    }
    const wait = last.current + ms - Date.now();
    const flush = () => {
      timer.current = null;
      last.current = Date.now();
      setShown(latest.current);
    };
    if (wait <= 0) {
      flush();
    } else {
      timer.current = setTimeout(flush, wait);
    }
  }, [value, ms]);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );
  return shown;
}
