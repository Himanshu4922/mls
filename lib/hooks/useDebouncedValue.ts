"use client";

import { useEffect, useState } from "react";

/**
 * `value`, delayed until it has stopped changing for `ms`.
 *
 * Feed the result into a query key: TanStack then owns fetching, caching and
 * cancelling (via `signal`), and the component only owns "what the user typed
 * or where the map is". Replaces the hand-written setTimeout/AbortController
 * pairs that each search box and the map used to carry.
 */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
