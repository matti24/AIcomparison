import { getCatalog } from "@/lib/catalog-store";
import { siteUrl } from "@/lib/server-catalog";
import { indexXml } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getCatalog();
  return new Response(indexXml(siteUrl(), catalog.updatedAt), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
