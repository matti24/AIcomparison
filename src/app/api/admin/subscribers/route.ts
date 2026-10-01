import { cookies } from "next/headers";
import { ADMIN_COOKIE, getAdminConfig, verifyAdminToken } from "@/lib/admin-auth";
import { jsonResponse } from "@/lib/admin-http";
import { readSubscribers } from "@/lib/event-store";

export const runtime = "nodejs";

function csvCell(value: string) {
  // Prevent spreadsheet formula injection and escape quotes.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const config = getAdminConfig();
  if (!config || !verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value, config)) {
    return jsonResponse({ error: "Sign in to export subscribers." }, 401);
  }
  try {
    const subscribers = await readSubscribers();
    const csv = ["email,list,source,status,created_at", ...subscribers.map((entry) => [entry.email, entry.list, entry.source, entry.status, entry.createdAt].map(csvCell).join(","))].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ai-compare-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Subscriber export failed:", error);
    return jsonResponse({ error: "Subscribers could not be exported." }, 503);
  }
}
