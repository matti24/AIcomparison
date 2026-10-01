import "server-only";
import { collections, comparisonPath, indexableComparisons, modelPath, summarizeCatalog } from "@/lib/catalog";
import type { Catalog } from "@/lib/types";

export const SITEMAPS = ["models", "providers", "comparisons", "categories", "content"] as const;
export type SitemapName = (typeof SITEMAPS)[number];

interface Entry { path: string; lastModified?: string; priority?: number }

function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function sitemapEntries(catalog: Catalog, name: SitemapName): Entry[] {
  const providerSlug = new Map(catalog.providers.map((provider) => [provider.id, provider.slug]));
  switch (name) {
    case "models":
      return catalog.models.map((model) => ({ path: modelPath(providerSlug.get(model.providerId)!, model.slug), lastModified: model.updatedAt, priority: model.status === "retired" ? 0.3 : 0.8 }));
    case "providers":
      return [{ path: "/providers", lastModified: catalog.updatedAt }, ...catalog.providers.map((provider) => ({ path: `/providers/${provider.slug}`, lastModified: provider.updatedAt, priority: 0.7 }))];
    case "comparisons": {
      const { models } = summarizeCatalog(catalog);
      return indexableComparisons(models).map((slugs) => ({ path: comparisonPath(slugs), lastModified: catalog.updatedAt, priority: 0.6 }));
    }
    case "categories":
      return collections.map((collection) => ({ path: `/models/${collection.slug}`, lastModified: catalog.updatedAt, priority: 0.7 }));
    case "content":
      return ["/", "/models", "/compare", "/benchmarks", "/releases", "/pricing-calculator", "/ai-finder", "/methodology", "/about", "/changelog", "/pricing", "/api", "/contact", "/privacy", "/terms", "/cookies", "/affiliate-disclosure", "/advertising-disclosure"]
        .map((path) => ({ path, lastModified: catalog.updatedAt, priority: path === "/" ? 1 : 0.5 }));
  }
}

export function urlsetXml(origin: string, entries: Entry[]) {
  const body = entries.map((entry) => `  <url><loc>${escape(`${origin}${entry.path}`)}</loc>${entry.lastModified ? `<lastmod>${escape(new Date(entry.lastModified).toISOString())}</lastmod>` : ""}${entry.priority !== undefined ? `<priority>${entry.priority.toFixed(1)}</priority>` : ""}</url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function indexXml(origin: string, lastModified: string) {
  const body = SITEMAPS.map((name) => `  <sitemap><loc>${escape(`${origin}/sitemaps/${name}.xml`)}</loc><lastmod>${escape(new Date(lastModified).toISOString())}</lastmod></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}
