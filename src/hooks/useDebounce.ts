import { useEffect, useState } from 'react';

/** Delays a value so a fast typist does not re-run the search on every key. */
export function useDebounce<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
