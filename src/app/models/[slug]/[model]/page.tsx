import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ModelProfile } from "@/components/model-profile";
import { JsonLd } from "@/components/ui-kit";
import { formatPrice, formatTokens, getProvider, modelPath, toModelSummary } from "@/lib/catalog";
import { getPageCatalog, getPageDate, getPageSummaries, siteUrl } from "@/lib/server-catalog";

type Props = PageProps<"/models/[slug]/[model]">;

async function resolve(params: Props["params"]) {
  const { slug: providerSlug, model: modelSlug } = await params;
  const catalog = await getPageCatalog();
  const model = catalog.models.find((entry) => entry.slug === modelSlug);
  if (!model) return { catalog, model: null, provider: null, providerSlug };
  return { catalog, model, provider: getProvider(catalog, model.providerId), providerSlug };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { model, provider } = await resolve(params);
  if (!model || !provider) return { title: "Model not found", robots: { index: false } };
  const facts = [
    model.contextWindow.value ? `${formatTokens(model.contextWindow.value)} context` : null,
    model.pricing.input.value !== null ? `${formatPrice(model.pricing.input.value)}/1M input` : null,
    model.pricing.output.value !== null ? `${formatPrice(model.pricing.output.value)}/1M output` : null,
  ].filter(Boolean).join(", ");
  const path = modelPath(provider.slug, model.slug);
  return {
    title: `${model.name} — Pricing, Context Window, Benchmarks & API`,
    description: `${model.name} by ${provider.name}${facts ? `: ${facts}` : ""}. ${model.description}`.slice(0, 300),
    alternates: { canonical: path },
    openGraph: { type: "article", title: `${model.name} by ${provider.name} — AI Compare`, description: model.description, url: path },
    twitter: { card: "summary_large_image", title: `${model.name} — AI Compare`, description: model.description },
  };
}

export default async function ModelPage({ params }: Props) {
  const { catalog, model, provider, providerSlug } = await resolve(params);
  if (!model || !provider) notFound();
  if (provider.slug !== providerSlug) permanentRedirect(modelPath(provider.slug, model.slug));

  const { models } = await getPageSummaries();
  const summary = toModelSummary(catalog, model);
  const link = catalog.links.find((entry) => entry.targetType === "model" && entry.targetId === model.id && entry.enabled) ?? null;
  const url = `${siteUrl()}${summary.path}`;

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: model.name,
        applicationCategory: "Artificial intelligence model",
        operatingSystem: "Cloud API",
        url,
        description: model.description,
        softwareVersion: model.version,
        author: { "@type": "Organization", name: provider.name, url: provider.website },
        ...(model.releaseDate.value ? { datePublished: model.releaseDate.value } : {}),
        ...(model.pricing.input.value !== null ? {
          offers: { "@type": "Offer", price: model.pricing.input.value, priceCurrency: "USD", description: "Standard API input price per 1M tokens" },
        } : {}),
      }} />
      <ModelProfile catalog={catalog} model={model} provider={provider} summary={summary} summaries={models} link={link} now={getPageDate()} />
    </>
  );
}
