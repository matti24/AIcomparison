"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { ArrowDown, ArrowUp, Columns3, LayoutGrid, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { CompareCheckbox, ModelBadges, ModelCard } from "@/components/model-card";
import { EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  activeFilterCount, AVAILABILITY, categoryLabels, CONTEXT_FILTERS, defaultExploreState, formatDate, formatPrice, formatTokens,
  matchesFilters, MODALITIES, opennessLabels, PRICE_FILTERS, searchModels, serializeExploreState, sortModels, SORTS, STATUS_FILTERS,
  type ExploreState, type ModelSummary, type SortKey,
} from "@/lib/catalog";
import { MODEL_CATEGORIES, type ModelCategory } from "@/lib/types";
import { track } from "@/lib/analytics";

const PAGE_SIZE = 24;

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

interface FilterProps {
  state: ExploreState;
  update: (patch: Partial<ExploreState>) => void;
  counts: { providers: Map<string, number>; categories: Map<ModelCategory, number> };
  lockedCategories?: ModelCategory[];
}

function FilterPanel({ state, update, counts }: FilterProps) {
  const { providers } = useApp();
  const [showAllProviders, setShowAllProviders] = useState(false);
  const sortedProviders = [...providers].sort((a, b) => b.modelCount - a.modelCount || a.name.localeCompare(b.name));
  const visibleProviders = showAllProviders ? sortedProviders : sortedProviders.slice(0, 10);

  const check = (label: string, checked: boolean, onChange: () => void, count?: number, extra?: React.ReactNode) => (
    <label className="filter-option" key={label}>
      <input type="checkbox" className="checkbox" checked={checked} onChange={onChange} />
      {extra}
      <span className="min-w-0 truncate">{label}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </label>
  );
  const radio = (name: string, label: string, checked: boolean, onChange: () => void) => (
    <label className="filter-option" key={label}>
      <input type="radio" name={name} className="checkbox !rounded-full" checked={checked} onChange={onChange} onClick={() => { if (checked) onChange(); }} />
      <span>{label}</span>
    </label>
  );

  return (
    <div>
      <fieldset className="filter-group">
        <legend className="sr-only">Provider</legend>
        <h3 aria-hidden="true">Provider</h3>
        {visibleProviders.map((provider) => check(provider.name, state.providers.includes(provider.id), () => update({ providers: toggle(state.providers, provider.id) }), counts.providers.get(provider.id) ?? 0, <ProviderLogo provider={provider} size={18} />))}
        {providers.length > 10 && (
          <button type="button" className="mt-1 text-[13px] font-medium text-muted-foreground hover:text-foreground" onClick={() => setShowAllProviders((value) => !value)}>
            {showAllProviders ? "Show fewer" : `Show all ${providers.length}`}
          </button>
        )}
      </fieldset>
      <fieldset className="filter-group">
        <legend className="sr-only">Category</legend>
        <h3 aria-hidden="true">Category</h3>
        {MODEL_CATEGORIES.filter((category) => (counts.categories.get(category) ?? 0) > 0 || state.categories.includes(category)).map((category) =>
          check(categoryLabels[category], state.categories.includes(category), () => update({ categories: toggle(state.categories, category) }), counts.categories.get(category) ?? 0))}
      </fieldset>
      <fieldset className="filter-group">
        <legend className="sr-only">Availability</legend>
        <h3 aria-hidden="true">Availability</h3>
        {(Object.keys(AVAILABILITY) as (keyof typeof AVAILABILITY)[]).map((key) => check(AVAILABILITY[key], state.availability.includes(key), () => update({ availability: toggle(state.availability, key) })))}
      </fieldset>
      <fieldset className="filter-group">
        <legend className="sr-only">Modality</legend>
        <h3 aria-hidden="true">Modality</h3>
        {(Object.keys(MODALITIES) as (keyof typeof MODALITIES)[]).map((key) => check(MODALITIES[key], state.modalities.includes(key), () => update({ modalities: toggle(state.modalities, key) })))}
      </fieldset>
      <fieldset className="filter-group">
        <legend className="sr-only">Status</legend>
        <h3 aria-hidden="true">Status</h3>
        {(Object.keys(STATUS_FILTERS) as (keyof typeof STATUS_FILTERS)[]).map((key) => check(STATUS_FILTERS[key], state.status.includes(key), () => update({ status: toggle(state.status, key) })))}
      </fieldset>
      <fieldset className="filter-group">
        <legend className="sr-only">Input price per 1M tokens</legend>
        <h3 aria-hidden="true">Input price</h3>
        {(Object.keys(PRICE_FILTERS) as (keyof typeof PRICE_FILTERS)[]).map((key) => radio("price", PRICE_FILTERS[key], state.price === key, () => update({ price: state.price === key ? null : key })))}
      </fieldset>
      <fieldset className="filter-group border-b-0">
        <legend className="sr-only">Context window</legend>
        <h3 aria-hidden="true">Context</h3>
        {(Object.keys(CONTEXT_FILTERS) as (keyof typeof CONTEXT_FILTERS)[]).map((key) => radio("context", CONTEXT_FILTERS[key], state.context === key, () => update({ context: state.context === key ? null : key })))}
      </fieldset>
    </div>
  );
}

