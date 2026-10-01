"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, AudioLines, Brain, Eye, Heart, Image as ImageIcon, Info, Type, Video, Wrench, Bell, BellOff } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  badgeLabels, categoryShortLabels, comparisonPath, formatPrice, formatTokens, modelBadges, type BadgeKind, type ModelSummary,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-grid size-5 place-items-center rounded text-subtle hover:text-foreground" aria-label={label}>
          <Info size={12} />
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{children}</TooltipContent>
    </Tooltip>
  );
}

export function Badge({ kind }: { kind: BadgeKind }) {
  return <span className={`badge badge-${kind}`}>{badgeLabels[kind]}</span>;
}

export function ModelBadges({ model, limit = 3 }: { model: ModelSummary; limit?: number }) {
  const { referenceDate } = useApp();
  const badges = modelBadges(model, referenceDate).slice(0, limit);
  if (!badges.length) return null;
  return <>{badges.map((kind) => <Badge key={kind} kind={kind} />)}</>;
}

const CAPABILITY_ICONS = [
  { key: "text", label: "Text", icon: Type, test: (m: ModelSummary) => m.caps.includes("text") },
  { key: "vision", label: "Vision (image input)", icon: Eye, test: (m: ModelSummary) => m.caps.includes("imageInput") },
  { key: "image", label: "Image generation or editing", icon: ImageIcon, test: (m: ModelSummary) => m.caps.includes("imageOutput") || m.caps.includes("imageEditing") },
  { key: "audio", label: "Audio input or output", icon: AudioLines, test: (m: ModelSummary) => m.caps.includes("audioInput") || m.caps.includes("audioOutput") },
  { key: "video", label: "Video input or generation", icon: Video, test: (m: ModelSummary) => m.caps.includes("videoInput") || m.caps.includes("videoOutput") },
  { key: "tools", label: "Tool calling", icon: Wrench, test: (m: ModelSummary) => m.caps.includes("toolCalling") },
  { key: "reasoning", label: "Reasoning", icon: Brain, test: (m: ModelSummary) => m.caps.includes("reasoning") },
] as const;

