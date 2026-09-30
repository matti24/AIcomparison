"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftRight, ArrowRight, CalendarDays, ChartNoAxesCombined, Check, ChevronRight, ExternalLink, FileCode2, Globe2, Info, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { ComparisonValue } from "@/components/comparison-workspace";
import { FavoriteButton, InfoTip, ModelCard, StatusBadge } from "@/components/model-card";
import { ModelPicker } from "@/components/model-picker";
import { Button } from "@/components/ui/button";
import { capabilityLabels, comparisonPath, formatContext, formatDate, formatPrice, getModalities, getProvider, opennessLabel, sortModels, typeLabels, useCaseLabels } from "@/lib/catalog";
import type { AIModel, Source } from "@/lib/types";
import { CAPABILITIES } from "@/lib/types";

function sourcesFor(model: AIModel) {
  const facts = [model.releaseDate, model.contextWindow, model.maxOutput, model.knowledgeCutoff, model.openness, model.apiAvailable, model.freeAccess, model.speed, ...Object.values(model.capabilities), ...Object.values(model.pricing).filter((value) => typeof value === "object")];
  const sources = facts.map((fact) => fact.source).filter((source): source is Source => source !== null);
  return sources.filter((source, index) => sources.findIndex((other) => other.url === source.url) === index);
}

