"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight, ArrowRight, Check, CircleCheck, Clock3, Code2, Compass, Layers3,
  LockKeyhole, Search, ShieldCheck, Sparkles, TrendingUp,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { ModelCard } from "@/components/model-card";
import { Button } from "@/components/ui/button";
import { comparisonPath, formatContext, formatPrice, getModalities, getProvider, isOpen, sortModels, suggestedComparisons } from "@/lib/catalog";
import type { AIModel } from "@/lib/types";

const tabs = [
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "recent", label: "Recently released", icon: Clock3 },
  { id: "coding", label: "Top coding", icon: Code2 },
  { id: "multimodal", label: "Multimodal", icon: Layers3 },
  { id: "open", label: "Open models", icon: LockKeyhole },
] as const;
type Tab = (typeof tabs)[number]["id"];

function HeroComparison({ models }: { models: AIModel[] }) {
  const { catalog } = useApp();
  if (models.length < 2) return null;
  return (
    <div className="hero-visual">
      <div className="hero-orbit" aria-hidden="true" />
      <div className="compare-preview">
        <div className="compare-preview-top">
          <span className="flex items-center gap-1.5"><ArrowLeftRight size={12} /> A clearer comparison</span>
          <div className="preview-dots" aria-hidden="true"><span /><span /><span /></div>
        </div>
        <div className="preview-models">
          {models.map((model) => (
            <Link href={`/models/${model.slug}`} key={model.id}>
              <ProviderLogo provider={getProvider(catalog, model.providerId)} size={43} />
              <strong>{model.name}</strong>
              <p>{getProvider(catalog, model.providerId).name}</p>
            </Link>
          ))}
        </div>
        <div className="preview-row">
          {models.map((model) => <span key={model.id}><small>CONTEXT WINDOW</small>{formatContext(model.contextWindow.value)}</span>)}
        </div>
        <div className="preview-row">
          {models.map((model) => <span key={model.id}><small>INPUT / 1M TOKENS</small>{formatPrice(model.pricing.input.value)}</span>)}
        </div>
        <div className="preview-row">
          {models.map((model) => <span key={model.id} className="flex items-center justify-center gap-1 text-[var(--green)]"><Check size={11} /><span className="text-[9px] font-normal">Source-linked</span></span>)}
        </div>
        <div className="preview-bottom"><span>Same table. Different possibilities.</span><Link href={comparisonPath(models.map((model) => model.slug))}>Compare <ArrowRight size={10} /></Link></div>
      </div>
      <div className="hero-float-badge">
        <div className="hero-float-icon"><Sparkles size={16} /></div>
        <div><strong>Your next advantage, found.</strong><span>No hype. Just the details that matter.</span></div>
      </div>
      <Sparkles className="hero-spark" size={31} strokeWidth={1.1} aria-hidden="true" />
    </div>
  );
}

