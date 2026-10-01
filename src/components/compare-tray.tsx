"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Plus, X } from "lucide-react";
import { useApp, MAX_COMPARE } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { comparisonPath } from "@/lib/catalog";

export function CompareTray() {
  const { selected, modelBySlug, providerById, toggleSelected, clearSelected, openPalette } = useApp();
  const pathname = usePathname();
  if (!selected.length || pathname.startsWith("/compare/") || pathname.startsWith("/admin")) return null;
  const models = selected.flatMap((slug) => modelBySlug.get(slug) ?? []);

  return (
    <aside className="tray" aria-label="Comparison tray">
      <span className="tray-label hidden shrink-0 text-[13px] font-medium text-muted-foreground md:inline">Compare</span>
      <div className="tray-slots">
        {models.map((model) => {
          const provider = providerById.get(model.providerId);
          return (
            <span className="tray-chip" key={model.slug}>
              {provider && <ProviderLogo provider={provider} size={24} />}
              <span className="name">{model.name}</span>
              <button type="button" className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-surface-2 hover:text-foreground" onClick={() => toggleSelected(model.slug)} aria-label={`Remove ${model.name} from comparison`}>
                <X size={13} />
              </button>
            </span>
          );
        })}
        {models.length < MAX_COMPARE && (
          <button type="button" className="tray-add" onClick={() => openPalette("add-to-compare")}>
            <Plus size={14} /> <span className="hidden sm:inline">Add model</span>
          </button>
        )}
      </div>
      <button type="button" onClick={clearSelected} className="hidden shrink-0 px-1 text-[13px] text-muted-foreground hover:text-foreground sm:inline">Clear</button>
      {models.length >= 2 ? (
        <Button asChild className="shrink-0">
          <Link href={comparisonPath(selected)}>Compare {models.length}<span className="hidden sm:inline">&nbsp;models</span> <ArrowRight size={15} /></Link>
        </Button>
      ) : (
        <Button className="shrink-0" disabled title="Add at least one more model">Compare <ArrowRight size={15} /></Button>
      )}
    </aside>
  );
}