const TABLE_COLUMNS = {
  provider: "Provider",
  category: "Category",
  released: "Released",
  context: "Context",
  maxOutput: "Max output",
  input: "Input /1M",
  cachedInput: "Cached /1M",
  output: "Output /1M",
  license: "License",
} as const;
type ColumnKey = keyof typeof TABLE_COLUMNS;
const DEFAULT_COLUMNS: ColumnKey[] = ["provider", "category", "released", "context", "input", "output", "license"];

const columnSort: Partial<Record<ColumnKey, SortKey>> = { released: "newest", context: "context", input: "price" };

function ResultsTable({ models, sort, setSort }: { models: ModelSummary[]; sort: SortKey; setSort: (sort: SortKey) => void }) {
  const { providerById } = useApp();
  const [columns, setColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const numeric = new Set<ColumnKey>(["context", "maxOutput", "input", "cachedInput", "output"]);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline" size="sm"><Columns3 size={14} /> Columns</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu" align="end" sideOffset={6}>
              {(Object.keys(TABLE_COLUMNS) as ColumnKey[]).map((key) => (
                <DropdownMenu.CheckboxItem
                  key={key}
                  className="menu-item items-center"
                  checked={columns.includes(key)}
                  onCheckedChange={() => setColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : (Object.keys(TABLE_COLUMNS) as ColumnKey[]).filter((item) => current.includes(item) || item === key))}
                  onSelect={(event) => event.preventDefault()}
                >
                  <span className="grid size-4 place-items-center rounded border">{columns.includes(key) ? "✓" : ""}</span>
                  {TABLE_COLUMNS[key]}
                </DropdownMenu.CheckboxItem>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <div className="table-wrap max-h-[75vh]">
        <table className="data-table">
          <caption className="sr-only">AI models matching your filters</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky-col">
                <button type="button" className="sort-btn" onClick={() => setSort("name")} aria-label="Sort by name">
                  Model {sort === "name" && <ArrowDown size={12} aria-hidden="true" />}
                </button>
              </th>
              {columns.map((key) => {
                const sortKey = columnSort[key];
                return (
                  <th key={key} scope="col" className={numeric.has(key) ? "num" : undefined} aria-sort={sortKey && sort === sortKey ? (key === "input" ? "ascending" : "descending") : undefined}>
                    {sortKey ? (
                      <button type="button" className="sort-btn" onClick={() => setSort(sortKey)}>
                        {TABLE_COLUMNS[key]}
                        {sort === sortKey && (key === "input" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                      </button>
                    ) : TABLE_COLUMNS[key]}
                  </th>
                );
              })}
              <th scope="col"><span className="sr-only">Compare</span></th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => {
              const provider = providerById.get(model.providerId);
              return (
                <tr key={model.slug}>
                  <th scope="row" className="sticky-col max-w-[280px] font-normal">
                    <Link href={model.path} className="flex items-center gap-2.5">
                      {provider && <ProviderLogo provider={provider} size={22} />}
                      <span className="truncate font-medium hover:underline">{model.name}</span>
                    </Link>
                    <div className="mt-1 flex gap-1 pl-8"><ModelBadges model={model} limit={2} /></div>
                  </th>
                  {columns.map((key) => {
                    let value: React.ReactNode;
                    switch (key) {
                      case "provider": value = provider?.name; break;
                      case "category": value = categoryLabels[model.categories[0]]; break;
                      case "released": value = formatDate(model.released, "short"); break;
                      case "context": value = formatTokens(model.context, "—"); break;
                      case "maxOutput": value = formatTokens(model.maxOutput, "—"); break;
                      case "input": value = model.input === null && model.otherPrice ? <span className="text-xs text-muted-foreground">Per unit</span> : formatPrice(model.input, "—"); break;
                      case "cachedInput": value = formatPrice(model.cachedInput, "—"); break;
                      case "output": value = formatPrice(model.output, "—"); break;
                      case "license": value = model.openness ? opennessLabels[model.openness] : "—"; break;
                    }
                    return <td key={key} className={numeric.has(key) ? "num" : "text-muted-foreground"}>{value}</td>;
                  })}
                  <td><CompareCheckbox model={model} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExploreModels({ initialState, scope, resultLabel = "models" }: {
  initialState: ExploreState;
  /** Restricts the universe (e.g. a category landing page). */
  scope?: string[];
  resultLabel?: string;
}) {
  const { models: allModels, providers, referenceDate, rememberSearch } = useApp();
  const pathname = usePathname();
  const [state, setState] = useState<ExploreState>(initialState);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const universe = useMemo(() => {
    if (!scope) return allModels;
    const set = new Set(scope);
    return allModels.filter((model) => set.has(model.slug));
  }, [allModels, scope]);

  useEffect(() => {
    const query = serializeExploreState(state);
    const url = query ? `${pathname}?${query}` : pathname;
    if (`${location.pathname}${location.search}` !== url) window.history.replaceState(window.history.state, "", url);
  }, [state, pathname]);

  useEffect(() => {
    if (!state.q.trim()) return;
    const timer = setTimeout(() => rememberSearch(state.q), 1200);
    return () => clearTimeout(timer);
  }, [state.q, rememberSearch]);

  const { results, intents } = useMemo(() => {
    const filtered = universe.filter((model) => matchesFilters(model, state, referenceDate));
    if (state.q.trim()) {
      const searched = searchModels(filtered, providers, state.q);
      return { results: state.sort === "featured" ? searched.results : sortModels(searched.results, state.sort), intents: searched.intents };
    }
    return { results: sortModels(filtered, state.sort), intents: [] as string[] };
  }, [universe, state, referenceDate, providers]);

  useEffect(() => {
    if (!state.q.trim()) return;
    const timer = setTimeout(() => track(results.length ? "search_performed" : "search_no_results", { query: state.q.trim().toLowerCase().slice(0, 80), results: results.length, surface: "explore" }), 1200);
    return () => clearTimeout(timer);
  }, [state.q, results.length]);

  const counts = useMemo(() => {
    const base = universe.filter((model) => matchesFilters(model, { ...state, providers: [], categories: [] }, referenceDate));
    const providerCounts = new Map<string, number>();
    const categoryCounts = new Map<ModelCategory, number>();
    for (const model of base) {
      providerCounts.set(model.providerId, (providerCounts.get(model.providerId) ?? 0) + 1);
      for (const category of model.categories) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
    return { providers: providerCounts, categories: categoryCounts };
  }, [universe, state, referenceDate]);

  const update = (patch: Partial<ExploreState>) => { setState((current) => ({ ...current, ...patch })); setVisible(PAGE_SIZE); };
  const reset = () => { setState({ ...defaultExploreState, sort: state.sort, view: state.view }); setVisible(PAGE_SIZE); };
  const filterCount = activeFilterCount(state);
  const { providerById } = useApp();

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...state.providers.map((id) => ({ key: `p-${id}`, label: providerById.get(id)?.name ?? id, remove: () => update({ providers: state.providers.filter((item) => item !== id) }) })),
    ...state.categories.map((category) => ({ key: `c-${category}`, label: categoryLabels[category], remove: () => update({ categories: state.categories.filter((item) => item !== category) }) })),
    ...state.availability.map((key) => ({ key: `a-${key}`, label: AVAILABILITY[key], remove: () => update({ availability: state.availability.filter((item) => item !== key) }) })),
    ...state.modalities.map((key) => ({ key: `m-${key}`, label: MODALITIES[key], remove: () => update({ modalities: state.modalities.filter((item) => item !== key) }) })),
    ...state.status.map((key) => ({ key: `s-${key}`, label: STATUS_FILTERS[key], remove: () => update({ status: state.status.filter((item) => item !== key) }) })),
    ...(state.price ? [{ key: "price", label: PRICE_FILTERS[state.price], remove: () => update({ price: null }) }] : []),
    ...(state.context ? [{ key: "context", label: `${CONTEXT_FILTERS[state.context]} context`, remove: () => update({ context: null }) }] : []),
  ];

  const filterProps = { state, update, counts };
  const hiddenRetired = !state.status.length && !state.q.trim() ? universe.filter((model) => model.status === "retired").length : 0;

  return (
    <div className="explore-layout">
      <aside className="filters desktop-only" aria-label="Filters">
        <FilterPanel {...filterProps} />
      </aside>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="explore-search" className="sr-only">Search models</label>
            <input
              id="explore-search"
              className="field !pl-9"
              type="search"
              value={state.q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Search models — try “cheap coding”, “vision”, or “1m context”"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="mobile-flex h-10" onClick={() => setDrawerOpen(true)}>
              <SlidersHorizontal size={15} /> Filters{filterCount ? ` (${filterCount})` : ""}
            </Button>
            <label className="sr-only" htmlFor="explore-sort">Sort by</label>
            <select id="explore-sort" className="field !h-10 !w-auto" value={state.sort} onChange={(event) => update({ sort: event.target.value as SortKey })}>
              {(Object.keys(SORTS) as SortKey[]).map((key) => <option key={key} value={key}>{SORTS[key]}</option>)}
            </select>
            <div className="hidden rounded-md border p-0.5 sm:flex" role="group" aria-label="View">
              <button type="button" className="icon-btn !size-8" aria-pressed={state.view === "grid"} aria-label="Grid view" onClick={() => update({ view: "grid" })} data-active={state.view === "grid"} style={state.view === "grid" ? { background: "var(--surface-2)", color: "var(--foreground)" } : undefined}><LayoutGrid size={15} /></button>
              <button type="button" className="icon-btn !size-8" aria-pressed={state.view === "table"} aria-label="Table view" onClick={() => update({ view: "table" })} style={state.view === "table" ? { background: "var(--surface-2)", color: "var(--foreground)" } : undefined}><Rows3 size={15} /></button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="mr-1 text-sm" role="status" aria-live="polite">
            <strong className="tabular">{results.length}</strong> <span className="text-muted-foreground">{resultLabel}</span>
          </p>
          {intents.map((intent) => <span key={intent} className="badge" title="Understood from your search">{intent}</span>)}
          {chips.map((chip) => (
            <button key={chip.key} type="button" className="chip !h-7 !text-[12.5px]" onClick={chip.remove} aria-label={`Remove filter ${chip.label}`}>
              {chip.label} <X size={12} aria-hidden="true" />
            </button>
          ))}
          {(filterCount > 0 || state.q) && <button type="button" className="text-[13px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={reset}>Clear all</button>}
        </div>

        <div className="mt-4">
          {results.length === 0 ? (
            <EmptyState title="No models match these filters." description="Try removing a filter or searching for a provider, capability, or model family.">
              <Button variant="outline" onClick={reset}>Clear filters</Button>
              <Button asChild><Link href="/models">Browse all models</Link></Button>
            </EmptyState>
          ) : state.view === "table" ? (
            <ResultsTable models={results} sort={state.sort} setSort={(sort) => update({ sort })} />
          ) : (
            <>
              <div className="model-grid">{results.slice(0, visible).map((model) => <ModelCard key={model.slug} model={model} />)}</div>
              {visible < results.length && (
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Show more ({results.length - visible} remaining)</Button>
                </div>
              )}
            </>
          )}
          {hiddenRetired > 0 && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              {hiddenRetired} retired {hiddenRetired === 1 ? "model is" : "models are"} hidden.{" "}
              <button type="button" className="font-medium underline underline-offset-2 hover:text-foreground" onClick={() => update({ status: ["retired"] })}>Show retired models</button>
            </p>
          )}
        </div>
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="mobile-drawer">
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription className="sr-only">Filter the model list. Results update immediately.</DialogDescription>
          <FilterPanel {...filterProps} />
          <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t bg-popover p-4">
            <Button variant="outline" className="flex-1" onClick={reset}>Clear</Button>
            <Button className="flex-1" onClick={() => setDrawerOpen(false)}>Show {results.length} results</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
