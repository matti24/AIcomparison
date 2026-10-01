import { z } from "zod";
import { HttpInputError, jsonResponse, readJsonBody } from "@/lib/admin-http";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { allowRequest, clientKey, recordEvent } from "@/lib/event-store";

export const runtime = "nodejs";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

const schema = z.strictObject({
  name: z.enum(ANALYTICS_EVENTS),
  props: z.record(z.string().max(40), z.union([z.string().max(160), z.number().finite(), z.boolean(), z.null()]))
    .refine((value) => Object.keys(value).length <= 12, "Too many properties"),
  path: z.string().max(300).startsWith("/").nullable(),
  session: z.uuid().nullable(),
});

export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  if (request.headers.get("sec-fetch-site") === "cross-site") return jsonResponse({ error: "Forbidden" }, 403);
  if (!allowRequest(`events:${clientKey(request)}`, 240, 60_000)) return jsonResponse({ error: "Too many events" }, 429);
  try {
    const parsed = schema.safeParse(await readJsonBody(request, 4_096));
    if (!parsed.success) return jsonResponse({ error: "Invalid event" }, 422);
    await recordEvent(parsed.data);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof HttpInputError) return jsonResponse({ error: error.message }, error.status);
    console.error("Event recording failed:", error);
    // Analytics must never break the page; swallow storage failures.
    return new Response(null, { status: 204 });
  }
}
