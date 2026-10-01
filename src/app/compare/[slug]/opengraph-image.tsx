import { comparisonImage, ogSize, siteImage } from "@/lib/og";
import { getProvider, resolveComparison } from "@/lib/catalog";
import { getPageCatalog } from "@/lib/server-catalog";

export const alt = "AI model comparison on AI Compare";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getPageCatalog();
  const models = resolveComparison(catalog, slug);
  if (!models) return siteImage("Compare AI models side by side", "AI Compare");
  return comparisonImage(models.map((model) => ({ name: model.name, provider: getProvider(catalog, model.providerId) })));
}
