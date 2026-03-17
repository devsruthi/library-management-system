import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after
 * the user stops changing it for `delay` ms.
 * Keeps Supabase queries from firing on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
