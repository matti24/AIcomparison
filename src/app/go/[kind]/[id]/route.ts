import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog-store";
import { recordEvent } from "@/lib/event-store";

export const runtime = "nodejs";

function withUtm(target: string, campaign: string | null) {
  try {
    const url = new URL(target);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", "aicompare");
      url.searchParams.set("utm_medium", "referral");
      if (campaign) url.searchParams.set("utm_campaign", campaign);
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Tracked outbound redirect: /go/model/<id>[?dest=docs|website], /go/provider/<id>, /go/sponsor/<id>.
 * Destinations come only from the catalog, so this cannot be used as an open redirect.
 */
export async function GET(request: Request, { params }: RouteContext<"/go/[kind]/[id]">) {
  const { kind, id } = await params;
  const dest = new URL(request.url).searchParams.get("dest");
  const catalog = await getCatalog();
  let target: string | null = null;
  let campaign: string | null = null;
  let affiliate = false;

  if (kind === "model") {
    const model = catalog.models.find((entry) => entry.id === id);
    if (model) {
      const link = catalog.links.find((entry) => entry.targetType === "model" && entry.targetId === id && entry.enabled);
      if (dest === "docs") target = model.apiDocs ?? model.website;
      else if (dest === "website") target = model.website;
      else {
        target = link ? (link.isAffiliate && link.affiliateUrl ? link.affiliateUrl : link.destinationUrl) : model.website;
        campaign = link?.utmCampaign ?? "model-page";
        affiliate = Boolean(link?.isAffiliate);
      }
    }
  } else if (kind === "provider") {
    const provider = catalog.providers.find((entry) => entry.id === id);
    if (provider) {
      const link = catalog.links.find((entry) => entry.targetType === "provider" && entry.targetId === id && entry.enabled);
      target = link ? (link.isAffiliate && link.affiliateUrl ? link.affiliateUrl : link.destinationUrl) : provider.website;
      campaign = link?.utmCampaign ?? "provider-page";
      affiliate = Boolean(link?.isAffiliate);
    }
  } else if (kind === "sponsor") {
    const placement = catalog.sponsored.find((entry) => entry.id === id && entry.enabled);
    if (placement) { target = placement.url; campaign = `sponsored-${placement.slot}`; }
  }

  const url = target ? withUtm(target, campaign) : null;
  if (!url) return NextResponse.redirect(new URL("/models", request.url), 302);

  // Aggregate, cookie-free click counting so affiliate performance is measurable.
  if (!/bot|crawl|spider|preview/i.test(request.headers.get("user-agent") ?? "")) {
    await recordEvent({ name: "outbound_click", props: { kind, id, dest: dest ?? "try", affiliate }, path: null, session: null }).catch((error) => console.error("Outbound click not recorded:", error));
  }
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