export function ComparisonTeasers({ limit = 3 }: { limit?: number }) {
  const { catalog } = useApp();
  return (
    <div className="comparison-teasers">
      {suggestedComparisons(catalog).slice(0, limit).map((pair) => (
        <Link key={pair.title} href={comparisonPath(pair.models.map((model) => model.slug))} className="comparison-teaser">
          <div className="comparison-teaser-logos">{pair.models.map((model) => <ProviderLogo key={model.id} provider={getProvider(catalog, model.providerId)} size={43} />)}</div>
          <div><h3>{pair.title}</h3><p>{pair.category}</p></div>
          <ArrowRight size={14} className="ml-auto shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

export function FinderBanner() {
  return (
    <section className="finder-banner" aria-labelledby="finder-banner-heading">
      <div className="finder-banner-art" aria-hidden="true"><Compass size={43} strokeWidth={1.2} /></div>
      <div>
        <span className="eyebrow">A little guidance goes a long way</span>
        <h2 id="finder-banner-heading">There&apos;s an AI for that. Let&apos;s find yours.</h2>
        <p>Tell us what you&apos;re working on. We&apos;ll help you find a model that fits your needs, your workflow, and your budget.</p>
      </div>
      <div className="finder-banner-action"><Button asChild size="lg"><Link href="/finder">Find my AI <ArrowRight size={14} /></Link></Button><p>Two questions. A clearer direction.</p></div>
    </section>
  );
}

export function HomePage() {
  const { catalog, recent } = useApp();
  const [tab, setTab] = useState<Tab>("trending");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const featured = sortModels(catalog.models.filter((model) => model.status !== "deprecated"), "featured");
  const heroModels = featured.filter((model, index, all) => all.findIndex((other) => other.providerId === model.providerId) === index).slice(0, 3);
  const shown = (
    tab === "recent" ? sortModels(featured, "recent") :
    tab === "coding" ? featured.filter((model) => model.capabilities.coding.value === true) :
    tab === "multimodal" ? featured.filter((model) => getModalities(model).length > 1) :
    tab === "open" ? featured.filter(isOpen) : featured.filter((model) => model.editorial.trending)
  ).slice(0, 6);
  const providerStrip = catalog.providers.filter((provider) => ["openai", "anthropic", "google", "meta", "deepseek", "mistral", "xai"].some((key) => provider.name.toLowerCase().includes(key))).slice(0, 7);
  const recentModels = recent.flatMap((slug) => catalog.models.filter((model) => model.slug === slug)).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="content-width hero-grid">
          <div>
            <div className="hero-eyebrow"><Sparkles size={12} /><span>A little clarity in the world of AI.</span><ArrowRight size={10} /></div>
            <h1>Compare the world&apos;s<br /><span>leading AI models.</span></h1>
            <p className="hero-description">More models. More possibilities. Less guesswork.<br className="hidden sm:block" /> Explore intelligence, pricing, context, and capabilities.<br className="hidden sm:block" /> Find the right AI for whatever comes next.</p>
            <form className="hero-search" onSubmit={(event) => { event.preventDefault(); router.push(`/models${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`); }}>
              <Search size={17} className="shrink-0 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models, companies, or capabilities..." aria-label="Search the model catalog" />
              <button className="hero-search-submit" aria-label="Explore search results"><ArrowRight size={16} /></button>
            </form>
            <div className="hero-quick-search"><span>Try searching:</span><Link href="/models?q=coding">Coding</Link><Link href="/models?q=open+source">Open-source</Link><Link href="/models?q=large+context">Large context</Link><Link href="/models?q=cheap+API">Affordable APIs</Link></div>
            <div className="hero-actions"><Button asChild size="lg"><Link href="/compare"><ArrowLeftRight size={15} />Compare Models</Link></Button><Button variant="outline" asChild size="lg"><Link href="/models">Explore All Models <ArrowRight size={14} /></Link></Button></div>
            <p className="hero-trust"><ShieldCheck size={12} /> Independently curated. Always source-linked. No made-up scores.</p>
          </div>
          <HeroComparison models={heroModels} />
        </div>
      </section>
      <div className="content-width">
        <div className="provider-strip">
          <p className="provider-strip-label">ALL YOUR FAVORITES.<br /> ONE PLACE.</p>
          <div className="provider-strip-items">{providerStrip.map((provider) => <Link key={provider.id} href={`/companies/${provider.slug}`}><ProviderLogo provider={provider} size={27} /><span>{provider.name.replace(" AI", "")}</span></Link>)}</div>
        </div>
        <section className="section" aria-labelledby="discover-heading">
          <div className="section-heading"><div><h2 id="discover-heading">Good models. Great possibilities.</h2><p>A world of intelligence, without the information overload.</p></div><Link href="/models" className="text-link">Browse all {catalog.models.length} models <ArrowRight size={13} /></Link></div>
          <div className="model-tabs" role="tablist" aria-label="Discover model collections">
            {tabs.map(({ id, label, icon: Icon }, index) => (
              <button key={id} role="tab" id={`tab-${id}`} aria-controls="model-collection" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className="model-tab" onClick={() => setTab(id)} onKeyDown={(event) => {
                if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                setTab(tabs[next].id);
                document.getElementById(`tab-${tabs[next].id}`)?.focus();
              }}><Icon size={12} />{label}</button>
            ))}
          </div>
          <div id="model-collection" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className="model-grid">
            {shown.map((model) => <ModelCard key={model.id} model={model} showTrending={tab === "trending"} />)}
          </div>
          <p className="section-note"><CircleCheck size={10} /> {tab === "open" ? "Open-source and open-weight models are labeled separately. Always check the license." : tab === "recent" ? "Ordered by documented release date, not the date added to our catalog." : "Curated by humans, backed by sources. Not a performance or market-share ranking."} <Link href="/methodology" className="underline underline-offset-2">Our approach</Link></p>
        </section>
        <section className="section popular-section" aria-labelledby="popular-heading">
          <div className="section-heading"><div><h2 id="popular-heading">Big questions. Side by side.</h2><p>Popular comparison starting points. The details make the difference.</p></div><Link href="/compare" className="text-link">Build a comparison <ArrowRight size={13} /></Link></div>
          <ComparisonTeasers />
          <p className="mt-3 text-[9px] text-muted-foreground">Editorial starting points, not traffic rankings. Each comparison identifies the individual model versions.</p>
        </section>
        <FinderBanner />
        {recentModels.length > 0 && (
          <section className="section !pt-0" aria-labelledby="recent-heading">
            <div className="section-heading"><div><h2 id="recent-heading">Pick up where you left off.</h2><p>Your recently viewed models, saved on this device.</p></div></div>
            <div className="model-grid">{recentModels.map((model) => <ModelCard key={model.id} model={model} />)}</div>
          </section>
        )}
      </div>
    </>
  );
}
