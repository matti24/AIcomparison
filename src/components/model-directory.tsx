"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, LayoutGrid, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { FavoriteButton, ModelCard, StatusBadge } from "@/components/model-card";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  capabilityLabels, filterModels, formatContext, formatPrice, getProvider, opennessLabel,
  sortModels, typeLabels, type Availability, type ModelFilters, type SortOrder,
} from "@/lib/catalog";
import { CAPABILITIES, type Capability, type ModelType } from "@/lib/types";

const availabilityOptions: { value: Availability; label: string }[] = [
  { value: "free", label: "Free access" }, { value: "paid", label: "Paid" },
  { value: "api", label: "API available" }, { value: "open", label: "Open-source license" },
  { value: "self-hosted", label: "Self-hosted / local" },
];
const directoryCapabilities: Capability[] = ["text", "imageInput", "imageOutput", "audioInput", "audioOutput", "videoInput", "videoOutput", "webSearch", "toolCalling", "reasoning", "coding"];
const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "featured", label: "Editor's picks" }, { value: "recent", label: "Recently released" },
  { value: "popular", label: "Most popular (editorial)" }, { value: "trending", label: "Trending (editorial)" },
  { value: "cheapest", label: "Lowest input price" }, { value: "context", label: "Largest context" },
];

function readFilters(params: URLSearchParams): ModelFilters {
  return {
    query: params.get("q") ?? "",
    providers: params.getAll("provider"),
    types: params.getAll("type").filter((value): value is ModelType => Object.hasOwn(typeLabels, value)),
    availability: params.getAll("availability").filter((value): value is Availability => availabilityOptions.some((option) => option.value === value)),
    capabilities: params.getAll("cap").filter((value): value is Capability => CAPABILITIES.some((key) => key === value)),
  };
}

