"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Theme-dependent controls must share the same first render on server and client. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
