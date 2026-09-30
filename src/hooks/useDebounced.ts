import { useEffect, useState } from 'react';

/**
 * `value` once it has held still for `ms`: each change restarts the wait, so
 * a burst of typing passes on only its end. For a search that should not run
 * on every keystroke.
 */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
