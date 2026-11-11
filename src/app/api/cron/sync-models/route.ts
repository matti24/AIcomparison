import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { jsonResponse } from "@/lib/admin-http";
import { ConflictError, getCatalog, saveCatalog } from "@/lib/catalog-store";
import { fetchModelSources, planModelSync } from "@/lib/model-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Daily model sync, invoked by Vercel Cron (see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`. Add `?dryRun=1` to preview without saving.
 * The daily catalog read also keeps a Free-tier Supabase project from pausing.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return jsonResponse({ error: "CRON_SECRET is not configured." }, 503);
  if (!timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`))) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  let sources;
  try {
    sources = await fetchModelSources();
  } catch (error) {
    console.error("Model sync: fetching sources failed:", error);
    return jsonResponse({ error: "Model listings were unavailable; nothing changed." }, 502);
  }

  try {
    for (let attempt = 1; ; attempt += 1) {
      const current = await getCatalog();
      const plan = planModelSync(current, sources, { now: new Date() });
      const report = {
        dryRun,
        added: plan.added.map((model) => ({ id: model.id, name: model.name, provider: model.providerId, released: model.releaseDate.value })),
        priceChanges: plan.priceChanges,
        skipped: plan.skipped,
      };
      if (dryRun || (!plan.added.length && !plan.priceChanges.length)) return jsonResponse(report);
      try {
        await saveCatalog(plan.catalog, current.updatedAt);
      } catch (error) {
        // An admin published at the same moment; re-plan on top of their version once.
        if (error instanceof ConflictError && attempt < 2) continue;
        throw error;
      }
      revalidatePath("/", "layout");
      console.info(`Model sync: added ${plan.added.length}, price changes ${plan.priceChanges.length}.`);
      return jsonResponse(report);
    }
  } catch (error) {
    console.error("Model sync failed:", error);
    return jsonResponse({ error: "The catalog could not be updated. Check the server logs." }, 503);
  }
}
