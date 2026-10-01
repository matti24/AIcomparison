import Link from "next/link";
import { ArrowRight, Check, Minus, ExternalLink } from "lucide-react";
import { ProviderLogo } from "@/components/brand";
import { BenchmarkLegend, LazyBenchmarkChart, type BenchmarkDatum } from "@/components/charts";
import { CostCalculator } from "@/components/cost-calculator";
import { ModelActions } from "@/components/model-actions";
import { ModelCard } from "@/components/model-card";
import { NewsletterCard } from "@/components/newsletter";
import { SourceMark, VerifiedLabel } from "@/components/source-mark";
import { PageHeader } from "@/components/ui-kit";
import {
  capabilityLabels, categoryLabels, eventTypeLabels, formatDate, formatPrice, formatTokens, latestPriceCheck, latestVerification,
  modelBadges, opennessLabels, providerPath, sortModels, statusLabels, useCaseLabels, type ModelSummary,
} from "@/lib/catalog";
import { CAPABILITIES, type AIModel, type Catalog, type Fact, type OutboundLink, type Provider, type Source } from "@/lib/types";

const badgeClass: Record<string, string> = {
  new: "badge badge-new", updated: "badge badge-updated", preview: "badge badge-preview", deprecated: "badge badge-deprecated",
  retired: "badge badge-retired", "open-weights": "badge badge-open-weights", "open-source": "badge badge-open-source",
};
const badgeText: Record<string, string> = {
  new: "New", updated: "Updated", preview: "Preview", deprecated: "Deprecated", retired: "Retired", "open-weights": "Open weights", "open-source": "Open source",
};

function FactValue<T extends string | number | boolean>({ fact, format, unknown = "Not publicly disclosed" }: { fact: Fact<T>; format: (value: T) => string; unknown?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={fact.value === null ? "unknown text-[13px] font-normal" : undefined}>{fact.value === null ? unknown : format(fact.value)}</span>
      <SourceMark source={fact.source} note={fact.note} />
    </span>
  );
}

const sections = [
  ["overview", "Overview"], ["capabilities", "Capabilities"], ["pricing", "Pricing"], ["calculator", "Calculator"], ["benchmarks", "Benchmarks"],
  ["versions", "Versions"], ["changes", "Changes"], ["similar", "Similar"], ["sources", "Sources"],
] as const;

