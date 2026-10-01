import type { Metadata } from "next";
import Link from "next/link";
import { ProviderLogo } from "@/components/brand";
import { PricingCalculatorView } from "@/components/pricing-calculator-view";
import { PageHeader } from "@/components/ui-kit";
import { formatDate, formatPrice, formatTokens, sortModels } from "@/lib/catalog";
import { getPageSummaries } from "@/lib/server-catalog";

export const metadata: Metadata = {
  title: "AI API Pricing Calculator — Compare LLM Costs per Month",
  description: "Estimate cost per request, per day, and per month across GPT, Claude, Gemini, Grok, DeepSeek, and more using official per-token API prices. Includes cached-input pricing.",
  alternates: { canonical: "/pricing-calculator" },
};

export default async function PricingCalculatorPage() {
  const { models, providers } = await getPageSummaries();
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const priced = models.filter((model) => model.input !== null && model.output !== null && (model.status === "active" || model.status === "preview"));
  const initial = sortModels(priced, "featured").filter((model, index, list) => list.findIndex((entry) => entry.providerId === model.providerId) === index).slice(0, 5).map((model) => model.slug);
  const table = sortModels(priced, "price");
  const latest = priced.map((model) => model.priceCheckedAt).filter(Boolean).sort().at(-1);

  return (
    <>
      <PageHeader
        eyebrow="API pricing"
        title="AI API pricing calculator"
        description="Enter your tokens per request and daily volume. We calculate cost per request, per day, and per month from each provider's published standard rates."
        breadcrumbs={[{ href: "/pricing-calculator", label: "Pricing calculator" }]}
      />
      <div className="container-page py-8">
        <PricingCalculatorView initial={initial} />

        <section className="mt-14" aria-labelledby="price-table">
          <div className="section-head">
            <div>
              <h2 id="price-table">All per-token API prices</h2>
              <p>{table.length} active models, sorted by input price. {latest && <>Pricing last verified {formatDate(latest)}.</>}</p>
            </div>
          </div>
          <div className="table-wrap max-h-[70vh]">
            <table className="data-table">
              <caption className="sr-only">Published API prices per million tokens</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky-col">Model</th>
                  <th scope="col" className="num">Input /1M</th>
                  <th scope="col" className="num">Cached /1M</th>
                  <th scope="col" className="num">Output /1M</th>
                  <th scope="col" className="num">Context</th>
                  <th scope="col">Verified</th>
                </tr>
              </thead>
              <tbody>
                {table.map((model) => {
                  const provider = providerById.get(model.providerId);
                  return (
                    <tr key={model.slug}>
                      <th scope="row" className="sticky-col font-normal">
                        <Link href={model.path} className="flex items-center gap-2 hover:underline">
                          {provider && <ProviderLogo provider={provider} size={22} />}
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{provider?.name}</span>
                        </Link>
                      </th>
                      <td className="num">{formatPrice(model.input)}</td>
                      <td className="num">{formatPrice(model.cachedInput, "—")}</td>
                      <td className="num">{formatPrice(model.output)}</td>
                      <td className="num">{formatTokens(model.context, "—")}</td>
                      <td className="text-xs text-muted-foreground tabular">{formatDate(model.priceCheckedAt, "short")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Standard tier, USD. Some providers charge more for long prompts, priority processing, or regional endpoints and less for batch. Notes on each model page explain tiers; third-party hosted prices are labeled as such.</p>
        </section>
      </div>
    </>
  );
}
