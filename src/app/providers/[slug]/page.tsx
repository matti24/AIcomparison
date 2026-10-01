import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { ProviderLogo } from "@/components/brand";
import { ModelCard, WatchButton } from "@/components/model-card";
import { NewsletterCard } from "@/components/newsletter";
import { SponsoredSlot } from "@/components/sponsored";
import { JsonLd, PageHeader } from "@/components/ui-kit";
import { categoryLabels, formatDate, sortModels, type ModelSummary } from "@/lib/catalog";
import { getPageCatalog, getPageDate, getPageSummaries, siteUrl } from "@/lib/server-catalog";
import type { ModelCategory } from "@/lib/types";

type Props = PageProps<"/providers/[slug]">;

const GROUPS: { title: string; categories: ModelCategory[] }[] = [
  { title: "General & reasoning", categories: ["general", "reasoning", "coding", "agentic", "multimodal", "vision", "computer-use"] },
  { title: "Image", categories: ["image-generation", "image-editing"] },
  { title: "Video", categories: ["video-generation"] },
  { title: "Voice & audio", categories: ["speech-to-text", "text-to-speech", "realtime-voice", "music-generation"] },
  { title: "Embeddings & retrieval", categories: ["embeddings", "ocr"] },
  { title: "Research & search", categories: ["search"] },
  { title: "Safety & robotics", categories: ["moderation", "robotics"] },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getPageCatalog();
  const provider = catalog.providers.find((entry) => entry.slug === slug);
  if (!provider) return { title: "Provider not found", robots: { index: false } };
  const count = catalog.models.filter((model) => model.providerId === provider.id).length;
  return {
    title: `${provider.name} AI Models — ${count} Models, Pricing & Timeline`,
    description: `All ${provider.name} models: active, preview, open-weight, and deprecated versions with API pricing, context windows, and release history. ${provider.description}`.slice(0, 300),
    alternates: { canonical: `/providers/${provider.slug}` },
  };
}

