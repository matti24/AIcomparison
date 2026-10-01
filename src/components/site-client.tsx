"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CONSENT_KEY, track } from "@/lib/analytics";
import { useHydrated } from "@/lib/use-hydrated";

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  return (
    <label className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
      Theme
      <select className="field !h-8 !w-auto !text-[13px]" value={hydrated ? theme ?? "system" : "system"} onChange={(event) => setTheme(event.target.value)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}

const CONSENT_EVENT = "ai-compare:consent-changed";

function subscribeConsent(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) ?? "unset";
  } catch {
    // Storage disabled: never show the banner; no analytics can be sent anyway.
    return "unavailable";
  }
}

/** Opt-in consent for non-essential analytics. Essential storage (favorites, comparisons) needs no consent. */
export function CookieConsent() {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => "server");
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener("ai-compare:open-consent", reopen);
    return () => window.removeEventListener("ai-compare:open-consent", reopen);
  }, []);

  function choose(value: "granted" | "denied") {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Ignore; the banner simply closes.
    }
    setReopened(false);
    window.dispatchEvent(new Event(CONSENT_EVENT));
    if (value === "granted") track("page_view", {});
  }

  if (consent !== "unset" && !reopened) return null;
  return (
    <div className="consent" role="dialog" aria-live="polite" aria-label="Cookie preferences">
      <p className="font-medium">Help us improve AI Compare?</p>
      <p className="mt-1 text-muted-foreground">
        We&apos;d like to use privacy-friendly analytics (no ads, no cross-site tracking) to see which models and comparisons are useful.
        Favorites and comparisons are stored only in your browser and work either way. <Link href="/cookies" className="underline underline-offset-2">Cookie policy</Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => choose("granted")}>Accept analytics</Button>
        <Button size="sm" variant="outline" onClick={() => choose("denied")}>Decline</Button>
      </div>
    </div>
  );
}

export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view", {});
  }, [pathname]);
  return null;
}

export function ConsentSettingsButton() {
  return (
    <button type="button" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={() => window.dispatchEvent(new Event("ai-compare:open-consent"))}>
      Cookie settings
    </button>
  );
}
