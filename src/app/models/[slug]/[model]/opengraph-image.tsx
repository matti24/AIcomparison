import { formatPrice, formatTokens, getProvider } from "@/lib/catalog";
import { modelImage, ogSize, siteImage } from "@/lib/og";
import { getPageCatalog } from "@/lib/server-catalog";

export const alt = "AI model profile on AI Compare";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; model: string }> }) {
  const { model: slug } = await params;
  const catalog = await getPageCatalog();
  const model = catalog.models.find((entry) => entry.slug === slug);
  if (!model) return siteImage("AI model database", "AI Compare");
  const facts = [
    model.contextWindow.value !== null ? `${formatTokens(model.contextWindow.value)} context` : null,
    model.pricing.input.value !== null ? `${formatPrice(model.pricing.input.value)} / 1M in` : null,
    model.pricing.output.value !== null ? `${formatPrice(model.pricing.output.value)} / 1M out` : null,
  ].filter((fact): fact is string => Boolean(fact));
  return modelImage(model.name, getProvider(catalog, model.providerId), facts);
}
