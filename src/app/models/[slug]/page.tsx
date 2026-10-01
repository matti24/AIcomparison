import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ExploreModels } from "@/components/explore";
import { NewsletterCard } from "@/components/newsletter";
import { JsonLd, PageHeader } from "@/components/ui-kit";
import {
  collections, defaultExploreState, formatPrice, formatTokens, getCollection, getProvider, modelPath, sortModels,
} from "@/lib/catalog";
import { getPageCatalog, getPageDate, getPageSummaries, siteUrl } from "@/lib/server-catalog";

type Props = PageProps<"/models/[slug]">;

function monthYear(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: "Not found", robots: { index: false } };
  const { models } = await getPageSummaries();
  const count = models.filter(collection.match).length;
  return {
    title: `${collection.heading} (${monthYear(getPageDate())}) — ${count} compared`,
    description: `${collection.description} ${count} models compared by price, context window, and capabilities.`,
    alternates: { canonical: `/models/${collection.slug}` },
    openGraph: { title: `${collection.heading} — AI Compare`, description: collection.description },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) {
    // Old single-segment model URLs moved under their provider.
    const catalog = await getPageCatalog();
    const legacy = catalog.models.find((model) => model.slug === slug);
    if (legacy) permanentRedirect(modelPath(getProvider(catalog, legacy.providerId).slug, legacy.slug));
    notFound();
  }

  const { models, providers } = await getPageSummaries();
  const matched = models.filter(collection.match);
  const live = matched.filter((model) => model.status === "active" || model.status === "preview");
  const priced = sortModels(live.filter((model) => model.input !== null), "price");
  const longest = sortModels(live.filter((model) => model.context !== null), "context");
  const newest = sortModels(live.filter((model) => model.released), "newest");
  const providerNames = [...new Set(live.map((model) => providers.find((provider) => provider.id === model.providerId)?.name).filter(Boolean))] as string[];
  const openCount = live.filter((model) => model.openness === "open-weights" || model.openness === "open-source").length;
  const apiCount = live.filter((model) => model.api === true).length;

  const faqs = [
    priced[0] && {
      q: `Which ${collection.title.toLowerCase()} model has the lowest published API input price?`,
      a: `${priced[0].name} lists ${formatPrice(priced[0].input)} per million input tokens${priced[0].output !== null ? ` and ${formatPrice(priced[0].output)} per million output tokens` : ""} at the standard tier. Total cost depends on output length, caching, and tool fees, so use the pricing calculator for your workload.`,
    },
    longest[0] && {
      q: `Which ${collection.title.toLowerCase()} model has the largest context window?`,
      a: `${longest[0].name} publishes a ${formatTokens(longest[0].context)}-token context window. Long-context requests are sometimes billed at a higher tier.`,
    },
    newest[0] && {
      q: `What is the newest ${collection.title.toLowerCase()} model in the catalog?`,
      a: `${newest[0].name}, released ${new Date(newest[0].released!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}.`,
    },
    {
      q: "Is there a single best model in this category?",
      a: "No. Results depend on your task, latency needs, budget, and data constraints. We list documented specifications and published benchmarks with their sources instead of declaring a universal winner.",
    },
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: collection.heading,
          description: collection.description,
          url: `${siteUrl()}/models/${collection.slug}`,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: live.length,
            itemListElement: sortModels(live, collection.defaultSort).slice(0, 20).map((model, index) => ({ "@type": "ListItem", position: index + 1, name: model.name, url: `${siteUrl()}${model.path}` })),
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
        },
      ]} />
      <PageHeader
        eyebrow="Category"
        title={collection.heading}
        description={collection.description}
        breadcrumbs={[{ href: "/models", label: "Models" }, { href: `/models/${collection.slug}`, label: collection.title }]}
      >
        <dl className="grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
          {[
            ["Models", String(matched.length)],
            ["Providers", String(providerNames.length)],
            ["With API", String(apiCount)],
            ["Open weights", String(openCount)],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-4 py-3">
              <dt className="stat-label">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="container-page py-8">
        <Suspense>
          <ExploreModels
            initialState={{ ...defaultExploreState, ...collection.preset, sort: collection.defaultSort, categories: [], availability: [], price: null, context: null }}
            scope={matched.map((model) => model.slug)}
            resultLabel={`${collection.title.toLowerCase()} models`}
          />
        </Suspense>

        <section className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]" aria-labelledby="about-category">
          <div className="prose max-w-none">
            <h2 id="about-category">About {collection.heading.toLowerCase()}</h2>
            <p>
              This page lists {matched.length} {collection.title.toLowerCase()} models from {providerNames.length} providers
              {providerNames.length ? ` including ${providerNames.slice(0, 6).join(", ")}` : ""}. {live.length} are currently active or in preview;
              {" "}{apiCount} offer a documented API and {openCount} publish downloadable weights.
            </p>
            {priced.length > 1 && (
              <p>
                Published standard input prices range from {formatPrice(priced[0].input)} ({priced[0].name}) to {formatPrice(priced.at(-1)!.input)} ({priced.at(-1)!.name}) per million tokens.
                Prices change often — each model page shows when its pricing was last verified.
              </p>
            )}
            <h2>Frequently asked questions</h2>
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
          <aside className="grid content-start gap-4">
            <div className="panel p-5">
              <h2 className="text-[15px]">Related categories</h2>
              <ul className="mt-3 grid gap-1.5 text-[14px]">
                {collections.filter((entry) => entry.slug !== collection.slug).slice(0, 10).map((entry) => (
                  <li key={entry.slug}><Link className="text-muted-foreground hover:text-foreground" href={`/models/${entry.slug}`}>{entry.heading}</Link></li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <div className="mt-14"><NewsletterCard source={`category-${collection.slug}`} /></div>
      </div>
    </>
  );
}
