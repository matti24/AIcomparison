import { cookies } from "next/headers";
import { ADMIN_COOKIE, getAdminConfig, verifyAdminToken } from "@/lib/admin-auth";
import { jsonResponse } from "@/lib/admin-http";
import { readEvents, readSubscribers } from "@/lib/event-store";

export const runtime = "nodejs";

function top(map: Map<string, number>, limit = 10) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function bump(map: Map<string, number>, key: string | null | undefined, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

export async function GET(request: Request) {
  const config = getAdminConfig();
  if (!config || !verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value, config)) {
    return jsonResponse({ error: "Sign in to view analytics." }, 401);
  }
  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days") ?? 30) || 30, 1), 395);
  try {
    const [events, subscribers] = await Promise.all([readEvents(days), readSubscribers()]);
    const sessions = new Set<string>();
    const counts = new Map<string, number>();
    const modelViews = new Map<string, number>();
    const compared = new Map<string, number>();
    const searches = new Map<string, number>();
    const noResults = new Map<string, number>();
    const outbound = new Map<string, number>();
    const pages = new Map<string, number>();
    const daily = new Map<string, number>();
    let affiliateClicks = 0;

    for (const event of events) {
      bump(counts, event.name);
      if (event.session) sessions.add(event.session);
      if (event.name === "page_view") { bump(pages, event.path); bump(daily, event.at.slice(0, 10)); }
      if (event.name === "model_viewed") bump(modelViews, String(event.props.model ?? ""));
      if (event.name === "comparison_viewed") for (const slug of String(event.props.models ?? "").split(",")) bump(compared, slug);
      if (event.name === "search_performed") bump(searches, String(event.props.query ?? ""));
      if (event.name === "search_no_results") bump(noResults, String(event.props.query ?? ""));
      if (event.name === "outbound_click" && event.props.kind) {
        bump(outbound, `${event.props.kind}:${event.props.id}`);
        if (event.props.affiliate === true) affiliateClicks++;
      }
    }

    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    return jsonResponse({
      days,
      totals: {
        visitors: sessions.size,
        pageViews: counts.get("page_view") ?? 0,
        modelViews: counts.get("model_viewed") ?? 0,
        comparisons: counts.get("comparison_viewed") ?? 0,
        comparisonsCreated: counts.get("comparison_created") ?? 0,
        outboundClicks: [...outbound.values()].reduce((sum, value) => sum + value, 0),
        affiliateClicks,
        calculatorUses: counts.get("calculator_used") ?? 0,
        newsletterSignups: subscribers.filter((entry) => entry.list === "newsletter" && entry.createdAt >= since).length,
        subscribers: subscribers.filter((entry) => entry.list === "newsletter" && entry.status === "subscribed").length,
        proWaitlist: subscribers.filter((entry) => entry.list === "pro-waitlist").length,
        apiWaitlist: subscribers.filter((entry) => entry.list === "api-waitlist").length,
        proClicks: counts.get("pro_upgrade_clicked") ?? 0,
      },
      daily: [...daily.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count })),
      topModels: top(modelViews),
      mostCompared: top(compared),
      topPages: top(pages),
      searches: top(searches, 15),
      noResultSearches: top(noResults, 15),
      outbound: top(outbound),
    });
  } catch (error) {
    console.error("Analytics read failed:", error);
    return jsonResponse({ error: "Analytics could not be loaded. Check storage configuration." }, 503);
  }
}
