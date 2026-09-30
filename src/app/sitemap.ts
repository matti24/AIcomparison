import type { MetadataRoute } from "next";
import { getPageCatalog } from "@/lib/server-catalog";
import { comparisonPath, suggestedComparisons } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const catalog = await getPageCatalog();
  return [
    ...["", "/models", "/compare", "/companies", "/trending", "/finder", "/methodology"].map((path) => ({ url: `${origin}${path}`, lastModified: catalog.updatedAt })),
    ...catalog.models.map((model) => ({ url: `${origin}/models/${model.slug}`, lastModified: model.updatedAt })),
    ...catalog.providers.map((provider) => ({ url: `${origin}/companies/${provider.slug}`, lastModified: provider.updatedAt })),
    ...suggestedComparisons(catalog).map((pair) => ({ url: `${origin}${comparisonPath(pair.models.map((model) => model.slug))}`, lastModified: catalog.updatedAt })),
  ];
}
