import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight, ArrowUpRight, Compass, ExternalLink, TrendingUp } from "lucide-react";
import { HeroSearch } from "@/components/hero-search";
import { ModelCard } from "@/components/model-card";
import { NewsletterCard } from "@/components/newsletter";
import { ProviderLogo } from "@/components/brand";
import { SponsoredSlot } from "@/components/sponsored";
import { JsonLd, SectionHead } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  catalogEvents, catalogStats, categoryShortLabels, collections, comparisonPath, eventTypeLabels, formatDate, formatPrice,
  formatTokens, isNew, popularComparisons, sortModels,
} from "@/lib/catalog";
import { getPageCatalog, getPageDate, getPageSummaries, siteUrl } from "@/lib/server-catalog";

export const metadata: Metadata = {
  title: { absolute: "AI Compare — Compare AI Models, Pricing, Context & Benchmarks" },
  description: "The AI model database. Compare GPT, Claude, Gemini, Grok, DeepSeek, Llama, Qwen and more by API pricing, context window, modalities, and benchmarks — every fact source-linked.",
  alternates: { canonical: "/" },
  openGraph: { title: "AI Compare — The AI model database", description: "Compare pricing, context windows, modalities, and benchmarks across leading AI models." },
};

export default async function HomePage() {
  const [catalog, { models, providers }] = await Promise.all([getPageCatalog(), getPageSummaries()]);
  const now = getPageDate();
  const stats = catalogStats(catalog);
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const live = models.filter((model) => model.status === "active" || model.status === "preview");

  const trending = sortModels(live.filter((model) => model.trending), "trending").slice(0, 6);
  const recent = sortModels(live.filter((model) => model.released && model.released <= now.slice(0, 10)), "newest").slice(0, 10);
  const comparisons = popularComparisons(models).slice(0, 6);
  const featured = sortModels(live.filter((model) => model.categories.some((category) => ["general", "reasoning", "coding"].includes(category))), "featured").slice(0, 10);
  const spotlight = sortModels(live, "featured").slice(0, 8);
  const events = catalogEvents(catalog, now).slice(0, 6);
  const categoryCounts = collections.slice(0, 12).map((collection) => ({ collection, count: models.filter(collection.match).length })).filter((entry) => entry.count > 0);

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AI Compare",
        url: siteUrl(),
        potentialAction: { "@type": "SearchAction", target: `${siteUrl()}/models?q={search_term_string}`, "query-input": "required name=search_term_string" },
      }} />

      <section className="hero">
        <div className="container-page text-center">
          <p className="eyebrow">The AI model database</p>
          <h1 className="mx-auto mt-4 max-w-[860px]">Compare the world&apos;s leading AI models</h1>
          <p className="sub">Compare pricing, intelligence, context windows, modalities, benchmarks, API access and more across leading AI providers.</p>
          <HeroSearch />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link href="/compare"><ArrowLeftRight size={16} /> Compare Models</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/models">Explore Models <ArrowRight size={16} /></Link></Button>
          </div>
          <p className="trust-line">
            <span>Tracking <strong>{stats.models}</strong> AI models across <strong>{stats.providers}</strong> providers</span>
            <span aria-hidden="true">·</span>
            <span><strong>{stats.sources.toLocaleString("en-US")}</strong> cited sources</span>
            <span aria-hidden="true">·</span>
            <span>Updated {formatDate(catalog.updatedAt)}</span>
          </p>
        </div>
      </section>

      <div className="container-page">
        <section className="section grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] [&>*]:min-w-0" aria-label="Market overview">
          <div>
            <SectionHead
              id="trending"
              title="Trending now"
              description="Recent launches and major updates, each linked to its announcement."
              action={<Link href="/models?sort=trending" className="text-link">All <ArrowRight size={14} /></Link>}
            />
            {trending.length ? (
              <ul className="grid gap-2 sm:grid-cols-2" aria-labelledby="trending">
                {trending.map((model) => {
                  const provider = providerById.get(model.providerId);
                  const event = catalog.models.find((entry) => entry.slug === model.slug)?.editorial.trendSource;
                  return (
                    <li key={model.slug} className="market-card">
                      <div className="flex items-center gap-2.5">
                        {provider && <ProviderLogo provider={provider} size={28} />}
                        <div className="min-w-0 flex-1">
                          <Link href={model.path} className="block truncate text-[14.5px] font-semibold hover:underline">{model.name}</Link>
                          <p className="truncate text-xs text-muted-foreground">{provider?.name} · {categoryShortLabels[model.categories[0]]}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-positive" title="Trend signal: recent official launch or update">
                          <TrendingUp size={13} aria-hidden="true" /> {model.status === "preview" ? "Preview" : isNew(model, now) ? "New" : "Active"}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[13px] text-muted-foreground">{model.trendReason}</p>
                      {event && (
                        <a href={event.url} target="_blank" rel="noopener noreferrer" className="relative inline-flex items-center gap-1 truncate text-xs text-subtle hover:text-foreground">
                          <ExternalLink size={11} aria-hidden="true" /> {event.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No source-backed trend signals right now.</p>}
            <p className="mt-3 text-xs text-muted-foreground">Trending is based on cited official launches and updates — not invented popularity. <Link href="/methodology#trending" className="underline underline-offset-2">How trending works</Link></p>
          </div>

          <div>
            <SectionHead id="popular" title="Popular comparisons" description="Current flagship versions, side by side." action={<Link href="/compare" className="text-link">Build your own <ArrowRight size={14} /></Link>} />
            <ul className="grid gap-2" aria-labelledby="popular">
              {comparisons.map((pair) => (
                <li key={pair.title}>
                  <Link href={comparisonPath(pair.models.map((model) => model.slug))} className="vs-card">
                    <span className="logo-stack">
                      {pair.models.map((model) => { const provider = providerById.get(model.providerId); return provider ? <ProviderLogo key={model.slug} provider={provider} size={30} /> : null; })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold">{pair.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{pair.models[0].name} vs {pair.models[1].name}</span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="recent">
          <SectionHead id="recent" title="Recently released" description="Newest models by official release date." action={<Link href="/releases" className="text-link">Release feed <ArrowRight size={14} /></Link>} />
          <ul className="scroll-row" aria-labelledby="recent">
            {recent.map((model) => {
              const provider = providerById.get(model.providerId);
              return (
                <li key={model.slug} className="market-card">
                  <div className="flex items-center justify-between gap-2">
                    {isNew(model, now) ? <span className="badge badge-new">New</span> : <span className="badge">{statusOrDate(model.released)}</span>}
                    <time className="text-xs text-muted-foreground tabular" dateTime={model.released ?? undefined}>{formatDate(model.released, "short")}</time>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {provider && <ProviderLogo provider={provider} size={28} />}
                    <div className="min-w-0">
                      <Link href={model.path} className="block truncate font-semibold hover:underline">{model.name}</Link>
                      <p className="truncate text-xs text-muted-foreground">{provider?.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {model.categories.slice(0, 3).map((category) => <span key={category} className="badge">{categoryShortLabels[category]}</span>)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <SponsoredSlot placements={catalog.sponsored} slot="home" now={now} />

        <section className="section" aria-labelledby="overview">
          <SectionHead id="overview" title="Frontier language models at a glance" description="Published standard API rates. Click a column on the full table to sort." action={<Link href="/models?view=table" className="text-link">Full table <ArrowRight size={14} /></Link>} />
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Flagship language models with context window and API pricing</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky-col">Model</th>
                  <th scope="col">Released</th>
                  <th scope="col" className="num">Context</th>
                  <th scope="col" className="num">Input /1M</th>
                  <th scope="col" className="num">Output /1M</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {featured.map((model) => {
                  const provider = providerById.get(model.providerId);
                  return (
                    <tr key={model.slug}>
                      <th scope="row" className="sticky-col font-normal">
                        <Link href={model.path} className="flex items-center gap-2.5 hover:underline">
                          {provider && <ProviderLogo provider={provider} size={24} />}
                          <span><span className="font-medium">{model.name}</span> <span className="text-xs text-muted-foreground">{provider?.name}</span></span>
                        </Link>
                      </th>
                      <td className="text-muted-foreground tabular">{formatDate(model.released, "short")}</td>
                      <td className="num">{formatTokens(model.context, "—")}</td>
                      <td className="num">{formatPrice(model.input, "—")}</td>
                      <td className="num">{formatPrice(model.output, "—")}</td>
                      <td className="text-right"><Link href={model.path} className="inline-flex items-center text-muted-foreground hover:text-foreground" aria-label={`View ${model.name}`}><ArrowUpRight size={15} /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section" aria-labelledby="categories">
          <SectionHead id="categories" title="Explore by category" description="Every model type, not just chatbots." />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-labelledby="categories">
            {categoryCounts.map(({ collection, count }) => (
              <li key={collection.slug}>
                <Link href={`/models/${collection.slug}`} className="vs-card h-full !py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{collection.title}</span>
                    <span className="text-xs text-muted-foreground tabular">{count} models</span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="section" aria-labelledby="spotlight">
          <SectionHead id="spotlight" title="Featured models" description="An editorial starting set across providers — not a ranking." action={<Link href="/models" className="text-link">All {stats.models} models <ArrowRight size={14} /></Link>} />
          <div className="model-grid">{spotlight.map((model) => <ModelCard key={model.slug} model={model} />)}</div>
        </section>

        <section className="section grid gap-6 lg:grid-cols-2" aria-label="Tools and updates">
          <div className="panel flex min-w-0 flex-col p-6">
            <Compass size={20} className="text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 text-xl">Find the right AI for your use case</h2>
            <p className="mt-1.5 text-[14.5px] text-muted-foreground">Answer four quick questions. Get 3–5 matches with the exact reasons they fit — no &ldquo;best model&rdquo; hype.</p>
            <div className="mt-auto flex gap-2 pt-5">
              <Button asChild><Link href="/ai-finder">Start the AI Finder <ArrowRight size={15} /></Link></Button>
              <Button asChild variant="outline"><Link href="/pricing-calculator">Estimate API cost</Link></Button>
            </div>
          </div>
          <div className="panel min-w-0 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Latest changes</h2>
              <Link href="/releases" className="text-link">All releases <ArrowRight size={14} /></Link>
            </div>
            <ul className="mt-3 divide-y">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-3 py-2.5">
                  <time className="w-16 shrink-0 pt-0.5 text-xs text-muted-foreground tabular" dateTime={event.date}>{formatDate(event.date, "short").replace(/, \d{4}$/, "")}</time>
                  <div className="min-w-0">
                    <Link href={event.modelPath} className="text-[14px] font-medium hover:underline">{event.modelName}</Link>
                    <p className="truncate text-xs text-muted-foreground">{eventTypeLabels[event.type]} · {event.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <NewsletterCard source="home" />
      </div>
    </>
  );
}

function statusOrDate(released: string | null) {
  return released ? released.slice(0, 4) : "Release";
}
