import { z } from "zod";
import { HttpInputError, jsonResponse, readJsonBody } from "@/lib/admin-http";
import { addSubscriber, allowRequest, clientKey } from "@/lib/event-store";

export const runtime = "nodejs";

const schema = z.strictObject({
  email: z.email().max(254),
  source: z.string().regex(/^[a-z0-9-]{1,60}$/),
});

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return jsonResponse({ message: "Please subscribe from this website." }, 403);
  if (!allowRequest(`newsletter:${clientKey(request)}`, 8, 60 * 60_000)) {
    return jsonResponse({ message: "Too many attempts. Please try again later." }, 429);
  }
  try {
    const parsed = schema.safeParse(await readJsonBody(request, 2_048));
    if (!parsed.success) return jsonResponse({ message: "Please enter a valid email address." }, 422);
    const added = await addSubscriber({ email: parsed.data.email, source: parsed.data.source, list: "newsletter" });
    return jsonResponse({ message: added ? "You're subscribed to The AI Model Brief." : "You're already subscribed — thanks!" });
  } catch (error) {
    if (error instanceof HttpInputError) return jsonResponse({ message: error.message }, error.status);
    console.error("Newsletter subscription failed:", error);
    return jsonResponse({ message: "We couldn't save your subscription right now. Please try again shortly." }, 503);
  }
}
