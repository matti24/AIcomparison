"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, ChevronRight, ExternalLink, Globe2, MapPin, Search } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { ModelCard } from "@/components/model-card";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { formatDate, isOpen, sortModels } from "@/lib/catalog";
import type { Provider } from "@/lib/types";

export function CompaniesPage() {
  const { catalog } = useApp();
  const [query, setQuery] = useState("");
  const providers = catalog.providers.filter((provider) => `${provider.name} ${provider.description} ${provider.country ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="content-width pb-14">
      <PageHeading eyebrow="The people behind the possibilities" title="Meet the minds building AI." description="Different companies. Different philosophies. Explore the providers, products, and model families shaping what comes next." />
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><p className="text-xs text-muted-foreground">{catalog.providers.length} companies. A whole range of approaches.</p><div className="directory-search w-full sm:max-w-sm"><Search size={15} className="text-muted-foreground" /><input placeholder="Find a company..." aria-label="Search companies" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      {providers.length ? <div className="company-grid">{providers.map((provider) => {
        const models = catalog.models.filter((model) => model.providerId === provider.id);
        return <Link href={`/companies/${provider.slug}`} className="company-card" key={provider.id}><div className="flex items-start justify-between"><ProviderLogo provider={provider} size={51} /><ArrowRight size={16} className="mt-2 text-muted-foreground" /></div><h2>{provider.name}</h2><p>{provider.description}</p><div className="company-card-meta"><span><MapPin size={11} />{provider.country ?? "Country not disclosed"}</span><span>{models.length} {models.length === 1 ? "model" : "models"}</span></div><div className="mt-4 flex flex-wrap gap-1.5">{models.some((model) => model.apiAvailable.value === true) && <span className="tag">API available</span>}{models.some(isOpen) && <span className="tag tag-green">Open models</span>}</div></Link>;
      })}</div> : <EmptyState title="No company by that name." description="Try another name, or clear your search to explore all providers."><Button onClick={() => setQuery("")}>Clear search</Button></EmptyState>}
    </div>
  );
}

export function CompanyProfile({ provider }: { provider: Provider }) {
  const { catalog } = useApp();
  const models = sortModels(catalog.models.filter((model) => model.providerId === provider.id), "featured");
  const openSource = models.filter((model) => model.openness.value === "open-source");
  return (
    <div className="content-width pb-14">
      <div className="profile-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/companies">All companies</Link><ChevronRight size={12} /><span>{provider.name}</span></nav>
        <div className="profile-identity"><ProviderLogo provider={provider} size={74} /><div className="flex-1"><span className="eyebrow">The company behind the models</span><h1 className="mt-2">{provider.name}</h1></div><Button asChild variant="outline"><a href={provider.website} target="_blank" rel="noreferrer"><Globe2 size={14} />Official website<ExternalLink size={12} /></a></Button></div>
        <p className="profile-description">{provider.description}</p>
        <div className="profile-meta"><span><MapPin size={12} />{provider.country ?? "Country not disclosed"}</span><span><Building2 size={12} />{provider.founded ? `Founded ${provider.founded}` : "Founded year not disclosed"}</span><span>Catalog updated {formatDate(provider.updatedAt)}</span></div>
      </div>
      <div className="company-stats"><div><strong>{models.length}</strong><span>Models in the catalog</span></div><div><strong>{openSource.length}</strong><span>Open-source models</span></div><div><strong>{models.filter((model) => model.openness.value === "open-weights").length}</strong><span>Open-weight models</span></div><div><strong>{models.some((model) => model.apiAvailable.value === true) ? "Available" : "Not documented"}</strong><span>API access in this family</span></div></div>
      {provider.products.length > 0 && <section className="section"><div className="section-heading"><div><h2>The products. Not the model versions.</h2><p>Applications and platforms from {provider.name}. Products may give access to several underlying models.</p></div></div><div className="product-grid">{provider.products.map((product) => <a key={product.name} href={product.url} target="_blank" rel="noreferrer" className="product-card"><h3>{product.name}<ExternalLink size={12} /></h3><p>{product.description}</p></a>)}</div></section>}
      <section className="section !pt-4"><div className="section-heading"><div><h2>Explore the model family.</h2><p>Individual versions, with their own pricing, capabilities, and release history.</p></div></div>{models.length ? <div className="model-grid">{models.map((model) => <ModelCard key={model.id} model={model} />)}</div> : <EmptyState title="A model family, coming into focus." description="This provider has been added, but no verified model versions are in the catalog yet." />}</section>
      <div className="notice"><Building2 size={15} /><div><p>Company information is source-linked and manually maintained.</p><div className="mt-2 flex flex-wrap gap-4">{provider.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} <ExternalLink size={10} className="inline-block" /></a>)}</div></div></div>
    </div>
  );
}
