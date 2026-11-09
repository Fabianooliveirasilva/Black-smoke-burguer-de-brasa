"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
/** True only after hydration — guards UI that depends on localStorage. */
export function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
