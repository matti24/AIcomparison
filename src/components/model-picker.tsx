"use client";

import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatContext, getProvider, matchesSearch, sortModels } from "@/lib/catalog";
import type { AIModel } from "@/lib/types";

export function ModelPicker({ open, onOpenChange, exclude, onSelect, title = "Add a little perspective." }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exclude: string[];
  onSelect: (model: AIModel) => void;
  title?: string;
}) {
  const { catalog } = useApp();
  const [query, setQuery] = useState("");
  const models = sortModels(catalog.models.filter((model) => !exclude.includes(model.slug) && matchesSearch(model, getProvider(catalog, model.providerId), query)), "featured");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle className="text-xl">{title}</DialogTitle>
        <DialogDescription>Choose a model to see how the details compare.</DialogDescription>
        <div className="directory-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search model or provider..." aria-label="Search models to compare" /></div>
        <div className="max-h-[47vh] overflow-y-auto pr-1">
          {models.map((model) => (
            <button key={model.id} className="search-result" onClick={() => { onSelect(model); onOpenChange(false); setQuery(""); }}>
              <ProviderLogo provider={getProvider(catalog, model.providerId)} size={40} />
              <span className="min-w-0 flex-1 text-left"><span className="block text-sm font-semibold">{model.name} {model.status !== "available" && <span className="tag tag-amber ml-1">{model.status}</span>}</span><span className="mt-1 block text-[11px] text-muted-foreground">{getProvider(catalog, model.providerId).name} <span className="mx-1">&middot;</span> {formatContext(model.contextWindow.value)} context</span></span>
              <ArrowRight size={15} className="text-primary" />
            </button>
          ))}
          {!models.length && <p className="px-3 py-10 text-center text-sm text-muted-foreground">No matching models. Try a different search.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
