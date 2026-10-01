"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeftRight, ArrowRight, BarChart3, Clock, Compass, CornerDownLeft, Grid2x2, Layers, Moon, Newspaper, Plus, Search, X,
} from "lucide-react";
import { useApp, MAX_COMPARE } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { collections, comparisonPath, providerPath, searchModels, searchProviders, statusLabels, type ModelSummary } from "@/lib/catalog";
import { track } from "@/lib/analytics";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const { models, providers, providerById, paletteOpen, setPaletteOpen, paletteMode, recentSearches, rememberSearch, clearRecentSearches, selected, toggleSelected } = useApp();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const addMode = paletteMode === "add-to-compare";

  useEffect(() => {
    if (!paletteOpen) {
      const timer = setTimeout(() => { setQuery(""); setActive(0); }, 150);
      return () => clearTimeout(timer);
    }
  }, [paletteOpen]);

  const go = (path: string, remember = true) => {
    if (remember && query.trim()) rememberSearch(query);
    setPaletteOpen(false);
    router.push(path);
  };

  const { items, modelCount, intents } = useMemo(() => {
    const result: Item[] = [];
    const q = query.trim();
    const modelItem = (model: ModelSummary): Item => {
      const provider = providerById.get(model.providerId);
      const isSelected = selected.includes(model.slug);
      return {
        id: `model-${model.slug}`,
        group: addMode ? "Add to comparison" : "Models",
        label: model.name,
        hint: [provider?.name, model.status !== "active" ? statusLabels[model.status] : null, addMode && isSelected ? "Selected" : null].filter(Boolean).join(" · "),
        icon: provider ? <ProviderLogo provider={provider} size={28} /> : null,
        run: () => {
          if (addMode) {
            if (!isSelected) toggleSelected(model.slug);
            if (q) rememberSearch(q);
            setPaletteOpen(false);
          } else go(model.path);
        },
      };
    };

    if (!q) {
      if (!addMode) {
        recentSearches.forEach((value) => result.push({ id: `recent-${value}`, group: "Recent searches", label: value, icon: <Clock size={16} />, run: () => setQuery(value) }));
        result.push(
          { id: "cmd-compare", group: "Commands", label: "Compare models", icon: <ArrowLeftRight size={16} />, run: () => go("/compare", false) },
          { id: "cmd-explore", group: "Commands", label: "Explore models", icon: <Grid2x2 size={16} />, run: () => go("/models", false) },
          { id: "cmd-bench", group: "Commands", label: "Open benchmarks", icon: <BarChart3 size={16} />, run: () => go("/benchmarks", false) },
          { id: "cmd-releases", group: "Commands", label: "Open releases", icon: <Newspaper size={16} />, run: () => go("/releases", false) },
          { id: "cmd-finder", group: "Commands", label: "Find the right AI", icon: <Compass size={16} />, run: () => go("/ai-finder", false) },
          { id: "cmd-theme", group: "Commands", label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`, icon: <Moon size={16} />, run: () => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); setPaletteOpen(false); } },
        );
      }
      models.filter((model) => model.status === "active").slice(0, addMode ? 8 : 5).forEach((model) => result.push({ ...modelItem(model), group: addMode ? "Add to comparison" : "Featured models" }));
      return { items: result, modelCount: 0, intents: [] as string[] };
    }

    const vs = q.split(/\s+(?:vs\.?|versus)\s+/i);
    if (!addMode && vs.length >= 2 && vs.length <= 4 && vs.every(Boolean)) {
      const picks = vs.map((part) => searchModels(models, providers, part).results[0]).filter(Boolean) as ModelSummary[];
      if (picks.length === vs.length && new Set(picks.map((model) => model.slug)).size === picks.length) {
        result.push({
          id: "comparison", group: "Comparison", label: picks.map((model) => model.name).join(" vs "),
          icon: <ArrowLeftRight size={16} />, hint: "Open comparison",
          run: () => go(comparisonPath(picks.map((model) => model.slug))),
        });
      }
    }

    const found = searchModels(models, providers, q);
    found.results.slice(0, addMode ? 12 : 8).forEach((model) => result.push(modelItem(model)));
    if (!addMode) {
      searchProviders(providers, q).slice(0, 4).forEach((provider) => result.push({
        id: `provider-${provider.id}`, group: "Providers", label: provider.name, hint: `${provider.modelCount} models`,
        icon: <ProviderLogo provider={provider} size={28} />, run: () => go(providerPath(provider.slug)),
      }));
      const lower = q.toLowerCase();
      collections.filter((collection) => collection.title.toLowerCase().includes(lower) || collection.heading.toLowerCase().includes(lower) || collection.slug.includes(lower.replace(/\s+/g, "-")))
        .slice(0, 3)
        .forEach((collection) => result.push({ id: `cat-${collection.slug}`, group: "Categories", label: collection.heading, icon: <Layers size={16} />, run: () => go(`/models/${collection.slug}`) }));
      result.push({ id: "all-results", group: "Search", label: `See all results for “${q}”`, icon: <Search size={16} />, hint: `${found.results.length} models`, run: () => go(`/models?q=${encodeURIComponent(q)}`) });
    }
    return { items: result, modelCount: found.results.length, intents: found.intents };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, models, providers, providerById, recentSearches, addMode, selected, resolvedTheme]);

  useEffect(() => {
    if (!paletteOpen || !query.trim()) return;
    const timer = setTimeout(() => {
      track(modelCount ? "search_performed" : "search_no_results", { query: query.trim().slice(0, 80).toLowerCase(), results: modelCount });
    }, 900);
    return () => clearTimeout(timer);
  }, [query, modelCount, paletteOpen]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(index + 1, items.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter") { event.preventDefault(); items[active]?.run(); }
  }

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent className="palette" showCloseButton={false} onKeyDown={onKeyDown}>
        <DialogTitle className="sr-only">{addMode ? "Add a model to the comparison" : "Search AI Compare"}</DialogTitle>
        <DialogDescription className="sr-only">Type to search models, providers, categories, or comparisons such as “claude vs gemini”. Use arrow keys and Enter.</DialogDescription>
        <div className="palette-input">
          {addMode ? <Plus size={18} className="text-muted-foreground" /> : <Search size={18} className="text-muted-foreground" />}
          <input
            autoFocus
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            placeholder={addMode ? `Add a model to compare (${selected.length}/${MAX_COMPARE})…` : "Search models, providers, “cheap coding”, “1m context”, “gpt vs claude”…"}
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
          />
          {query && <button type="button" className="icon-btn !size-8" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}
          <kbd className="desktop-only">Esc</kbd>
        </div>
        {intents.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2 text-xs text-muted-foreground">
            Understood: {intents.map((intent) => <span key={intent} className="badge">{intent}</span>)}
          </div>
        )}
        <div className="palette-list" id="palette-list" role="listbox" ref={listRef} aria-label="Results">
          {items.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No matches for “{query}”</p>
              <p className="mt-1">Try a provider, a capability like “vision”, or “cheap coding”.</p>
            </div>
          )}
          {items.map((item, index) => {
            const header = index === 0 || items[index - 1].group !== item.group ? item.group : null;
            return (
              <div key={item.id}>
                {header && (
                  <div className="palette-group flex items-center justify-between">
                    {header}
                    {header === "Recent searches" && <button type="button" className="normal-case tracking-normal hover:text-foreground" onClick={clearRecentSearches}>Clear</button>}
                  </div>
                )}
                <button
                  type="button"
                  id={`palette-${item.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  className="palette-item"
                  onMouseMove={() => setActive(index)}
                  onClick={item.run}
                >
                  <span className="grid w-7 shrink-0 place-items-center text-muted-foreground">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span>}
                  {index === active && <ArrowRight size={14} className="shrink-0 text-muted-foreground" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="palette-foot">
          <span className="inline-flex items-center gap-1.5"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span className="inline-flex items-center gap-1.5"><kbd><CornerDownLeft size={11} /></kbd> open</span>
          <span className="ml-auto hidden sm:inline">Tip: try “claude vs gemini”</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
