"use client";

/**
 * Privacy-friendly product analytics. Events are only sent after the visitor
 * accepts analytics cookies; no names, emails, or IP addresses are stored.
 */
import type { AnalyticsEvent } from "@/lib/analytics-events";

export type { AnalyticsEvent };
export type AnalyticsProps = Record<string, string | number | boolean | null>;

export const CONSENT_KEY = "ai-compare:consent:v1";

export function hasAnalyticsConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

function sessionId() {
  try {
    let id = sessionStorage.getItem("ai-compare:session");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("ai-compare:session", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(name: AnalyticsEvent, props: AnalyticsProps = {}) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  const body = JSON.stringify({ name, props, path: location.pathname, session: sessionId() });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // Fall through to fetch.
  }
  void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
}
