"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeftRight, ArrowUpRight, Check, Plus } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { FavoriteButton, useCompareAction, WatchButton } from "@/components/model-card";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

export function ModelActions({ slug, name, id, website, apiDocs, tryLabel, isAffiliate }: {
  slug: string; name: string; id: string; website: string; apiDocs: string | null; tryLabel: string; isAffiliate: boolean;
}) {
  const { markViewed, selected, toggleSelected } = useApp();
  const compare = useCompareAction();
  const inTray = selected.includes(slug);

  useEffect(() => {
    markViewed(slug);
    track("model_viewed", { model: slug });
  }, [slug, markViewed]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => compare(slug)}><ArrowLeftRight size={15} /> Compare</Button>
      <Button variant="outline" onClick={() => toggleSelected(slug)} aria-pressed={inTray}>
        {inTray ? <Check size={15} /> : <Plus size={15} />} {inTray ? "In compare tray" : "Add to compare"}
      </Button>
      <Button variant="outline" asChild>
        <Link href={`/go/model/${id}`} target="_blank" rel={isAffiliate ? "sponsored noopener" : "noopener"} prefetch={false} onClick={() => track("outbound_click", { model: slug, destination: "try" })}>
          {tryLabel} <ArrowUpRight size={14} />
        </Link>
      </Button>
      {apiDocs && (
        <Button variant="outline" asChild>
          <Link href={`/go/model/${id}?dest=docs`} target="_blank" rel="noopener" prefetch={false} onClick={() => track("outbound_click", { model: slug, destination: "docs" })}>
            API docs <ArrowUpRight size={14} />
          </Link>
        </Button>
      )}
      {website !== apiDocs && (
        <Button variant="ghost" asChild className="text-muted-foreground">
          <Link href={`/go/model/${id}?dest=website`} target="_blank" rel="noopener" prefetch={false}>Official website <ArrowUpRight size={14} /></Link>
        </Button>
      )}
      <span className="mx-1 hidden h-6 w-px bg-border sm:inline-block" aria-hidden="true" />
      <FavoriteButton model={{ slug, name }} withLabel />
      <WatchButton type="model" id={slug} name={name} />
    </div>
  );
}
