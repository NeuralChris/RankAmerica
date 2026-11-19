"use client";
import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * A value that depends on the browser (time zone, today's date): the server renders `serverValue`,
 * then the browser swaps in `read()` right after hydration, with no hydration mismatch.
 * `read` must return the same primitive on repeated calls (strings and numbers are fine).
 */
export function useClientValue<T extends string | number | undefined>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noSubscribe, read, () => serverValue);
}