export function ModelProfile({ model }: { model: AIModel }) {
  const { catalog, markViewed, selected, toggleSelected } = useApp();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const provider = getProvider(catalog, model.providerId);
  const sources = sourcesFor(model);
  const related = sortModels(catalog.models.filter((other) => other.id !== model.id && (other.providerId === model.providerId || other.type === model.type || other.bestFor.some((key) => model.bestFor.includes(key)))), "featured")
    .sort((a, b) => Number(b.providerId === model.providerId) - Number(a.providerId === model.providerId)).slice(0, 3);

  useEffect(() => { markViewed(model.slug); }, [model.slug, markViewed]);

  return (
    <div className="content-width pb-12">
      <div className="profile-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/models">All models</Link><ChevronRight size={11} /><Link href={`/companies/${provider.slug}`}>{provider.name}</Link><ChevronRight size={11} /><span aria-current="page">{model.name}</span></nav>
        <div className="profile-identity">
          <ProviderLogo provider={provider} size={73} />
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2"><Link href={`/companies/${provider.slug}`} className="text-xs text-primary">{provider.name}</Link><span className="text-muted-foreground">&middot;</span><span className="text-xs text-muted-foreground">{typeLabels[model.type]}</span><StatusBadge model={model} /></div>
            <h1>{model.name}</h1>
          </div>
          <FavoriteButton model={model} />
          <Button onClick={() => toggleSelected(model.slug)} variant={selected.includes(model.slug) ? "secondary" : "default"}><ArrowLeftRight size={14} />{selected.includes(model.slug) ? "Selected" : "Add to compare"}</Button>
        </div>
        <p className="profile-description">{model.description}</p>
        <div className="profile-meta"><span><CalendarDays size={12} /> Released {formatDate(model.releaseDate.value)}</span><span><ShieldCheck size={12} /> {sources.length} linked {sources.length === 1 ? "source" : "sources"}</span><span>Catalog updated {formatDate(model.updatedAt)}</span></div>
      </div>
      {model.status === "deprecated" && <div className="notice mb-6 border-amber-300/40"><Info size={16} /><p><strong className="text-foreground">This model is deprecated.</strong> It remains in the catalog for historical comparisons. Check the provider for migration guidance before starting new projects.</p></div>}
      <div className="profile-stats">
        <div><span>Context window <InfoTip label="About context windows">The maximum combined input and output tokens per request. Specific limits can depend on your API tier.</InfoTip></span><strong>{formatContext(model.contextWindow.value)}</strong><small>tokens</small></div>
        <div><span>Input price</span><strong>{formatPrice(model.pricing.input.value)}</strong><small>per 1M tokens</small></div>
        <div><span>Output price</span><strong>{formatPrice(model.pricing.output.value)}</strong><small>per 1M tokens</small></div>
        <div><span>API access</span><strong>{model.apiAvailable.value === null ? "Unknown" : model.apiAvailable.value ? "Available" : "No"}</strong><small>{model.apiAvailable.value ? "Build with this model" : "Check official product"}</small></div>
        <div><span>Modalities</span><strong>{getModalities(model).join(" + ") || "Unknown"}</strong><small>documented support</small></div>
        <div><span>License</span><strong>{opennessLabel(model)}</strong><small>review usage terms</small></div>
      </div>
      <div className="profile-layout">
        <div className="space-y-6">
          <section className="panel"><h2 className="panel-title"><Sparkles size={17} className="text-primary" />A good fit for</h2><div className="flex flex-wrap gap-2">{model.bestFor.map((useCase) => <Link href={`/models?q=${encodeURIComponent(useCaseLabels[useCase])}`} key={useCase} className="use-case-tag">{useCaseLabels[useCase]}</Link>)}</div><p className="mt-4 text-[10px] leading-5 text-muted-foreground">Editorial use-case guidance based on documented capabilities, not a claim that this model is objectively best.</p></section>
          <section className="panel" id="capabilities"><h2 className="panel-title">What it can do</h2><p className="mb-5 text-xs leading-6 text-muted-foreground">Model capabilities, not every feature of the product around it. Unknown means not reliably documented in this catalog.</p><div className="capability-grid">
            {CAPABILITIES.map((key) => {
              const fact = model.capabilities[key];
              return <div className="capability-item" key={key}><span className={fact.value === true ? "capability-check" : "capability-unknown"}>{fact.value === true ? <Check size={13} /> : fact.value === false ? <Minus size={13} /> : <span>?</span>}</span><span className="flex-1">{capabilityLabels[key]}</span>{fact.source ? <a href={fact.source.url} target="_blank" rel="noreferrer" aria-label={`Source for ${capabilityLabels[key]}`} className="source-icon"><ExternalLink size={10} /></a> : <span className="text-[9px] text-muted-foreground">{fact.value === null ? "Unknown" : ""}</span>}</div>;
            })}
          </div></section>
          <section className="panel" id="pricing"><h2 className="panel-title">The cost, without the fine-print fog.</h2><div className="data-table-wrapper"><table className="data-table"><caption className="sr-only">Published pricing for {model.name}</caption><thead><tr><th>Pricing type</th><th>USD</th><th>Unit</th></tr></thead><tbody>
            <tr><td>API input</td><td><ComparisonValue cell={{ value: model.pricing.input.value, display: formatPrice(model.pricing.input.value), source: model.pricing.input.source, note: model.pricing.input.note }} /></td><td>1M input tokens</td></tr>
            <tr><td>API output</td><td><ComparisonValue cell={{ value: model.pricing.output.value, display: formatPrice(model.pricing.output.value), source: model.pricing.output.source, note: model.pricing.output.note }} /></td><td>1M output tokens</td></tr>
            <tr><td>Product subscription</td><td><ComparisonValue cell={{ value: model.pricing.subscription.value, display: formatPrice(model.pricing.subscription.value), source: model.pricing.subscription.source, note: model.pricing.subscription.note }} /></td><td>Month, if documented</td></tr>
          </tbody></table></div><p className="mt-4 text-[11px] leading-6 text-muted-foreground">Standard published pricing, not a quote. Caching, batch processing, long context, reasoning, tools, and regional tiers can change your bill. Subscriptions and API usage are separate.</p>
            {[model.pricing.input.note, model.pricing.output.note, model.pricing.subscription.note].filter((note, index, notes) => note && notes.indexOf(note) === index).map((note) => <p key={note} className="mt-2 text-[11px] leading-6 text-muted-foreground">{note}</p>)}
          </section>
          <section className="panel"><h2 className="panel-title"><ChartNoAxesCombined size={18} className="text-primary" />Benchmarks, in context.</h2>
            {model.benchmarks.length ? <div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Benchmark</th><th>Reported score</th><th>Date & source</th></tr></thead><tbody>{model.benchmarks.map((benchmark) => <tr key={benchmark.id}><td>{benchmark.name}{benchmark.note && <p className="mt-2 max-w-72 text-[10px] leading-5 whitespace-normal text-muted-foreground">{benchmark.note}</p>}</td><td>{benchmark.score}</td><td><a href={benchmark.source.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{formatDate(benchmark.date, true)} <ExternalLink size={10} className="inline-block" /></a></td></tr>)}</tbody></table></div> : <div className="benchmark-empty"><ChartNoAxesCombined size={24} className="text-muted-foreground" /><div><h3>No verified results added yet.</h3><p>We would rather leave a space than fill it with a made-up score. Benchmark results can be added with a named test, date, and reliable source.</p></div></div>}
            <p className="mt-4 text-[10px] leading-5 text-muted-foreground">Different benchmarks measure different things. We never blend unrelated results into a universal AI score. <Link href="/methodology" className="text-primary underline underline-offset-2">Read our methodology</Link></p>
          </section>
          <section className="panel"><h2 className="panel-title">The release timeline</h2>
            {model.releases.length ? <ol className="release-timeline">{[...model.releases].sort((a, b) => b.date.localeCompare(a.date)).map((release) => <li key={release.id}><span className="timeline-point" /><div className="mb-2 flex flex-wrap items-center gap-2"><time dateTime={release.date}>{formatDate(release.date)}</time><span className="tag">{release.type}</span></div><h3>{release.title}</h3><p>{release.description}</p><a href={release.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary">Read the announcement <ExternalLink size={10} /></a></li>)}</ol> : <p className="text-xs text-muted-foreground">No verified release history has been added for this model.</p>}
          </section>
        </div>
        <aside className="space-y-5">
          <section className="panel"><h2 className="panel-title text-base">Go straight to the source.</h2><a href={model.website} target="_blank" rel="noreferrer" className="resource-link"><Globe2 size={15} />Official model website<ExternalLink size={12} /></a>{model.apiDocs && <a href={model.apiDocs} target="_blank" rel="noreferrer" className="resource-link"><FileCode2 size={15} />API documentation<ExternalLink size={12} /></a>}
            <dl className="spec-list">
              <div><dt>Model version</dt><dd>{model.version}</dd></div>
              <div><dt>Maximum output</dt><dd>{formatContext(model.maxOutput.value)}{model.maxOutput.value !== null ? " tokens" : ""}</dd></div>
              <div><dt>Knowledge cutoff</dt><dd>{model.knowledgeCutoff.value ?? "Not disclosed"}</dd></div>
              <div><dt>Free access</dt><dd>{model.freeAccess.value === null ? "Unknown" : model.freeAccess.value ? "Available" : "No"}</dd></div>
              <div><dt>Speed</dt><dd>{model.speed.value ?? "Not disclosed"}</dd></div>
            </dl>
          </section>
          <section className="panel profile-compare-panel"><ArrowLeftRight size={24} className="text-primary" /><h2 className="mt-4 text-xl font-medium tracking-tight">A good model.<br />But is it your model?</h2><p className="mt-3 text-xs leading-6 text-muted-foreground">Put {model.name} next to another model and see what makes the difference.</p><Button className="mt-5 w-full" onClick={() => setPickerOpen(true)}>Compare with another <ArrowRight size={13} /></Button></section>
          <section className="panel"><h2 className="panel-title text-base"><ShieldCheck size={16} className="text-primary" />An open book.</h2><p className="text-[11px] leading-6 text-muted-foreground">Each technical fact has its own source and last-updated date. A catalog update does not guarantee that every provider page is current.</p><div className="mt-4 space-y-3">{sources.map((source) => <a href={source.url} key={source.url} target="_blank" rel="noreferrer" className="block text-[10px] leading-5 text-primary">{source.label} <ExternalLink size={9} className="inline-block" /><span className="block text-[9px] text-muted-foreground">Checked {formatDate(source.checkedAt, true)}</span></a>)}</div></section>
        </aside>
      </div>
      {related.length > 0 && <section className="section !pb-0"><div className="section-heading"><div><h2>Keep your options open.</h2><p>More from {provider.name}, and a few alternatives worth a look.</p></div><Link href={`/models?provider=${provider.id}`} className="text-link">Provider models <ArrowRight size={13} /></Link></div><div className="model-grid">{related.map((relatedModel) => <ModelCard key={relatedModel.id} model={relatedModel} />)}</div></section>}
      <ModelPicker open={pickerOpen} onOpenChange={setPickerOpen} exclude={[model.slug]} onSelect={(other) => router.push(comparisonPath([model.slug, other.slug]))} title={`What should we compare with ${model.name}?`} />
    </div>
  );
}
