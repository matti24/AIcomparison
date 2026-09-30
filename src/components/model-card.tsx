"use client";

import Link from "next/link";
import { ArrowRight, Check, Code2, Info, Plus, Star, TrendingUp, Zap } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatContext, formatPrice, getModalities, getProvider, opennessLabel, typeLabels } from "@/lib/catalog";
import type { AIModel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><button type="button" className="inline-flex text-muted-foreground hover:text-primary" aria-label={label}><Info size={11} /></button></TooltipTrigger>
      <TooltipContent sideOffset={6}>{children}</TooltipContent>
    </Tooltip>
  );
}

export function StatusBadge({ model }: { model: AIModel }) {
  const { referenceDate } = useApp();
  if (model.status === "deprecated") return <span className="tag tag-amber">Deprecated</span>;
  if (model.status === "preview") return <span className="tag tag-amber">Preview</span>;
  const release = model.releaseDate.value ? new Date(model.releaseDate.value).getTime() : 0;
  const now = new Date(referenceDate).getTime();
  if (release <= now && release > now - 45 * 24 * 60 * 60 * 1000) return <span className="tag tag-green">New release</span>;
  const update = new Date(model.updatedAt).getTime();
  if (update > release && update <= now && update > now - 14 * 24 * 60 * 60 * 1000) return <span className="tag tag-outline">Updated</span>;
  return null;
}

export function FavoriteButton({ model }: { model: AIModel }) {
  const { favorites, toggleFavorite } = useApp();
  const saved = favorites.some((entry) => entry.slug === model.slug);
  return (
    <button
      className={cn("favorite-button", saved && "is-favorite")}
      onClick={() => toggleFavorite(model.slug)}
      aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Save"} ${model.name} ${saved ? "from" : "to"} watchlist`}
    >
      <Star size={17} strokeWidth={1.5} />
    </button>
  );
}

export function ModelCard({ model, showTrending = false }: { model: AIModel; showTrending?: boolean }) {
  const { catalog, selected, toggleSelected } = useApp();
  const provider = getProvider(catalog, model.providerId);
  const isSelected = selected.includes(model.slug);
  const modalities = getModalities(model);
  return (
    <article className={cn("model-card", isSelected && "is-selected")} data-testid="model-card">
      <div className="model-card-header">
        <ProviderLogo provider={provider} size={43} />
        <div className="min-w-0">
          <Link href={`/models/${model.slug}`} className="model-card-title">{model.name}</Link>
          <p className="model-card-provider">by <Link href={`/companies/${provider.slug}`} className="hover:text-primary">{provider.name}</Link></p>
        </div>
        <FavoriteButton model={model} />
      </div>
      <p className="model-card-description">{model.description}</p>
      <div className="model-card-badges">
        {showTrending && model.editorial.trending ? <span className="tag tag-purple"><TrendingUp size={10} /> Trending pick</span> : <span className="tag">{typeLabels[model.type]}</span>}
        {model.capabilities.reasoning.value === true && <span className="tag"><Zap size={9} /> Reasoning</span>}
        {model.capabilities.reasoning.value !== true && model.capabilities.coding.value === true && <span className="tag"><Code2 size={10} /> Coding</span>}
        {modalities.length > 1 && <span className="tag tag-green">Multimodal</span>}
        <StatusBadge model={model} />
      </div>
      <dl className="model-card-stats">
        <div><dt>Context <InfoTip label="What is a context window?">The maximum number of tokens a model can process in one request, including input and output. Limits may depend on the API tier.</InfoTip></dt><dd>{formatContext(model.contextWindow.value)}{model.contextWindow.value !== null && <span className="ml-1 text-[9px] font-normal text-muted-foreground">tokens</span>}</dd></div>
        <div><dt>Input / 1M <InfoTip label="How are prices measured?">Published USD per million input tokens. Output tokens, caching, tools, and provider tiers may cost extra. See the model profile for sources.</InfoTip></dt><dd>{formatPrice(model.pricing.input.value)}</dd></div>
        <div><dt>License</dt><dd className={model.openness.value !== "proprietary" && model.openness.value !== null ? "text-[var(--green)]" : ""}>{opennessLabel(model)}</dd></div>
      </dl>
      <div className="model-card-footer">
        <button className="card-compare" onClick={() => toggleSelected(model.slug)} aria-pressed={isSelected} aria-label={`${isSelected ? "Remove" : "Add"} ${model.name} ${isSelected ? "from" : "to"} comparison`}>
          {isSelected ? <Check size={12} /> : <Plus size={12} />}{isSelected ? "Selected" : "Compare"}
        </button>
        <Link href={`/models/${model.slug}`} className="text-link">View model <ArrowRight size={12} /></Link>
      </div>
    </article>
  );
}
