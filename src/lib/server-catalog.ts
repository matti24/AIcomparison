import "server-only";
import { cache } from "react";
import { summarizeCatalog } from "@/lib/catalog";
import { getPublicCatalog } from "@/lib/catalog-store";

export const getPageCatalog = cache(getPublicCatalog);
export const getPageDate = cache(() => new Date().toISOString());
export const getPageSummaries = cache(async () => summarizeCatalog(await getPageCatalog()));

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