export function ModelProfile({ catalog, model, provider, summary, summaries, link, now }: {
  catalog: Catalog;
  model: AIModel;
  provider: Provider;
  summary: ModelSummary;
  summaries: ModelSummary[];
  link: OutboundLink | null;
  now: string;
}) {
  const badges = modelBadges(summary, now);
  const priceChecked = latestPriceCheck(model);
  const verified = latestVerification(model);
  const benchmarkDefs = new Map(catalog.benchmarks.map((definition) => [definition.id, definition]));
  const versions = sortModels(summaries.filter((entry) => entry.providerId === model.providerId && entry.family === model.family), "newest");
  const primary = model.categories[0];
  const similar = sortModels(
    summaries.filter((entry) => entry.slug !== model.slug && entry.status !== "retired" && entry.categories.includes(primary)),
    "featured",
  ).sort((a, b) => Number(a.providerId === model.providerId) - Number(b.providerId === model.providerId)).slice(0, 3);
  const tokenPriced = model.pricing.input.value !== null || model.pricing.output.value !== null;

  const sources = new Map<string, { source: Source; fields: Set<string> }>();
  const addSource = (source: Source | null | undefined, field: string) => {
    if (!source) return;
    const entry = sources.get(source.url) ?? { source, fields: new Set<string>() };
    if (source.checkedAt > entry.source.checkedAt) entry.source = source;
    entry.fields.add(field);
    sources.set(source.url, entry);
  };
  ([
    ["Release date", model.releaseDate], ["Knowledge cutoff", model.knowledgeCutoff], ["Context window", model.contextWindow],
    ["Max output", model.maxOutput], ["License", model.openness], ["License", model.license], ["API", model.apiAvailable],
    ["Free access", model.freeAccess], ["Languages", model.languages], ["Pricing", model.pricing.input], ["Pricing", model.pricing.output],
    ["Pricing", model.pricing.cachedInput], ["Pricing", model.pricing.other],
  ] as [string, Fact<unknown>][]).forEach(([label, fact]) => addSource(fact.source, label));
  CAPABILITIES.forEach((key) => addSource(model.capabilities[key].source, "Capabilities"));
  model.benchmarks.forEach((result) => addSource(result.source, "Benchmarks"));
  model.releases.forEach((event) => addSource(event.source, "Release history"));

  const benchmarkData: BenchmarkDatum[] = model.benchmarks
    .filter((result) => benchmarkDefs.get(result.benchmarkId)?.unit === "%")
    .map((result) => ({
      label: benchmarkDefs.get(result.benchmarkId)?.name ?? result.benchmarkId,
      score: result.score,
      display: result.display ?? `${result.score}%`,
      reportedBy: result.reportedBy,
      color: provider.color,
      date: formatDate(result.evaluatedAt),
      source: result.source.label,
      conditions: result.conditions,
      version: result.version,
    }));

  const quickStats: [string, React.ReactNode][] = [
    ["Context", <FactValue key="c" fact={model.contextWindow} format={(value) => `${formatTokens(value)} tokens`} unknown="Not disclosed" />],
    ["Max output", <FactValue key="o" fact={model.maxOutput} format={(value) => `${formatTokens(value)} tokens`} unknown="Not disclosed" />],
    ["Input / 1M", tokenPriced ? <FactValue key="i" fact={model.pricing.input} format={(value) => formatPrice(value)} unknown="Not disclosed" /> : <span key="i" className="text-[13px] font-normal text-muted-foreground">{model.pricing.other.value ? "Non-token pricing" : "Not disclosed"}</span>],
    ["Output / 1M", <FactValue key="out" fact={model.pricing.output} format={(value) => formatPrice(value)} unknown={tokenPriced ? "Not disclosed" : "—"} />],
    ["API", <FactValue key="api" fact={model.apiAvailable} format={(value) => (value ? "Available" : "Not available")} unknown="Not disclosed" />],
    ["License", <FactValue key="lic" fact={model.license.value ? model.license : model.openness} format={(value) => (typeof value === "string" && value in opennessLabels ? opennessLabels[value as keyof typeof opennessLabels] : String(value))} unknown="Not disclosed" />],
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/models", label: "Models" }, { href: providerPath(provider.slug), label: provider.name }, { href: summary.path, label: model.name }]}
        title={
          <span className="flex items-center gap-4">
            <ProviderLogo provider={provider} size={52} />
            <span className="min-w-0">
              <span className="block">{model.name}</span>
              <span className="mt-1 block text-[15px] font-normal tracking-normal text-muted-foreground">
                by <Link href={providerPath(provider.slug)} className="hover:text-foreground hover:underline">{provider.name}</Link>
                {" · "}{categoryLabels[primary]}
                {model.releaseDate.value && <> · Released <time dateTime={model.releaseDate.value}>{formatDate(model.releaseDate.value)}</time></>}
              </span>
            </span>
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${model.status === "active" ? "" : `badge-${model.status}`}`}>{statusLabels[model.status]}</span>
          {badges.filter((badge) => !["preview", "deprecated", "retired"].includes(badge)).map((badge) => <span key={badge} className={badgeClass[badge]}>{badgeText[badge]}</span>)}
          <code className="mono rounded border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">{model.version}</code>
          <VerifiedLabel date={verified} />
        </div>
        <div className="mt-5">
          <ModelActions
            slug={model.slug}
            name={model.name}
            id={model.id}
            website={model.website}
            apiDocs={model.apiDocs}
            tryLabel={link?.label ?? `Try ${model.name}`}
            isAffiliate={Boolean(link?.isAffiliate && link.enabled)}
          />
          {link?.isAffiliate && link.enabled && (
            <p className="mt-2 text-xs text-muted-foreground">We may earn a commission from this link. It never affects our data. <Link href="/affiliate-disclosure" className="underline underline-offset-2">Disclosure</Link></p>
          )}
        </div>
      </PageHeader>

      <nav className="subnav" aria-label="On this page">
        <div className="container-page subnav-inner">
          {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </div>
      </nav>

      <div className="container-page">
        <div className="profile-grid">
          <div className="min-w-0">
            <section id="overview" className="profile-section" aria-labelledby="overview-h">
              <h2 id="overview-h">Overview</h2>
              <p className="max-w-3xl text-[15.5px] leading-relaxed text-secondary-foreground">{model.description}</p>
              {model.status === "deprecated" || model.status === "retired" ? (
                <p className={`mt-4 rounded-md border p-3 text-sm ${model.status === "retired" ? "badge-retired" : "badge-deprecated"}`} style={{ height: "auto", borderRadius: 8 }}>
                  {model.status === "retired" ? "This model has been retired by its provider and is kept for historical comparison." : "This model is deprecated. Check the provider's migration guidance before building on it."}
                </p>
              ) : null}
              <div className="quick-stats mt-6">
                {quickStats.map(([label, value]) => (
                  <div key={label}>
                    <span className="stat-label">{label}</span>
                    <span className="mt-1 block text-[15px] font-semibold tabular">{value}</span>
                  </div>
                ))}
              </div>
              <dl className="mt-6 grid gap-x-8 gap-y-3 text-[14px] sm:grid-cols-2">
                {([
                  ["Model family", <span key="f">{model.family}</span>],
                  ["Categories", <span key="cat" className="flex flex-wrap gap-1">{model.categories.map((category) => <Link key={category} href={`/models/${category}`} className="badge hover:border-border-strong">{categoryLabels[category]}</Link>)}</span>],
                  ["Openness", <FactValue key="o" fact={model.openness} format={(value) => opennessLabels[value]} />],
                  ["Knowledge cutoff", <FactValue key="k" fact={model.knowledgeCutoff} format={(value) => formatDate(value, "month")} />],
                  ["Languages", <FactValue key="l" fact={model.languages} format={(value) => value} />],
                  ["Free access", <FactValue key="fa" fact={model.freeAccess} format={(value) => (value ? "Yes" : "No")} />],
                ] as [string, React.ReactNode][]).map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b pb-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {model.bestFor.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[15px]">Best suited for</h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">Use cases the provider documents or that follow from its documented capabilities — not a quality ranking.</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {model.bestFor.map((useCase) => <li key={useCase} className="chip !h-8">{useCaseLabels[useCase]}</li>)}
                  </ul>
                </div>
              )}
            </section>

            <section id="capabilities" className="profile-section" aria-labelledby="capabilities-h">
              <h2 id="capabilities-h">Capabilities</h2>
              <div className="cap-matrix" role="list">
                {CAPABILITIES.map((key) => {
                  const fact = model.capabilities[key];
                  return (
                    <div key={key} role="listitem">
                      {fact.value === true ? <Check size={15} className="yes shrink-0" aria-label="Supported" /> : fact.value === false ? <Minus size={15} className="no shrink-0" aria-label="Not supported" /> : <span className="unknown w-[15px] shrink-0 text-center text-xs" aria-label="Unknown">?</span>}
                      <span className={fact.value === true ? "" : "text-muted-foreground"}>{capabilityLabels[key]}</span>
                      <span className="ml-auto"><SourceMark source={fact.source} note={fact.value === null ? undefined : fact.note} /></span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">✓ documented · — documented as unsupported · ? not disclosed (unknown is not &ldquo;no&rdquo;)</p>
            </section>

            <section id="pricing" className="profile-section" aria-labelledby="pricing-h">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="pricing-h">Pricing</h2>
                {priceChecked && <VerifiedLabel date={priceChecked} prefix="Pricing verified" />}
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <caption className="sr-only">API pricing for {model.name}</caption>
                  <thead><tr><th scope="col">Item</th><th scope="col" className="num">Price (USD)</th><th scope="col">Notes</th></tr></thead>
                  <tbody>
                    {([
                      ["Input / 1M tokens", model.pricing.input, (value: number) => formatPrice(value)],
                      ["Cached input / 1M tokens", model.pricing.cachedInput, (value: number) => formatPrice(value)],
                      ["Output / 1M tokens", model.pricing.output, (value: number) => formatPrice(value)],
                    ] as [string, Fact<number>, (value: number) => string][]).map(([label, fact, format]) => (
                      <tr key={label}>
                        <th scope="row" className="font-normal">{label}</th>
                        <td className="num font-medium">{fact.value === null ? <span className="unknown font-normal">Not disclosed</span> : format(fact.value)}</td>
                        <td className="!whitespace-normal text-[13px] text-muted-foreground"><span className="inline-flex items-start gap-1">{fact.note && fact.value !== null ? fact.note : ""}<SourceMark source={fact.source} /></span></td>
                      </tr>
                    ))}
                    {model.pricing.other.value && (
                      <tr>
                        <th scope="row" className="font-normal">Other pricing</th>
                        <td className="!whitespace-normal text-right font-medium" colSpan={1}>{model.pricing.other.value}</td>
                        <td className="!whitespace-normal text-[13px] text-muted-foreground"><span className="inline-flex items-start gap-1">{model.pricing.other.note ?? ""}<SourceMark source={model.pricing.other.source} /></span></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="calculator" className="profile-section" aria-labelledby="calculator-h">
              <h2 id="calculator-h">API cost calculator</h2>
              {tokenPriced ? (
                <CostCalculator models={[summary, ...similar.filter((entry) => entry.input !== null).slice(0, 2)]} title={`Estimate ${model.name} costs`} source="model-page" />
              ) : (
                <p className="text-sm text-muted-foreground">This model isn&apos;t priced per token, so the token calculator doesn&apos;t apply. See pricing above.</p>
              )}
            </section>

            <section id="benchmarks" className="profile-section" aria-labelledby="benchmarks-h">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="benchmarks-h">Benchmarks</h2>
                <Link href="/benchmarks" className="text-link">Benchmark explorer <ArrowRight size={14} /></Link>
              </div>
              {model.benchmarks.length ? (
                <>
                  {benchmarkData.length > 0 && (
                    <div className="panel p-4">
                      <LazyBenchmarkChart data={benchmarkData} unit="%" maxValue={100} />
                      <div className="mt-2 border-t pt-3"><BenchmarkLegend /></div>
                    </div>
                  )}
                  <div className="table-wrap mt-4">
                    <table className="data-table">
                      <caption className="sr-only">Benchmark results for {model.name}</caption>
                      <thead><tr><th scope="col">Benchmark</th><th scope="col" className="num">Score</th><th scope="col">Reported by</th><th scope="col">Conditions</th><th scope="col">Date</th><th scope="col"><span className="sr-only">Source</span></th></tr></thead>
                      <tbody>
                        {model.benchmarks.map((result) => {
                          const definition = benchmarkDefs.get(result.benchmarkId);
                          return (
                            <tr key={result.id}>
                              <th scope="row" className="font-medium">{definition?.name ?? result.benchmarkId}{result.version && <span className="block text-xs font-normal text-muted-foreground">{result.version}</span>}</th>
                              <td className="num font-semibold">{result.display ?? `${result.score}${definition?.unit === "%" ? "%" : ""}`}</td>
                              <td><span className={result.reportedBy === "independent" ? "badge badge-new" : "badge"}>{result.reportedBy === "independent" ? "Independent" : "Provider"}</span></td>
                              <td className="!whitespace-normal min-w-[200px] text-[13px] text-muted-foreground">{result.conditions ?? "—"}</td>
                              <td className="text-muted-foreground tabular">{formatDate(result.evaluatedAt, "short")}</td>
                              <td><SourceMark source={result.source} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Scores are shown exactly as published with their conditions. Different harnesses, tools, and effort settings make cross-source comparisons approximate. We never combine benchmarks into one score.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No published benchmark results are recorded for this model yet. We only list scores with a citable source.</p>
              )}
            </section>

            <section id="versions" className="profile-section" aria-labelledby="versions-h">
              <h2 id="versions-h">{model.family} versions</h2>
              {versions.length > 1 ? (
                <ol className="timeline">
                  {versions.map((entry) => (
                    <li key={entry.slug} className="timeline-item">
                      <time className="text-right text-[13px] text-muted-foreground tabular" dateTime={entry.released ?? undefined}>{entry.released ? formatDate(entry.released, "short") : "Date n/a"}</time>
                      <span className="timeline-dot" aria-hidden="true" style={entry.slug === model.slug ? { background: "var(--foreground)" } : undefined} />
                      <div>
                        {entry.slug === model.slug ? <span className="font-semibold">{entry.name} <span className="text-xs font-normal text-muted-foreground">(this model)</span></span> : <Link href={entry.path} className="font-medium hover:underline">{entry.name}</Link>}
                        <p className="text-[13px] text-muted-foreground">{statusLabels[entry.status]} · {categoryLabels[entry.categories[0]]}{entry.context ? ` · ${formatTokens(entry.context)} context` : ""}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted-foreground">No other {model.family} versions are in the catalog yet.</p>}
            </section>

            <section id="changes" className="profile-section" aria-labelledby="changes-h">
              <h2 id="changes-h">Recent changes</h2>
              {model.releases.length ? (
                <ol className="timeline">
                  {model.releases.slice(0, 10).map((event) => (
                    <li key={event.id} className="timeline-item">
                      <time className="text-right text-[13px] text-muted-foreground tabular" dateTime={event.date}>{formatDate(event.date, "short")}</time>
                      <span className="timeline-dot" aria-hidden="true" />
                      <div>
                        <p className="font-medium">{event.title} <span className="badge ml-1 align-middle">{eventTypeLabels[event.type]}</span></p>
                        <p className="text-[13.5px] text-muted-foreground">{event.description}</p>
                        <a href={event.source.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-subtle hover:text-foreground"><ExternalLink size={11} aria-hidden="true" /> {event.source.label}</a>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted-foreground">No dated changes recorded.</p>}
            </section>

            <section id="similar" className="profile-section" aria-labelledby="similar-h">
              <h2 id="similar-h">Similar models</h2>
              {similar.length ? <div className="model-grid">{similar.map((entry) => <ModelCard key={entry.slug} model={entry} />)}</div> : <p className="text-sm text-muted-foreground">No similar models found.</p>}
            </section>

            <section id="sources" className="profile-section" aria-labelledby="sources-h">
              <h2 id="sources-h">Sources</h2>
              <p className="mb-3 text-[13.5px] text-muted-foreground">Every fact on this page links to the page it came from. Dates show when we last checked each source.</p>
              <ul className="divide-y rounded-lg border bg-card">
                {[...sources.values()].sort((a, b) => b.fields.size - a.fields.size).map(({ source, fields }) => (
                  <li key={source.url} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 text-[14px] font-medium hover:underline">
                      {source.label} <ExternalLink size={11} className="inline" aria-hidden="true" />
                    </a>
                    <span className="text-xs text-muted-foreground">{[...fields].join(", ")}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular">Checked {formatDate(source.checkedAt, "short")}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Spotted an error? <Link href="/contact" className="underline underline-offset-2">Tell us</Link> — corrections are reviewed against official sources.</p>
            </section>
          </div>

          <aside className="profile-aside pt-10" aria-label="Summary">
            <div className="panel p-5">
              <p className="stat-label">Provider</p>
              <Link href={providerPath(provider.slug)} className="mt-2 flex items-center gap-3 hover:underline">
                <ProviderLogo provider={provider} size={32} />
                <span className="font-semibold">{provider.name}</span>
              </Link>
              <p className="mt-3 line-clamp-4 text-[13.5px] text-muted-foreground">{provider.description}</p>
              <Link href={providerPath(provider.slug)} className="text-link mt-3">All {provider.name} models <ArrowRight size={14} /></Link>
            </div>
            <div className="panel p-5 text-[13.5px]">
              <p className="font-semibold">Compare {model.name} with</p>
              <ul className="mt-2 grid gap-1">
                {similar.map((entry) => (
                  <li key={entry.slug}><Link className="text-muted-foreground hover:text-foreground" href={`/compare/${[model.slug, entry.slug].join("-vs-")}`}>{model.name} vs {entry.name}</Link></li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
        <div className="mt-16"><NewsletterCard source="model-page" title="Track changes to models like this" description={`Get pricing changes, new versions, and deprecations from ${provider.name} and others — once a week.`} /></div>
      </div>
    </>
  );
}
