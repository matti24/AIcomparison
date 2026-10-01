import "server-only";

import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getStorageMode } from "@/lib/catalog-store";
import { requireSupabaseServerConfig } from "@/lib/deployment-config";

/**
 * Storage for product analytics, newsletter subscriptions, waitlists, and outbound
 * clicks. Local mode appends JSON lines under the data directory; Supabase mode
 * writes to the tables defined in supabase/schema.sql. No IP addresses are stored.
 */

export interface StoredEvent {
  name: string;
  props: Record<string, string | number | boolean | null>;
  path: string | null;
  session: string | null;
  at: string;
}

export interface Subscriber {
  email: string;
  source: string;
  list: "newsletter" | "pro-waitlist" | "api-waitlist";
  createdAt: string;
  status: "subscribed" | "unsubscribed";
}

async function dataDirectory() {
  const configured = process.env.AI_COMPARE_DATA_DIR?.trim();
  const runtimePath = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "node:path");
  return configured
    ? runtimePath.resolve(/* turbopackIgnore: true */ process.cwd(), configured)
    : path.join(/* turbopackIgnore: true */ process.cwd(), ".data");
}

function supabase() {
  const { url, key } = requireSupabaseServerConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let eventQueue: Promise<void> = Promise.resolve();

export async function recordEvent(event: Omit<StoredEvent, "at">) {
  const entry: StoredEvent = { ...event, at: new Date().toISOString() };
  if (getStorageMode() === "supabase") {
    const { error } = await supabase().from("analytics_events").insert({
      name: entry.name, props: entry.props, path: entry.path, session_id: entry.session, created_at: entry.at,
    });
    if (error) throw new Error(`Event insert failed (${error.code})`);
    return;
  }
  const directory = await dataDirectory();
  eventQueue = eventQueue.then(async () => {
    await mkdir(/* turbopackIgnore: true */ directory, { recursive: true });
    await appendFile(/* turbopackIgnore: true */ path.join(directory, "events.jsonl"), `${JSON.stringify(entry)}\n`, "utf8");
  }).catch((error) => console.error("Local event write failed:", error));
  await eventQueue;
}

export async function readEvents(sinceDays = 30): Promise<StoredEvent[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  if (getStorageMode() === "supabase") {
    const { data, error } = await supabase()
      .from("analytics_events")
      .select("name, props, path, session_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50_000);
    if (error) throw new Error(`Event read failed (${error.code})`);
    return (data ?? []).map((row) => ({ name: row.name, props: row.props ?? {}, path: row.path, session: row.session_id, at: row.created_at }));
  }
  try {
    const content = await readFile(/* turbopackIgnore: true */ path.join(await dataDirectory(), "events.jsonl"), "utf8");
    return content.split("\n").flatMap((line) => {
      if (!line.trim()) return [];
      try {
        const event = JSON.parse(line) as StoredEvent;
        return event.at >= since ? [event] : [];
      } catch {
        return [];
      }
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return [];
    throw error;
  }
}

let subscriberQueue: Promise<unknown> = Promise.resolve();

/** Returns false when the address is already on the list. */
export async function addSubscriber(subscriber: Omit<Subscriber, "createdAt" | "status">): Promise<boolean> {
  const email = subscriber.email.trim().toLowerCase();
  if (getStorageMode() === "supabase") {
    const { error } = await supabase().from("newsletter_subscribers").insert({ email, source: subscriber.source, list: subscriber.list, status: "subscribed" });
    if (error?.code === "23505") return false;
    if (error) throw new Error(`Subscriber insert failed (${error.code})`);
    return true;
  }
  const directory = await dataDirectory();
  const file = path.join(directory, "subscribers.json");
  const task = subscriberQueue.then(async () => {
    await mkdir(/* turbopackIgnore: true */ directory, { recursive: true });
    let list: Subscriber[] = [];
    try {
      list = JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8")) as Subscriber[];
    } catch (error) {
      if ((error as { code?: string }).code !== "ENOENT") throw error;
    }
    if (list.some((entry) => entry.email === email && entry.list === subscriber.list && entry.status === "subscribed")) return false;
    list.push({ email, source: subscriber.source, list: subscriber.list, createdAt: new Date().toISOString(), status: "subscribed" });
    const staging = `${file}.${process.pid}.tmp`;
    await writeFile(/* turbopackIgnore: true */ staging, JSON.stringify(list, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(/* turbopackIgnore: true */ staging, file);
    return true;
  });
  subscriberQueue = task.catch(() => undefined);
  return task;
}

export async function readSubscribers(): Promise<Subscriber[]> {
  if (getStorageMode() === "supabase") {
    const { data, error } = await supabase().from("newsletter_subscribers").select("email, source, list, status, created_at").order("created_at", { ascending: false }).limit(10_000);
    if (error) throw new Error(`Subscriber read failed (${error.code})`);
    return (data ?? []).map((row) => ({ email: row.email, source: row.source, list: row.list, status: row.status, createdAt: row.created_at }));
  }
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(await dataDirectory(), "subscribers.json"), "utf8")) as Subscriber[];
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return [];
    throw error;
  }
}

/* Simple in-memory limiter for public write endpoints (per hashed client key). */
const buckets = new Map<string, { count: number; reset: number }>();
export function allowRequest(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 20_000) for (const [entryKey, value] of buckets) if (value.reset <= now) buckets.delete(entryKey);
  const entry = buckets.get(key);
  if (!entry || entry.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(`${forwarded}|${request.headers.get("user-agent") ?? ""}`).digest("hex").slice(0, 32);
}
