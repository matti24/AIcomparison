import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ProviderLogo } from "@/components/brand";
import { ComparisonView } from "@/components/comparison-view";
import { NewsletterCard } from "@/components/newsletter";
import { SponsoredSlot } from "@/components/sponsored";
import { Breadcrumbs, JsonLd } from "@/components/ui-kit";
import {
  canonicalComparisonSlugs, comparisonPath, formatDate, getProvider, indexableComparisons, latestPriceCheck, popularComparisons, resolveComparison,
} from "@/lib/catalog";
import { comparisonFaq, comparisonNarrative } from "@/lib/comparison-content";
import { getPageCatalog, getPageDate, getPageSummaries } from "@/lib/server-catalog";

type Props = PageProps<"/compare/[slug]">;

const subnav = [
  ["overview", "Overview"], ["pricing", "Pricing"], ["capabilities", "Capabilities"], ["benchmarks", "Benchmarks"],
  ["context", "Context"], ["api", "API"], ["multimodal", "Multimodal"], ["calculator", "Calculator"], ["summary-overview", "Summary"],
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getPageCatalog();
  const models = resolveComparison(catalog, slug);
  if (!models) return { title: "Comparison not found", robots: { index: false } };
  const { models: summaries } = await getPageSummaries();
  const names = models.map((model) => model.name).join(" vs ");
  const canonicalSlugs = canonicalComparisonSlugs(models.map((model) => model.slug));
  const canonical = comparisonPath(canonicalSlugs);
  const indexable = indexableComparisons(summaries).some((entry) => entry.join("|") === canonicalSlugs.join("|"));
  return {
    title: `${names}: Pricing, Context & Benchmarks Compared`,
    description: `${names} side by side: API pricing, context window, modalities, tool use, benchmarks, and availability — every value linked to its official source.`,
    alternates: { canonical },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: { title: `${names} — AI Compare`, description: "Pricing • Context • Capabilities • Benchmarks", url: canonical },
    twitter: { card: "summary_large_image", title: `${names} — AI Compare` },
  };
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  const catalog = await getPageCatalog();
  const models = resolveComparison(catalog, slug);
  if (!models) notFound();
  const { models: summaries } = await getPageSummaries();
  const providers = [...new Map(models.map((model) => [model.providerId, getProvider(catalog, model.providerId)])).values()];
  const providerMap = new Map(catalog.providers.map((provider) => [provider.id, provider]));
  const usedBenchmarks = new Set(models.flatMap((model) => model.benchmarks.map((result) => result.benchmarkId)));
  const narrative = comparisonNarrative(models, providerMap);
  const faq = comparisonFaq(models);
  const priceChecked = models.map(latestPriceCheck).filter(Boolean).sort().at(-1) ?? null;
  const names = models.map((model) => model.name);
  const related = popularComparisons(summaries)
    .filter((pair) => pair.models.some((model) => models.some((entry) => entry.slug === model.slug)) || pair.models.some((model) => models.some((entry) => entry.providerId === model.providerId)))
    .filter((pair) => pair.models.map((model) => model.slug).join() !== models.map((model) => model.slug).join())
    .slice(0, 6);

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
      }} />
      <header className="page-header !pb-6">
        <div className="container-page">
          <Breadcrumbs items={[{ href: "/compare", label: "Compare" }, { href: comparisonPath(models.map((model) => model.slug)), label: names.join(" vs ") }]} className="mb-5" />
          <h1 className="flex flex-wrap items-center gap-x-4 gap-y-3 !text-[clamp(24px,3.4vw,38px)]">
            {models.map((model, index) => (
              <span key={model.slug} className="inline-flex items-center gap-3">
                {index > 0 && <span className="text-[0.6em] font-medium text-subtle">vs</span>}
                <ProviderLogo provider={providerMap.get(model.providerId)!} size={40} />
                <span>{model.name}</span>
              </span>
            ))}
          </h1>
          <p className="lede">
            Side-by-side pricing, context, capabilities, and benchmarks. Every cell links to its source.
            {priceChecked && <> Pricing last verified {formatDate(priceChecked)}.</>}
          </p>
        </div>
      </header>

      <nav className="subnav" aria-label="Comparison sections">
        <div className="container-page subnav-inner">
          {subnav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </div>
      </nav>

      <ComparisonView models={models} providers={providers} benchmarks={catalog.benchmarks.filter((benchmark) => usedBenchmarks.has(benchmark.id))} />

      <div className="container-page">
        <div className="mt-12"><SponsoredSlot placements={catalog.sponsored} slot="comparison" now={getPageDate()} /></div>

        <section className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]" aria-label="Comparison summary">
          <article className="prose max-w-none">
            {narrative.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-[120px]">
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
            <h2>Frequently asked questions</h2>
            {faq.map((item) => (
              <div key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
            <p className="text-sm text-muted-foreground">This summary is generated from the structured, source-linked data above. If a value is not disclosed by the provider, we say so rather than estimate it.</p>
          </article>
          <aside className="grid content-start gap-4">
            <div className="panel p-5">
              <h2 className="text-[15px]">Related comparisons</h2>
              <ul className="mt-3 grid gap-2">
                {related.map((pair) => (
                  <li key={pair.title}>
                    <Link href={comparisonPath(pair.models.map((model) => model.slug))} className="flex items-center justify-between gap-2 text-[14px] text-muted-foreground hover:text-foreground">
                      <span className="truncate">{pair.models[0].name} vs {pair.models[1].name}</span>
                      <ArrowRight size={13} className="shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel p-5">
              <h2 className="text-[15px]">Model pages</h2>
              <ul className="mt-3 grid gap-2">
                {models.map((model) => {
                  const summary = summaries.find((entry) => entry.slug === model.slug);
                  return <li key={model.slug}><Link href={summary?.path ?? "/models"} className="text-[14px] text-muted-foreground hover:text-foreground">{model.name} specs & sources</Link></li>;
                })}
              </ul>
            </div>
          </aside>
        </section>

        <div className="mt-14"><NewsletterCard source="comparison" /></div>
      </div>
    </>
  );
}
