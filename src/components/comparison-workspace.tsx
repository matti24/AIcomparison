"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeftRight, ArrowRight, Check, Copy, ExternalLink, Info, Link2, Minus, Plus, RotateCw, Share2, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { ComparisonTeasers } from "@/components/home-page";
import { InfoTip, StatusBadge } from "@/components/model-card";
import { ModelPicker } from "@/components/model-picker";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { comparisonPath, getProvider } from "@/lib/catalog";
import { comparisonGroups, rowIsDifferent, type ComparisonCell } from "@/lib/comparison";
import type { AIModel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ComparisonValue({ cell }: { cell: ComparisonCell }) {
  let content: React.ReactNode;
  if (cell.value === null) content = <span className="text-muted-foreground">Unknown</span>;
  else if (typeof cell.value === "boolean") content = cell.value
    ? <span className="inline-flex items-center gap-1.5 text-[var(--green)]"><Check size={13} />Yes</span>
    : <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Minus size={12} />No</span>;
  else content = cell.display ?? String(cell.value).replace("open-weights", "Open weights").replace("open-source", "Open-source").replace("proprietary", "Proprietary");
  return (
    <span className="comparison-value">
      {content}
      {(cell.note || cell.source) && <Tooltip><TooltipTrigger asChild>
        {cell.source ? <a className="source-icon" href={cell.source.url} target="_blank" rel="noreferrer" aria-label={`Source: ${cell.source.label}`}><ExternalLink size={10} /></a> : <button className="source-icon" aria-label="Specification note"><Info size={10} /></button>}
      </TooltipTrigger><TooltipContent sideOffset={5}>{cell.note && <p>{cell.note}</p>}{cell.source && <p className={cell.note ? "mt-2" : ""}>{cell.source.label} &middot; Checked {cell.source.checkedAt.slice(0, 10)}</p>}</TooltipContent></Tooltip>}
    </span>
  );
}

export function ComparisonWorkspace({ initialModels = [] }: { initialModels?: AIModel[] }) {
  const { catalog, selected, setSelected } = useApp();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [picker, setPicker] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const isDetail = initialModels.length >= 2;
  const slugs = isDetail ? initialModels.map((model) => model.slug) : selected;
  const models = slugs.flatMap((slug) => catalog.models.filter((model) => model.slug === slug));
  const groups = comparisonGroups(catalog).map((group) => ({ ...group, rows: differencesOnly ? group.rows.filter((row) => rowIsDifferent(row, models)) : group.rows })).filter((group) => group.rows.length);
  const differenceCount = comparisonGroups(catalog).flatMap((group) => group.rows).filter((row) => rowIsDifferent(row, models)).length;

  function commit(next: string[]) {
    setSelected(next);
    if (isDetail && next.length >= 2) startTransition(() => router.replace(comparisonPath(next), { scroll: false }));
  }

  function choose(model: AIModel) {
    const next = [...slugs];
    if (picker.index !== null) next[picker.index] = model.slug;
    else next.push(model.slug);
    commit(next);
  }

  async function copyLink() {
    const url = `${window.location.origin}${comparisonPath(slugs)}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Comparison link copied", { description: "Anyone with this link can open the same model comparison." });
    } catch (error) {
      console.error("Clipboard access failed:", error);
      setShareOpen(true);
      toast.error("Clipboard access was blocked. You can copy the link below.");
    }
  }

  async function share() {
    const url = `${window.location.origin}${comparisonPath(slugs)}`;
    setShareUrl(url);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${models.map((model) => model.name).join(" vs ")} | AI Compare`, text: "A clearer view of the AI models that matter.", url });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Native sharing failed:", error);
        toast.error("Sharing is unavailable. Copy the comparison link instead.");
        setShareOpen(true);
      }
    } else setShareOpen(true);
  }

  function modelHeader(model: AIModel, index: number) {
    return (
      <div className="comparison-model-header">
        <div className="flex items-start justify-between">
          <ProviderLogo provider={getProvider(catalog, model.providerId)} size={47} />
          {models.length > 2 && <button className="p-1 text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => commit(slugs.filter((_, position) => position !== index))} aria-label={`Remove ${model.name} from comparison`}><X size={14} /></button>}
        </div>
        <Link href={`/models/${model.slug}`} className="mt-4 block text-base font-semibold tracking-tight hover:text-primary">{model.name}</Link>
        <p className="mt-1 text-[11px] text-muted-foreground">{getProvider(catalog, model.providerId).name}</p>
        <div className="mt-2"><StatusBadge model={model} /></div>
        <button className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-medium text-primary" disabled={isPending} onClick={() => setPicker({ open: true, index })} aria-label={`Swap ${model.name}`}><RotateCw size={11} />Swap Model</button>
      </div>
    );
  }

  return (
    <div className="content-width pb-14">
      <PageHeading eyebrow={isDetail ? "The details, side by side" : "Your next decision, made clearer"} title={isDetail ? "Different models. A clearer picture." : "Great decisions start with a comparison."} description={isDetail ? `Compare ${models.map((model) => model.name).join(", ")} across pricing, capabilities, and the details that matter to you.` : "Choose two to four models. Look beyond the hype. Find the right fit for what you want to do."}>
        {isDetail && <Link href="/compare" className="text-link"><ArrowLeftRight size={13} />New comparison</Link>}
      </PageHeading>
      {!isDetail ? (
        <>
          <div className="comparison-builder">
            {Array.from({ length: 4 }, (_, index) => {
              const model = models[index];
              return model ? <div key={model.slug} className="builder-slot filled">
                <button className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-destructive" onClick={() => commit(slugs.filter((_, position) => position !== index))} aria-label={`Remove ${model.name} from comparison`}><X size={15} /></button>
                <ProviderLogo provider={getProvider(catalog, model.providerId)} size={52} />
                <h2>{model.name}</h2><p>{getProvider(catalog, model.providerId).name}</p>
                <button onClick={() => setPicker({ open: true, index })} className="mt-4 text-[11px] text-primary">Swap model</button>
              </div> : <button key={`slot-${index}`} className="builder-slot" onClick={() => setPicker({ open: true, index: null })} aria-label={`Add model ${index + 1}`}>
                <span className="builder-plus"><Plus size={24} strokeWidth={1.4} /></span><strong>Add a model</strong><span>{index < 2 ? `Model ${index + 1} of 2 required` : "A little extra perspective (optional)"}</span>
              </button>;
            })}
          </div>
          <div className="my-7 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">{models.length < 2 ? `Choose ${2 - models.length} more ${models.length === 1 ? "model" : "models"} to get started.` : `${models.length} models selected. Ready when you are.`}</p>
            {models.length >= 2 ? <Button asChild size="lg"><Link href={comparisonPath(slugs)}>Compare {models.length} models <ArrowRight size={15} /></Link></Button> : <Button disabled size="lg">Compare models <ArrowRight size={15} /></Button>}
          </div>
          <div className="notice"><ShieldCheck size={16} /><p>Independent information, not a leaderboard. We show what is documented, mark what is unknown, and link you directly to the source. No universal &ldquo;AI score.&rdquo;</p></div>
          <section className="section">
            <div className="section-heading"><div><h2>A few good starting points.</h2><p>Familiar products, specific model versions. Pick a pair and make it your own.</p></div></div>
            <ComparisonTeasers limit={7} />
          </section>
        </>
      ) : (
        <>
          <div className="comparison-toolbar" aria-busy={isPending}>
            <button className={cn("difference-toggle", differencesOnly && "active")} aria-pressed={differencesOnly} onClick={() => setDifferencesOnly(!differencesOnly)}><SlidersHorizontal size={14} /><span>Show Differences Only</span><span className="difference-count">{differenceCount}</span></button>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPicker({ open: true, index: null })} disabled={models.length >= 4 || isPending}><Plus size={13} />Add Model</Button>
              <Button variant="outline" size="sm" onClick={copyLink}><Copy size={13} /><span className="hidden sm:inline">Copy Comparison Link</span><span className="sm:hidden">Copy Link</span></Button>
              <Button size="sm" onClick={share}><Share2 size={13} /><span>Share Comparison</span></Button>
            </div>
          </div>
          <div className="comparison-legend"><span><span className="legend-square" /> Different between models</span><span><ExternalLink size={10} /> Source-linked specifications</span><span>USD &middot; standard published pricing</span></div>
          <div className="desktop-comparison data-table-wrapper">
            <table className="comparison-table" style={{ minWidth: 185 + models.length * 210 }}>
              <caption className="sr-only">Side-by-side comparison of {models.map((model) => model.name).join(", ")}. Purple rows highlight differences.</caption>
              <thead><tr><th className="comparison-label-header"><span className="eyebrow">Your shortlist</span><p>{models.length} models.<br />One clear view.</p><span className="mt-3 block text-[10px] font-normal text-muted-foreground">{differenceCount} differences to explore</span></th>{models.map((model, index) => <th key={model.id} scope="col">{modelHeader(model, index)}</th>)}</tr></thead>
              {groups.map((group) => <tbody key={group.title}><tr className="comparison-group-row"><th colSpan={models.length + 1}>{group.title}</th></tr>{group.rows.map((row) => {
                const different = rowIsDifferent(row, models);
                return <tr key={row.key} className={cn("comparison-data-row", different && "is-different")}><th scope="row"><span className="flex items-center gap-1.5">{row.label}{row.help && <InfoTip label={`About ${row.label.toLowerCase()}`}>{row.help}</InfoTip>}</span></th>{models.map((model) => <td key={model.id}><ComparisonValue cell={row.read(model)} /></td>)}</tr>;
              })}</tbody>)}
            </table>
          </div>
          <div className="mobile-comparison">
            <p className="mb-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>Swipe to see every model</span><ArrowLeftRight size={14} /></p>
            <div className="mobile-comparison-track" tabIndex={0} aria-label="Swipeable model comparison cards">
              {models.map((model, index) => <article className="mobile-comparison-card" key={model.id}>
                {modelHeader(model, index)}
                {groups.map((group) => <section key={group.title}><h2 className="mobile-comparison-group">{group.title}</h2><dl>{group.rows.map((row) => <div key={row.key} className={cn("mobile-comparison-row", rowIsDifferent(row, models) && "is-different")}><dt>{row.label}{row.help && <InfoTip label={`About ${row.label.toLowerCase()}`}>{row.help}</InfoTip>}</dt><dd><ComparisonValue cell={row.read(model)} /></dd></div>)}</dl></section>)}
              </article>)}
            </div>
          </div>
          {differencesOnly && !groups.length && <div className="notice mt-4"><Check size={16} /><p>These models match on every listed specification. Turn off &ldquo;Show Differences Only&rdquo; to see all rows.</p></div>}
          <div className="notice mt-5"><Info size={16} /><p>Unknown means we do not have a reliable, documented value. Capabilities can depend on the API, product, region, or provider. Open weights are not automatically open-source. Follow a source icon for context and pricing caveats. <Link href="/methodology">How we compare</Link></p></div>
        </>
      )}
      <ModelPicker open={picker.open} onOpenChange={(open) => setPicker({ ...picker, open })} exclude={slugs} onSelect={choose} title={picker.index === null ? "Add a little perspective." : "A different point of comparison."} />
      <Dialog open={shareOpen} onOpenChange={setShareOpen}><DialogContent>
        <DialogTitle className="flex items-center gap-2"><Link2 size={20} className="text-primary" />Good comparisons are worth sharing.</DialogTitle>
        <DialogDescription>This link opens the same {models.length} model versions. Data will reflect the latest catalog when opened.</DialogDescription>
        <label className="text-xs font-medium" htmlFor="comparison-url">Comparison link</label>
        <input id="comparison-url" readOnly value={shareUrl} onFocus={(event) => event.target.select()} className="w-full rounded-lg border bg-secondary/30 p-3 font-mono text-xs" />
        <Button onClick={copyLink}><Copy size={14} />Copy Comparison Link</Button>
      </DialogContent></Dialog>
    </div>
  );
}
