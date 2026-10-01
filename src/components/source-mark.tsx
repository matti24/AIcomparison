"use client";

import { BadgeCheck, ExternalLink } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatRelative } from "@/lib/catalog";
import type { Source } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Small source marker shown next to a fact: label, verification date, and link. */
export function SourceMark({ source, note, className }: { source?: Source | null; note?: string; className?: string }) {
  if (!source && !note) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {source ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("inline-grid size-5 shrink-0 place-items-center rounded text-subtle hover:text-foreground", className)}
            aria-label={`Source: ${source.label}, checked ${formatDate(source.checkedAt)}${note ? `. Note: ${note}` : ""}`}
          >
            <ExternalLink size={11} aria-hidden="true" />
          </a>
        ) : (
          <button type="button" className={cn("inline-grid size-5 shrink-0 place-items-center rounded text-[11px] font-semibold text-subtle hover:text-foreground", className)} aria-label={`Note: ${note}`}>i</button>
        )}
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-[320px] text-left">
        {source && (
          <>
            <span className="block font-medium">{source.label}</span>
            <span className="block opacity-80">Checked {formatDate(source.checkedAt)}</span>
          </>
        )}
        {note && <span className={cn("block", source && "mt-1.5 opacity-90")}>{note}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export function VerifiedLabel({ date, prefix = "Verified" }: { date: string | null; prefix?: string }) {
  const { referenceDate } = useApp();
  if (!date) return <span className="verified">Not yet verified</span>;
  return (
    <span className="verified" title={formatDate(date)}>
      <BadgeCheck size={13} aria-hidden="true" /> {prefix} {formatRelative(date, referenceDate)}
    </span>
  );
}
