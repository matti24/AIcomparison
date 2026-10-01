import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SponsoredPlacement, SponsorSlot } from "@/lib/types";

export function activePlacements(placements: SponsoredPlacement[], slot: SponsorSlot, now: string) {
  return placements.filter((placement) => placement.enabled && placement.slot === slot &&
    placement.startsAt <= now && (!placement.endsAt || placement.endsAt >= now));
}

/** Always visibly labeled; never mixed into rankings or comparison results. */
export function SponsoredCard({ placement }: { placement: SponsoredPlacement }) {
  return (
    <aside className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center" aria-label={`Sponsored by ${placement.sponsor}`} style={{ background: "var(--sponsor-bg)" }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="badge badge-sponsored">Sponsored</span>
          <span className="text-[13px] text-muted-foreground">by {placement.sponsor}</span>
        </div>
        <p className="mt-2 font-semibold">{placement.title}</p>
        <p className="mt-0.5 text-[14px] text-muted-foreground">{placement.description}</p>
      </div>
      <Link
        href={`/go/sponsor/${placement.id}`}
        rel="sponsored noopener"
        target="_blank"
        prefetch={false}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-surface-2"
      >
        Learn more <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </aside>
  );
}

export function SponsoredSlot({ placements, slot, now }: { placements: SponsoredPlacement[]; slot: SponsorSlot; now: string }) {
  const active = activePlacements(placements, slot, now)[0];
  return active ? <SponsoredCard placement={active} /> : null;
}
