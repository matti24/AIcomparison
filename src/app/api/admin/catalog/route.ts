import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ADMIN_COOKIE, getAdminConfig, isSameOrigin, verifyAdminToken } from "@/lib/admin-auth";
import { HttpInputError, jsonResponse, readJsonBody } from "@/lib/admin-http";
import { getCatalog, getStorageMode, saveCatalog } from "@/lib/catalog-store";
import { catalogSchema } from "@/lib/catalog-schema";

export const runtime = "nodejs";

async function isAuthorized() {
  const config = getAdminConfig();
  return Boolean(config && verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value, config));
}

export async function GET() {
  try {
    if (!await isAuthorized()) return jsonResponse({ error: "Sign in to access the catalog editor." }, 401);
    return jsonResponse({ catalog: await getCatalog(), storage: getStorageMode() });
  } catch (error) {
    console.error("Admin catalog read failed:", error);
    return jsonResponse({ error: "Could not read the catalog. Check the server logs and storage configuration." }, 503);
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return jsonResponse({ error: "Publish changes from this website's own origin." }, 403);
  try {
    if (!await isAuthorized()) return jsonResponse({ error: "Your admin session has expired. Sign in again before publishing." }, 401);
    const body = z.object({ catalog: catalogSchema, expectedUpdatedAt: z.string().min(1).max(100) }).strict().safeParse(await readJsonBody(request, 4_194_304));
    if (!body.success) {
      return jsonResponse({ error: "The catalog could not be validated.", issues: body.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) }, 422);
    }
    const catalog = await saveCatalog(body.data.catalog, body.data.expectedUpdatedAt);
    revalidatePath("/", "layout");
    return jsonResponse({ catalog, storage: getStorageMode() });
  } catch (error) {
    if (error instanceof HttpInputError) return jsonResponse({ error: error.message }, error.status);
    if (error instanceof Error && (error.name === "CatalogConflictError" || error.name === "ConflictError")) {
      return jsonResponse({ error: "The catalog changed since you opened it. Export your draft, reload the published catalog, and merge your changes." }, 409);
    }
    console.error("Admin catalog publish failed:", error);
    return jsonResponse({ error: "Your changes were not published. Check server storage permissions or the database connection and try again." }, 503);
  }
}
