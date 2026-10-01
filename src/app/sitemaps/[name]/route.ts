import { getCatalog } from "@/lib/catalog-store";
import { siteUrl } from "@/lib/server-catalog";
import { SITEMAPS, sitemapEntries, urlsetXml, type SitemapName } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext<"/sitemaps/[name]">) {
  const { name } = await params;
  const key = name.replace(/\.xml$/, "") as SitemapName;
  if (!name.endsWith(".xml") || !SITEMAPS.includes(key)) return new Response("Not found", { status: 404 });
  const catalog = await getCatalog();
  return new Response(urlsetXml(siteUrl(), sitemapEntries(catalog, key)), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
