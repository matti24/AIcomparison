"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

interface Snapshot<T> {
  value: T;
  error: string | null;
}

export function createBrowserStore<T>(
  key: string,
  initial: T,
  validate: (value: unknown) => value is T,
) {
  const serverSnapshot: Snapshot<T> = { value: initial, error: null };
  let cachedRaw: string | null | undefined;
  let cachedSnapshot = serverSnapshot;
  let reportedError: string | null = null;
  const eventName = `ai-compare:${key}`;

  function getSnapshot(): Snapshot<T> {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Browser storage is unavailable.";
      if (cachedSnapshot.error !== message) cachedSnapshot = { value: initial, error: message };
      return cachedSnapshot;
    }
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    if (raw === null) {
      cachedSnapshot = serverSnapshot;
      return cachedSnapshot;
    }
    try {
      const value: unknown = JSON.parse(raw);
      if (!validate(value)) throw new Error("Stored data has an invalid format.");
      cachedSnapshot = { value, error: null };
    } catch (error) {
      cachedSnapshot = {
        value: initial,
        error: error instanceof Error ? error.message : "Could not read stored data.",
      };
    }
    return cachedSnapshot;
  }

  function subscribe(callback: () => void) {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) callback();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(eventName, callback);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(eventName, callback);
    };
  }

  function setValue(update: T | ((previous: T) => T)) {
    const next = typeof update === "function"
      ? (update as (previous: T) => T)(getSnapshot().value)
      : update;
    if (!validate(next)) throw new Error("Unable to save invalid browser data.");
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(eventName));
  }

  return function useBrowserStore() {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
    useEffect(() => {
      if (snapshot.error && snapshot.error !== reportedError) {
        reportedError = snapshot.error;
        toast.error("Your saved browser data could not be loaded.", {
          description: "Check browser storage permissions. Saving again will replace any invalid data.",
        });
      }
    }, [snapshot.error]);
    const update = useCallback(setValue, []);
    return [snapshot.value, update] as const;
  };
}
