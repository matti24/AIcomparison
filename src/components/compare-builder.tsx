"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { useApp, MAX_COMPARE } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { comparisonPath, popularComparisons, searchModels, sortModels, statusLabels } from "@/lib/catalog";

function SlotPicker({ index, onPick, exclude }: { index: number; onPick: (slug: string) => void; exclude: string[] }) {
  const { models, providers, providerById } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const pool = models.filter((model) => !exclude.includes(model.slug));
    return (query.trim() ? searchModels(pool, providers, query).results : sortModels(pool.filter((model) => model.status === "active"), "featured")).slice(0, 8);
  }, [models, providers, query, exclude]);
  const listId = `slot-${index}-list`;

  return (
    <div className="relative">
      <div className="flex h-[88px] items-center gap-3 rounded-lg border border-dashed border-border-strong bg-card px-4 focus-within:border-ring">
        <Search size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          placeholder={index < 2 ? `Choose model ${index + 1}` : "Add another model (optional)"}
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={`Model ${index + 1}`}
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, results.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
            if (event.key === "Enter" && results[active]) { event.preventDefault(); onPick(results[active].slug); setQuery(""); }
            if (event.key === "Escape") setOpen(false);
          }}
        />
      </div>
      {open && results.length > 0 && (
        <ul id={listId} role="listbox" className="menu absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto">
          {results.map((model, position) => {
            const provider = providerById.get(model.providerId);
            return (
              <li key={model.slug} id={`${listId}-${position}`} role="option" aria-selected={position === active}>
                <button
                  type="button"
                  className="menu-item w-full items-center"
                  style={position === active ? { background: "var(--surface-2)" } : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(position)}
                  onClick={() => { onPick(model.slug); setQuery(""); }}
                >
                  {provider && <ProviderLogo provider={provider} size={24} />}
                  <span className="min-w-0 flex-1 truncate text-left">{model.name}</span>
                  <span className="text-xs text-muted-foreground">{provider?.name}{model.status !== "active" ? ` · ${statusLabels[model.status]}` : ""}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CompareBuilder() {
  const { selected, setSelected, modelBySlug, providerById, models } = useApp();
  const router = useRouter();
  const slots = Math.min(MAX_COMPARE, Math.max(2, selected.length + 1));
  const popular = popularComparisons(models);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: slots }, (_, index) => {
          const slug = selected[index];
          const model = slug ? modelBySlug.get(slug) : null;
          if (model) {
            const provider = providerById.get(model.providerId);
            return (
              <div key={slug} className="flex h-[88px] items-center gap-3 rounded-lg border bg-card px-4 shadow-[var(--shadow-sm)]">
                {provider && <ProviderLogo provider={provider} size={36} />}
                <div className="min-w-0 flex-1">
                  <Link href={model.path} className="block truncate font-semibold hover:underline">{model.name}</Link>
                  <p className="truncate text-xs text-muted-foreground">{provider?.name}</p>
                </div>
                <button type="button" className="icon-btn !size-8" onClick={() => setSelected(selected.filter((item) => item !== slug))} aria-label={`Remove ${model.name}`}><X size={15} /></button>
              </div>
            );
          }
          return <SlotPicker key={`slot-${index}`} index={index} exclude={selected} onPick={(value) => setSelected([...selected, value].slice(0, MAX_COMPARE))} />;
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={selected.length < 2} onClick={() => router.push(comparisonPath(selected))}>
          Compare {selected.length >= 2 ? `${selected.length} models` : "models"} <ArrowRight size={16} />
        </Button>
        {selected.length > 0 && <Button size="lg" variant="ghost" onClick={() => setSelected([])}>Clear</Button>}
        <p className="text-[13px] text-muted-foreground">{selected.length < 2 ? "Pick at least two models." : `Up to ${MAX_COMPARE} models.`}</p>
      </div>

      <section className="mt-12" aria-labelledby="popular-h">
        <h2 id="popular-h" className="text-xl">Popular comparisons</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((pair) => (
            <li key={pair.title}>
              <Link href={comparisonPath(pair.models.map((model) => model.slug))} className="vs-card">
                <span className="logo-stack">
                  {pair.models.map((model) => { const provider = providerById.get(model.providerId); return provider ? <ProviderLogo key={model.slug} provider={provider} size={28} /> : null; })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{pair.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{pair.models[0].name} vs {pair.models[1].name}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