export function CapabilityIcons({ model }: { model: ModelSummary }) {
  const supported = CAPABILITY_ICONS.filter((entry) => entry.test(model));
  if (!supported.length) return <span className="text-xs text-subtle">Capabilities not disclosed</span>;
  return (
    <ul className="cap-icons" aria-label="Documented capabilities">
      {supported.map(({ key, label, icon: Icon }) => (
        <li key={key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cap-icon" tabIndex={0} aria-label={label}><Icon size={13} aria-hidden="true" /></span>
            </TooltipTrigger>
            <TooltipContent sideOffset={4}>{label}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}

export function FavoriteButton({ model, className, withLabel = false }: { model: Pick<ModelSummary, "slug" | "name">; className?: string; withLabel?: boolean }) {
  const { isFavorite, toggleFavorite } = useApp();
  const saved = isFavorite(model.slug);
  return (
    <button
      type="button"
      className={cn(withLabel ? "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-[var(--shadow-sm)] hover:bg-surface-2" : "icon-btn !size-8", className)}
      onClick={() => toggleFavorite(model.slug)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : `${saved ? "Remove" : "Add"} ${model.name} ${saved ? "from" : "to"} favorites`}
    >
      <Heart size={16} className={saved ? "fill-[#e11d48] text-[#e11d48]" : undefined} aria-hidden="true" />
      {withLabel && (saved ? "Saved" : "Favorite")}
    </button>
  );
}

export function WatchButton({ type, id, name }: { type: "model" | "provider"; id: string; name: string }) {
  const { isWatching, toggleWatch } = useApp();
  const watching = isWatching(type, id);
  return (
    <button
      type="button"
      onClick={() => toggleWatch(type, id)}
      aria-pressed={watching}
      className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-[var(--shadow-sm)] hover:bg-surface-2"
      title={watching ? `Stop following ${name}` : `Get notified about ${name} pricing changes, releases, and deprecations`}
    >
      {watching ? <BellOff size={15} aria-hidden="true" /> : <Bell size={15} aria-hidden="true" />}
      {watching ? "Following" : "Follow"}
    </button>
  );
}

export function useCompareAction() {
  const { selected, toggleSelected, openPalette } = useApp();
  const router = useRouter();
  return (slug: string) => {
    const next = selected.includes(slug) ? selected : [...selected, slug].slice(-4);
    if (!selected.includes(slug)) toggleSelected(slug);
    if (next.length >= 2) router.push(comparisonPath(next));
    else openPalette("add-to-compare");
  };
}

export function CompareCheckbox({ model }: { model: Pick<ModelSummary, "slug" | "name"> }) {
  const { selected, toggleSelected } = useApp();
  const checked = selected.includes(model.slug);
  return (
    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-[12.5px] text-muted-foreground hover:text-foreground">
      <input type="checkbox" className="checkbox" checked={checked} onChange={() => toggleSelected(model.slug)} aria-label={`Add ${model.name} to compare`} />
      <span aria-hidden="true">Add to compare</span>
    </label>
  );
}

function Stat({ label, value, unknown }: { label: string; value: string; unknown?: boolean }) {
  return (
    <div>
      <span className="stat-label">{label}</span>
      <span className={cn("stat-value", unknown && "unknown")}>{value}</span>
    </div>
  );
}

export function ModelCard({ model, reason }: { model: ModelSummary; reason?: React.ReactNode }) {
  const { providerById, selected } = useApp();
  const compare = useCompareAction();
  const provider = providerById.get(model.providerId);
  const tokenPriced = model.input !== null || model.output !== null;

  return (
    <article className="model-card" data-selected={selected.includes(model.slug)} data-testid="model-card">
      <div className="flex items-start gap-3">
        {provider && <ProviderLogo provider={provider} size={36} />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate"><Link href={model.path} className="model-card-title">{model.name}</Link></h3>
          <p className="truncate text-[13px] text-muted-foreground">{provider?.name} · {categoryShortLabels[model.categories[0]]}</p>
        </div>
        <FavoriteButton model={model} className="-mr-1.5 -mt-1" />
      </div>

      <div className="flex min-h-[22px] flex-wrap gap-1.5">
        <ModelBadges model={model} />
        {model.api === true && <span className="badge">API</span>}
      </div>

      {reason ?? <p className="line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground">{model.description}</p>}

      <div className="stats">
        {tokenPriced || model.context !== null ? (
          <>
            <Stat label="Context" value={formatTokens(model.context, "—")} unknown={model.context === null} />
            <Stat label="Input /1M" value={formatPrice(model.input, "—")} unknown={model.input === null} />
            <Stat label="Output /1M" value={formatPrice(model.output, "—")} unknown={model.output === null} />
          </>
        ) : (
          <>
            <Stat label="Type" value={categoryShortLabels[model.categories[0]]} />
            <Stat label="API" value={model.api === true ? "Yes" : model.api === false ? "No" : "—"} unknown={model.api === null} />
            <Stat label="Pricing" value={model.otherPrice ? "Per unit" : "—"} unknown={!model.otherPrice} />
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <CapabilityIcons model={model} />
        <CompareCheckbox model={model} />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-3">
        <button type="button" onClick={() => compare(model.slug)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border text-[13.5px] font-medium hover:bg-surface-2">
          <ArrowLeftRight size={14} aria-hidden="true" /> Compare
        </button>
        <Link href={model.path} className="inline-flex h-9 items-center justify-center rounded-md bg-foreground text-[13.5px] font-medium text-background hover:opacity-90">
          View details
        </Link>
      </div>
    </article>
  );
}

export function ModelCardSkeleton() {
  return (
    <div className="model-card" aria-hidden="true">
      <div className="flex items-center gap-3"><div className="skeleton size-9" /><div className="flex-1"><div className="skeleton h-4 w-2/3" /><div className="skeleton mt-2 h-3 w-1/3" /></div></div>
      <div className="skeleton h-5 w-1/2" />
      <div className="skeleton h-3 w-full" /><div className="skeleton -mt-2 h-3 w-4/5" />
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-6 w-1/3" />
    </div>
  );
}