export default async function ProviderPage({ params }: Props) {
  const { slug } = await params;
  const catalog = await getPageCatalog();
  const provider = catalog.providers.find((entry) => entry.slug === slug);
  if (!provider) notFound();
  const { models: summaries } = await getPageSummaries();
  const models = sortModels(summaries.filter((model) => model.providerId === provider.id), "newest");
  const live = models.filter((model) => model.status === "active");
  const preview = models.filter((model) => model.status === "preview");
  const open = models.filter((model) => model.openness === "open-weights" || model.openness === "open-source");
  const legacy = models.filter((model) => model.status === "deprecated" || model.status === "retired");
  const byYear = new Map<string, ModelSummary[]>();
  for (const model of sortModels(models.filter((entry) => entry.released), "newest")) {
    const year = model.released!.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), model]);
  }
  const groups = GROUPS.map((group) => ({ ...group, models: models.filter((model) => group.categories.includes(model.categories[0])) })).filter((group) => group.models.length);

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: provider.name,
        url: provider.website,
        description: provider.description,
        ...(provider.founded ? { foundingDate: String(provider.founded) } : {}),
        ...(provider.country ? { location: provider.country } : {}),
        sameAs: [provider.website],
        mainEntityOfPage: `${siteUrl()}/providers/${provider.slug}`,
      }} />
      <PageHeader
        breadcrumbs={[{ href: "/providers", label: "Providers" }, { href: `/providers/${provider.slug}`, label: provider.name }]}
        title={<span className="flex items-center gap-4"><ProviderLogo provider={provider} size={52} />{provider.name}</span>}
        description={provider.description}
      >
        <div className="flex flex-wrap items-center gap-2">
          <a href={provider.website} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium shadow-[var(--shadow-sm)] hover:bg-surface-2">
            Official website <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <WatchButton type="provider" id={provider.id} name={provider.name} />
        </div>
        <dl className="mt-5 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-5">
          {[
            ["Type", provider.kind === "lab" ? "AI lab" : "Platform"],
            ["Country", provider.country ?? "Not disclosed"],
            ["Founded", provider.founded ? String(provider.founded) : "Not disclosed"],
            ["Models", String(models.length)],
            ["Active", String(live.length + preview.length)],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-4 py-3">
              <dt className="stat-label">{label}</dt>
              <dd className="mt-0.5 font-semibold tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="container-page">
        {provider.products.length > 0 && (
          <section className="section" aria-labelledby="products">
            <h2 id="products" className="mb-4 text-xl">Products</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {provider.products.map((product) => (
                <li key={product.name} className="panel p-4">
                  <a href={product.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold hover:underline">{product.name} <ArrowUpRight size={13} aria-hidden="true" /></a>
                  <p className="mt-1 text-[13.5px] text-muted-foreground">{product.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <SponsoredSlot placements={catalog.sponsored.filter((placement) => !placement.providerId || placement.providerId === provider.id)} slot="provider" now={getPageDate()} />

        {models.length === 0 ? (
          <section className="section">
            <p className="text-muted-foreground">{provider.name} hosts models from other labs; it has no first-party models in the catalog. See each lab&apos;s page for model details.</p>
          </section>
        ) : (
          <>
            {[["Active models", live], ["Preview models", preview], ["Open models", open], ["Deprecated & retired", legacy]].map(([title, list]) => (list as ModelSummary[]).length ? (
              <section key={title as string} className="section" aria-label={title as string}>
                <h2 className="mb-4 text-xl">{title as string} <span className="text-base font-normal text-muted-foreground tabular">{(list as ModelSummary[]).length}</span></h2>
                <div className="model-grid">{(list as ModelSummary[]).slice(0, 12).map((model) => <ModelCard key={model.slug} model={model} />)}</div>
                {(list as ModelSummary[]).length > 12 && <p className="mt-3 text-sm"><Link className="text-link" href={`/models?provider=${provider.id}`}>See all in Explore</Link></p>}
              </section>
            ) : null)}

            <section className="section grid gap-10 lg:grid-cols-2" aria-label="Breakdown and timeline">
              <div>
                <h2 className="mb-4 text-xl">By category</h2>
                <ul className="divide-y rounded-lg border bg-card">
                  {groups.map((group) => (
                    <li key={group.title} className="px-4 py-3">
                      <p className="flex justify-between font-medium"><span>{group.title}</span><span className="text-muted-foreground tabular">{group.models.length}</span></p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {group.models.slice(0, 8).map((model, index) => <span key={model.slug}>{index > 0 && ", "}<Link href={model.path} className="hover:text-foreground hover:underline">{model.name}</Link></span>)}
                        {group.models.length > 8 && ` +${group.models.length - 8} more`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="mb-4 text-xl">Timeline</h2>
                {byYear.size ? (
                  <ol className="grid gap-5">
                    {[...byYear.entries()].map(([year, list]) => (
                      <li key={year} className="grid grid-cols-[56px_minmax(0,1fr)] gap-4">
                        <span className="text-lg font-semibold tabular">{year}</span>
                        <ul className="grid gap-1.5 border-l pl-4">
                          {list.map((model) => (
                            <li key={model.slug} className="flex items-baseline justify-between gap-3 text-[14px]">
                              <Link href={model.path} className="truncate hover:underline">{model.name}</Link>
                              <span className="shrink-0 text-xs text-muted-foreground tabular">{formatDate(model.released, "short")} · {categoryLabels[model.categories[0]]}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-muted-foreground">No dated releases recorded.</p>}
              </div>
            </section>
          </>
        )}

        <section className="section" aria-labelledby="provider-sources">
          <h2 id="provider-sources" className="mb-3 text-xl">Sources</h2>
          <ul className="grid gap-1.5 text-[14px]">
            {provider.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <ExternalLink size={12} aria-hidden="true" /> {source.label} <span className="text-xs">· checked {formatDate(source.checkedAt, "short")}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <NewsletterCard source={`provider-${provider.slug}`} title={`Follow ${provider.name} releases`} description="New models, pricing changes, and deprecations across all providers — once a week." />
      </div>
    </>
  );
}
