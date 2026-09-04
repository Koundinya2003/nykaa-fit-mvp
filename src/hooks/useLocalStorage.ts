import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State mirrored into localStorage. Reads are lazy and guarded, because the
 * storage API throws in private-mode Safari and can hold stale JSON from an
 * older build — in both cases we fall back to the initial value rather than
 * crashing the app.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      /* Quota or private mode — the app still works, it just won't persist. */
    }
  }, [value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}