export function ModelDirectory() {
  const { catalog, selected, toggleSelected } = useApp();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const filters = readFilters(params);
  const sort = sortOptions.find((option) => option.value === params.get("sort"))?.value ?? "featured";
  const view = params.get("view") === "table" ? "table" : "grid";
  const [filterOpen, setFilterOpen] = useState(false);
  const [allProviders, setAllProviders] = useState(false);
  const results = sortModels(filterModels(catalog, filters), sort);
  const activeCount = filters.providers.length + filters.types.length + filters.availability.length + filters.capabilities.length;

  function updateParam(key: string, value: string, multiple = false) {
    const next = new URLSearchParams(searchParams.toString());
    if (multiple) {
      const current = next.getAll(key);
      next.delete(key);
      (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]).forEach((item) => next.append(key, item));
    } else if (value) next.set(key, value);
    else next.delete(key);
    window.history.replaceState(null, "", `/models${next.size ? `?${next.toString()}` : ""}`);
  }

  function resetFilters() {
    const next = new URLSearchParams();
    if (view === "table") next.set("view", "table");
    window.history.replaceState(null, "", `/models${next.size ? `?${next.toString()}` : ""}`);
  }

  const sidebar = (
    <aside className="filter-sidebar" aria-label="Model filters">
      <div className="filter-sidebar-heading"><span className="flex items-center gap-2"><SlidersHorizontal size={13} /> Filters{activeCount > 0 && <span className="tag tag-purple">{activeCount}</span>}</span><button onClick={resetFilters} className="text-[10px] font-normal text-primary">Reset all</button></div>
      <details className="filter-group" open><summary>Provider <ChevronDown size={12} /></summary><div className="filter-group-content">
        {catalog.providers.slice(0, allProviders ? undefined : 7).map((provider) => <label className="filter-option" key={provider.id}><input type="checkbox" aria-label={provider.name} checked={filters.providers.includes(provider.id)} onChange={() => updateParam("provider", provider.id, true)} /><span>{provider.name}</span><span className="filter-option-count" aria-hidden="true">{catalog.models.filter((model) => model.providerId === provider.id).length}</span></label>)}
        {catalog.providers.length > 7 && <button onClick={() => setAllProviders(!allProviders)} className="w-fit text-[10px] text-primary">{allProviders ? "Show fewer" : `+ ${catalog.providers.length - 7} more providers`}</button>}
      </div></details>
      <details className="filter-group" open><summary>Model type <ChevronDown size={12} /></summary><div className="filter-group-content">
        {Object.entries(typeLabels).map(([value, label]) => <label className="filter-option" key={value}><input type="checkbox" checked={filters.types.some((type) => type === value)} onChange={() => updateParam("type", value, true)} /><span>{label}</span></label>)}
      </div></details>
      <details className="filter-group" open><summary>Availability <ChevronDown size={12} /></summary><div className="filter-group-content">
        {availabilityOptions.map(({ value, label }) => <label className="filter-option" key={value}><input type="checkbox" checked={filters.availability.includes(value)} onChange={() => updateParam("availability", value, true)} /><span>{label}</span></label>)}
      </div></details>
      <details className="filter-group" open><summary>Capabilities <ChevronDown size={12} /></summary><div className="filter-group-content">
        {directoryCapabilities.map((value) => <label className="filter-option" key={value}><input type="checkbox" checked={filters.capabilities.includes(value)} onChange={() => updateParam("cap", value, true)} /><span>{capabilityLabels[value]}</span></label>)}
      </div></details>
      <p className="mt-4 text-[10px] leading-5 text-muted-foreground">Capabilities and availability combine with AND. Unknown specifications do not count as supported.</p>
    </aside>
  );

  return (
    <div className="content-width">
      <PageHeading eyebrow="The model directory" title="A world of AI. Yours to explore." description="Discover the model that fits. Compare the details that matter. Make your next move with confidence." />
      <div className="directory-layout">
        {sidebar}
        <div className="min-w-0">
          <div className="directory-search"><Search size={16} className="text-muted-foreground" /><input value={filters.query} onChange={(event) => updateParam("q", event.target.value)} placeholder="Search models, providers, or capabilities..." aria-label="Search models in directory" />{filters.query && <button onClick={() => updateParam("q", "")} aria-label="Clear search"><X size={14} /></button>}</div>
          <div className="directory-toolbar">
            <div className="flex items-center gap-3">
              <Button className="min-[761px]:hidden" variant="outline" size="sm" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={13} />Filters{activeCount > 0 && ` (${activeCount})`}</Button>
              <p aria-live="polite"><strong className="font-semibold">{results.length}</strong> <span className="text-muted-foreground">of {catalog.models.length} models</span></p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2"><span className="hidden text-muted-foreground sm:inline">Sort by</span><select value={sort} onChange={(event) => updateParam("sort", event.target.value)} aria-label="Sort models">{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <div className="view-toggle" role="group" aria-label="Directory view"><button aria-label="Card view" aria-pressed={view === "grid"} onClick={() => updateParam("view", "grid")}><LayoutGrid size={14} /></button><button aria-label="Table view" aria-pressed={view === "table"} onClick={() => updateParam("view", "table")}><List size={15} /></button></div>
            </div>
          </div>
          {activeCount > 0 && <div className="active-filters">
            {filters.providers.map((value) => <button className="active-filter" key={value} onClick={() => updateParam("provider", value, true)}>{catalog.providers.find((provider) => provider.id === value)?.name ?? value}<X size={10} /></button>)}
            {filters.types.map((value) => <button className="active-filter" key={value} onClick={() => updateParam("type", value, true)}>{typeLabels[value]}<X size={10} /></button>)}
            {filters.availability.map((value) => <button className="active-filter" key={value} onClick={() => updateParam("availability", value, true)}>{availabilityOptions.find((option) => option.value === value)?.label}<X size={10} /></button>)}
            {filters.capabilities.map((value) => <button className="active-filter" key={value} onClick={() => updateParam("cap", value, true)}>{capabilityLabels[value]}<X size={10} /></button>)}
          </div>}
          {results.length === 0 ? <EmptyState title="No models in this corner. Yet." description="Try broadening your search or removing a filter. We only include capabilities that are documented."><Button onClick={resetFilters}>Clear all filters <ArrowRight size={14} /></Button></EmptyState> :
            view === "grid" ? <div className="model-grid">{results.map((model) => <ModelCard key={model.id} model={model} showTrending={sort === "trending"} />)}</div> :
              <div className="data-table-wrapper"><table className="data-table"><caption className="sr-only">AI model directory with input prices in USD per million tokens</caption><thead><tr><th>Model</th><th>Context</th><th>Input / 1M</th><th>License</th><th>API</th><th>Actions</th></tr></thead><tbody>
                {results.map((model) => <tr key={model.id}>
                  <td><div className="flex items-center gap-3"><ProviderLogo provider={getProvider(catalog, model.providerId)} size={34} /><div><Link href={`/models/${model.slug}`} className="font-semibold hover:text-primary">{model.name}</Link><p className="mt-1 text-[9px] text-muted-foreground">{getProvider(catalog, model.providerId).name}</p><StatusBadge model={model} /></div></div></td>
                  <td>{formatContext(model.contextWindow.value)}</td><td>{formatPrice(model.pricing.input.value)}</td><td>{opennessLabel(model)}</td><td>{model.apiAvailable.value === null ? "Unknown" : model.apiAvailable.value ? "Yes" : "No"}</td>
                  <td><div className="flex items-center gap-3"><button className="card-compare" onClick={() => toggleSelected(model.slug)} aria-label={`${selected.includes(model.slug) ? "Remove" : "Add"} ${model.name} ${selected.includes(model.slug) ? "from" : "to"} comparison`} aria-pressed={selected.includes(model.slug)}>{selected.includes(model.slug) ? <Check size={12} /> : <Plus size={12} />}Compare</button><FavoriteButton model={model} /></div></td>
                </tr>)}
              </tbody></table></div>}
          <div className="mt-5 space-y-1 text-[10px] leading-5 text-muted-foreground">
            <p>Input prices are USD per 1M tokens, not a total cost estimate. Unknown prices sort last. &ldquo;Popular&rdquo; and &ldquo;trending&rdquo; are editorial, not usage metrics.</p>
            <p>Search shortcuts: &ldquo;cheap&rdquo; means input &le; $1 / 1M tokens; &ldquo;large context&rdquo; means at least 128K tokens. Open-source and open weights are different licenses.</p>
          </div>
        </div>
      </div>
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="mobile-filter-content">
          <DialogTitle>Make it your shortlist</DialogTitle><DialogDescription>Refine the model directory with documented specifications.</DialogDescription>
          {sidebar}
          <Button onClick={() => setFilterOpen(false)}>Show {results.length} models <ArrowRight size={14} /></Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
