"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Archive, ArrowRight, BarChart3, Building2, Check, Download, ExternalLink, FileJson, Info, Link2, ListChecks, LoaderCircle, LockKeyhole,
  LogOut, Megaphone, Plus, RotateCcw, Save, Search, ShieldCheck, Trash2, TriangleAlert, X, Boxes,
} from "lucide-react";
import { ProviderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { newLinkTemplate, newModelTemplate, newProviderTemplate, newSponsoredTemplate } from "@/lib/admin-templates";
import { catalogSchema } from "@/lib/catalog-schema";
import { formatDate, getProvider, modelPath, statusLabels } from "@/lib/catalog";
import type { AIModel, Catalog, ChangelogEntry, OutboundLink, Provider, SponsoredPlacement } from "@/lib/types";
import { cn } from "@/lib/utils";

const responseSchema = z.object({
  configured: z.boolean().optional(),
  authenticated: z.boolean().optional(),
  catalog: catalogSchema.optional(),
  storage: z.enum(["local", "supabase"]).optional(),
  error: z.string().optional(),
  issues: z.array(z.string()).optional(),
});

const modelSections = [
  { value: "record", label: "Full record" },
  { value: "pricing", label: "Pricing" },
  { value: "capabilities", label: "Capabilities" },
  { value: "benchmarks", label: "Benchmarks" },
  { value: "releases", label: "Releases" },
  { value: "editorial", label: "Editorial" },
] as const;
type ModelSection = (typeof modelSections)[number]["value"];

type Collection = "models" | "providers" | "links" | "sponsored" | "changelog";
type View = "dashboard" | Collection;
type AnyRecord = AIModel | Provider | OutboundLink | SponsoredPlacement | ChangelogEntry;
interface Editing { collection: Collection; record: AnyRecord; isNew: boolean; section: ModelSection }

async function requestAdmin(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body: unknown = await response.json();
  const result = responseSchema.safeParse(body);
  if (!result.success) throw new Error("The server returned an unexpected response. Your changes have not been published.");
  return { response, data: result.data };
}

interface Analytics {
  days: number;
  totals: Record<string, number>;
  daily: { date: string; count: number }[];
  topModels: { key: string; count: number }[];
  mostCompared: { key: string; count: number }[];
  topPages: { key: string; count: number }[];
  searches: { key: string; count: number }[];
  noResultSearches: { key: string; count: number }[];
  outbound: { key: string; count: number }[];
}

function Dashboard({ catalog }: { catalog: Catalog }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Analytics unavailable.");
        if (active) { setData(body as Analytics); setError(null); }
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Analytics unavailable."));
    return () => { active = false; };
  }, [days]);

  const name = (slug: string) => catalog.models.find((model) => model.slug === slug)?.name ?? slug;
  const tiles: [string, string][] = data ? [
    ["Visitors", "visitors"], ["Page views", "pageViews"], ["Model page views", "modelViews"], ["Comparisons viewed", "comparisons"],
    ["Outbound clicks", "outboundClicks"], ["Affiliate clicks", "affiliateClicks"], ["Calculator uses", "calculatorUses"], ["Newsletter signups", "newsletterSignups"],
    ["Subscribers", "subscribers"], ["Pro waitlist", "proWaitlist"], ["API waitlist", "apiWaitlist"], ["Pro clicks", "proClicks"],
  ] : [];
  const maxDaily = Math.max(1, ...(data?.daily.map((entry) => entry.count) ?? [1]));

  const list = (title: string, rows: { key: string; count: number }[], format: (key: string) => string = (key) => key) => (
    <div className="panel p-4">
      <h3 className="text-[14px]">{title}</h3>
      {rows.length ? (
        <ol className="mt-2 grid gap-1 text-[13.5px]">
          {rows.map((row) => <li key={row.key} className="flex justify-between gap-3"><span className="truncate">{format(row.key)}</span><span className="tabular text-muted-foreground">{row.count}</span></li>)}
        </ol>
      ) : <p className="mt-2 text-[13px] text-muted-foreground">No data yet.</p>}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] text-muted-foreground">Consented, anonymous product analytics plus cookie-free outbound click counts.</p>
        <div className="flex items-center gap-2">
          <select className="field !h-8 !w-auto !text-[13px]" value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Period">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last year</option>
          </select>
          <Button asChild variant="outline" size="sm"><a href="/api/admin/subscribers"><Download size={13} /> Subscribers CSV</a></Button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-md border p-3 text-sm text-danger">{error}</p>}
      {!data && !error && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="skeleton h-20" />)}</div>}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {tiles.map(([label, key]) => (
              <div key={key} className="panel p-4"><dt className="stat-label">{label}</dt><dd className="mt-1 text-2xl font-semibold tabular">{(data.totals[key] ?? 0).toLocaleString("en-US")}</dd></div>
            ))}
          </dl>
          <div className="panel mt-4 p-4">
            <h3 className="text-[14px]">Daily page views</h3>
            {data.daily.length ? (
              <div className="mt-3 flex h-28 items-end gap-1" role="img" aria-label="Daily page views chart">
                {data.daily.map((entry) => <div key={entry.date} title={`${entry.date}: ${entry.count}`} className="flex-1 rounded-t bg-foreground/70" style={{ height: `${(entry.count / maxDaily) * 100}%` }} />)}
              </div>
            ) : <p className="mt-2 text-[13px] text-muted-foreground">No page views recorded yet.</p>}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list("Most viewed models", data.topModels, name)}
            {list("Most compared models", data.mostCompared, name)}
            {list("Top pages", data.topPages)}
            {list("Popular searches", data.searches)}
            {list("Searches with no results", data.noResultSearches)}
            {list("Outbound clicks", data.outbound)}
          </div>
        </>
      )}
    </div>
  );
}

export function AdminStudio() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [baseline, setBaseline] = useState("");
  const [storage, setStorage] = useState<"local" | "supabase">("local");
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const dirty = useMemo(() => catalog !== null && JSON.stringify(catalog) !== baseline, [catalog, baseline]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const { response, data } = await requestAdmin("/api/admin/session");
        if (!response.ok) throw new Error(data.error ?? "Unable to check the admin session.");
        if (!active) return;
        setConfigured(data.configured ?? false);
        setAuthenticated(data.authenticated ?? false);
        if (data.authenticated) {
          const result = await requestAdmin("/api/admin/catalog");
          if (!result.response.ok || !result.data.catalog) throw new Error(result.data.error ?? "Could not read the catalog.");
          if (active) {
            setCatalog(result.data.catalog);
            setBaseline(JSON.stringify(result.data.catalog));
            setStorage(result.data.storage ?? "local");
          }
        }
      } catch (cause) {
        console.error("Admin initialization failed:", cause);
        if (active) setError(cause instanceof Error ? cause.message : "Could not open the catalog studio.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!dirty && !editing) return;
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, editing]);

  async function loadCatalog() {
    const { response, data } = await requestAdmin("/api/admin/catalog");
    if (!response.ok || !data.catalog) throw new Error(data.error ?? "The catalog could not be loaded.");
    setCatalog(data.catalog);
    setBaseline(JSON.stringify(data.catalog));
    setStorage(data.storage ?? "local");
    setError(null);
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setError(null);
    try {
      const { response, data } = await requestAdmin("/api/admin/session", { method: "POST", body: JSON.stringify({ password }) });
      if (!response.ok || !data.authenticated) throw new Error(data.error ?? "Sign-in failed.");
      setAuthenticated(true);
      setPassword("");
      if (!catalog) await loadCatalog();
      toast.success("Signed in to the catalog studio");
    } catch (cause) {
      console.error("Admin sign-in failed:", cause);
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally { setAuthBusy(false); }
  }

  async function signOut() {
    if (dirty) { toast.error("Publish or reload your draft before signing out. You can also export it first."); return; }
    setBusy(true);
    try {
      const { response, data } = await requestAdmin("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error(data.error ?? "Could not sign out.");
      setAuthenticated(false);
      setCatalog(null);
      setBaseline("");
      toast.success("Signed out");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to sign out.");
    } finally { setBusy(false); }
  }

  function openEditor(collection: Collection, record: AnyRecord, isNew: boolean, section: ModelSection = "record") {
    setEditing({ collection, record, isNew, section });
    setIssues([]);
    setText(JSON.stringify(collection === "models" && section !== "record" ? (record as AIModel)[section] : record, null, 2));
  }

  function exportCatalog() {
    if (!catalog) return;
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-compare-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function commit(candidate: Catalog, message: string) {
    const result = catalogSchema.safeParse(candidate);
    if (!result.success) {
      setIssues(result.error.issues.slice(0, 40).map((issue) => `${issue.path.join(".")}: ${issue.message}`));
      return false;
    }
    setCatalog(result.data);
    toast.success(message, { description: "Publish the catalog to make it visible to visitors." });
    return true;
  }

  function replaceRecord(base: Catalog, collection: Collection, record: AnyRecord, previousId: string | null): Catalog {
    const list = base[collection] as AnyRecord[];
    const next = previousId === null ? [...list, record] : list.map((entry) => (entry.id === previousId ? record : entry));
    return { ...base, [collection]: next };
  }

  function applyEdit() {
    if (!catalog || !editing) return;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch (cause) {
      setIssues([cause instanceof Error ? cause.message : "Invalid JSON."]); return;
    }
    const value = editing.collection === "models" && editing.section !== "record" ? { ...editing.record, [editing.section]: parsed } : parsed;
    if (typeof value !== "object" || value === null || Array.isArray(value)) { setIssues(["A record must be a JSON object."]); return; }
    const now = new Date().toISOString();
    const record = ("updatedAt" in value ? { ...value, updatedAt: now } : value) as AnyRecord;
    if (commit(replaceRecord(catalog, editing.collection, record, editing.isNew ? null : editing.record.id), "Change added to your draft")) {
      setEditing(null);
      setIssues([]);
    }
  }

  function setStatus(model: AIModel, status: AIModel["status"]) {
    if (!catalog) return;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const event = status === "deprecated" || status === "retired" ? [{
      id: `${model.id}-${status}-${now.replace(/\D/g, "").slice(0, 14)}`, date: today, type: status === "retired" ? "retirement" as const : "deprecation" as const,
      title: `${model.name} ${status === "retired" ? "retired" : "deprecated"}`, description: "Status changed in the catalog studio. Replace this event's source with the provider's official notice.",
      source: { label: `${model.name} official documentation`, url: model.apiDocs ?? model.website, checkedAt: today },
    }] : [];
    commit(replaceRecord(catalog, "models", { ...model, status, updatedAt: now, releases: [...event, ...model.releases] }, model.id), `${model.name} marked ${statusLabels[status].toLowerCase()}`);
  }

  function remove(collection: Collection, id: string) {
    if (!catalog) return;
    if (collection === "models" || collection === "providers") { toast.error("Retire models instead of deleting them so historical pages keep working."); return; }
    commit({ ...catalog, [collection]: (catalog[collection] as AnyRecord[]).filter((entry) => entry.id !== id) }, "Removed from your draft");
  }

  async function publish() {
    if (!catalog) return;
    setBusy(true);
    setError(null);
    try {
      const { response, data } = await requestAdmin("/api/admin/catalog", { method: "PUT", body: JSON.stringify({ catalog, expectedUpdatedAt: catalog.updatedAt }) });
      if (response.status === 401) setAuthenticated(false);
      if (!response.ok || !data.catalog) throw new Error([data.error ?? "The catalog could not be published.", ...(data.issues ?? [])].join("\n"));
      setCatalog(data.catalog);
      setBaseline(JSON.stringify(data.catalog));
      router.refresh();
      toast.success("Catalog published", { description: "Changes are live for new page requests." });
    } catch (cause) {
      console.error("Catalog publication failed:", cause);
      setError(cause instanceof Error ? cause.message : "Your catalog was not published.");
    } finally { setBusy(false); }
  }

  async function reload() {
    setBusy(true);
    try {
      await loadCatalog();
      setConfirmReload(false);
      toast.success("Published catalog reloaded");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reload the catalog.");
    } finally { setBusy(false); }
  }

  if (loading) return <div className="container-page py-20"><p className="flex items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle size={20} className="animate-spin" />Opening the catalog studio…</p></div>;

  if (!authenticated) return (
    <div className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="panel w-full max-w-[420px] p-8">
        <span className="grid size-11 place-items-center rounded-full border"><LockKeyhole size={20} /></span>
        <h1 className="mt-5 text-2xl">Catalog studio</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">Manage models, providers, pricing, benchmarks, releases, links, and sponsored placements.</p>
        {!configured && <p className="mt-4 rounded-md border bg-surface p-3 text-[13px]">Admin access is not configured. Run <code>npm run setup:local</code>, or set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> on the server and restart.</p>}
        <form onSubmit={signIn} className="mt-6">
          <label htmlFor="admin-password" className="mb-1.5 block text-[13px] font-medium">Admin password</label>
          <input id="admin-password" type="password" required maxLength={512} autoComplete="current-password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!configured || authBusy} />
          {error && <p role="alert" className="mt-3 text-[13px] whitespace-pre-wrap text-danger">{error}</p>}
          <Button type="submit" className="mt-4 h-10 w-full" disabled={!configured || authBusy || !password}>{authBusy ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowRight size={15} />}Sign in</Button>
        </form>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck size={13} />Signed, HttpOnly, SameSite=Strict session.</p>
      </div>
    </div>
  );

  if (!catalog) return <div className="container-page py-16"><p role="alert" className="text-danger">{error ?? "The catalog has not loaded."}</p><Button onClick={() => window.location.reload()} className="mt-5">Reload studio</Button></div>;

  const q = query.toLowerCase();
  const providerName = (id: string) => catalog.providers.find((provider) => provider.id === id)?.name ?? id;
  const tabs: { value: View; label: string; icon: React.ElementType; count?: number }[] = [
    { value: "dashboard", label: "Analytics", icon: BarChart3 },
    { value: "models", label: "Models", icon: Boxes, count: catalog.models.length },
    { value: "providers", label: "Providers", icon: Building2, count: catalog.providers.length },
    { value: "links", label: "Affiliate links", icon: Link2, count: catalog.links.length },
    { value: "sponsored", label: "Sponsored", icon: Megaphone, count: catalog.sponsored.length },
    { value: "changelog", label: "Changelog", icon: ListChecks, count: catalog.changelog.length },
  ];

  function addNew() {
    if (!catalog || view === "dashboard") return;
    const now = new Date().toISOString();
    if (view === "models") openEditor("models", newModelTemplate(catalog, now), true);
    if (view === "providers") openEditor("providers", newProviderTemplate(catalog, now), true);
    if (view === "links") openEditor("links", newLinkTemplate(catalog, now), true);
    if (view === "sponsored") openEditor("sponsored", newSponsoredTemplate(catalog, now), true);
    if (view === "changelog") openEditor("changelog", { id: `change-${now.slice(0, 10)}-${catalog.changelog.length + 1}`, date: now.slice(0, 10), kind: "data", title: "Describe the update", description: "What changed and why." } satisfies ChangelogEntry, true);
  }

  const editButton = (label: string, onClick: () => void) => (
    <button type="button" className="rounded px-2 py-1 text-[12.5px] text-muted-foreground hover:bg-surface-2 hover:text-foreground" onClick={onClick}>{label}</button>
  );

  return (
    <div className="container-page pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 py-8">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-1 text-3xl">Catalog studio</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Storage: {storage === "local" ? "local file" : "Supabase"} · Published {formatDate(catalog.updatedAt)}{catalog.updatedBy ? ` by ${catalog.updatedBy}` : ""}</p>
        </div>
        <Button variant="outline" onClick={signOut} disabled={busy}><LogOut size={14} />Sign out</Button>
      </div>

      <div className="sticky top-[var(--header-height)] z-20 -mx-2 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-popover px-4 py-3 shadow-[var(--shadow-sm)]">
        <p className="flex items-center gap-2 text-[14px]">
          <span className={cn("status-dot", dirty && "!bg-[var(--warning)]")} aria-hidden="true" />
          {dirty ? "Unpublished changes in your draft." : "Draft matches the published catalog."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCatalog}><Download size={13} />Export JSON</Button>
          <Button variant="outline" size="sm" onClick={() => (dirty ? setConfirmReload(true) : void reload())} disabled={busy}><RotateCcw size={13} />Reload</Button>
          <Button size="sm" onClick={publish} disabled={!dirty || busy}>{busy ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />}Publish catalog</Button>
        </div>
      </div>
      {error && <div role="alert" className="mb-5 rounded-lg border p-4 text-[13px] whitespace-pre-wrap text-danger">{error}</div>}

      <div className="mb-5 flex flex-wrap items-center gap-2 border-b pb-3" role="tablist" aria-label="Studio sections">
        {tabs.map(({ value, label, icon: Icon, count }) => (
          <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => { setView(value); setQuery(""); }} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-[13.5px] text-muted-foreground hover:bg-surface-2 aria-selected:bg-surface-2 aria-selected:font-medium aria-selected:text-foreground">
            <Icon size={15} aria-hidden="true" />{label}{count !== undefined && <span className="text-xs tabular opacity-70">{count}</span>}
          </button>
        ))}
        {view !== "dashboard" && (
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input className="field !h-9 !w-56 !pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter…" aria-label="Filter records" />
            </div>
            <Button size="sm" variant="outline" onClick={addNew}><Plus size={14} />Add</Button>
          </div>
        )}
      </div>

      {view === "dashboard" && <Dashboard catalog={catalog} />}

      {view === "models" && (
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Models</caption>
            <thead><tr><th scope="col" className="sticky-col">Model</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col">Edit</th><th scope="col">Lifecycle</th><th scope="col"><span className="sr-only">Public page</span></th></tr></thead>
            <tbody>
              {catalog.models.filter((model) => `${model.name} ${model.version} ${providerName(model.providerId)}`.toLowerCase().includes(q)).map((model) => {
                const provider = getProvider(catalog, model.providerId);
                return (
                  <tr key={model.id}>
                    <th scope="row" className="sticky-col font-normal">
                      <span className="flex items-center gap-2.5"><ProviderLogo provider={provider} size={26} /><span><span className="block font-medium">{model.name}</span><span className="text-xs text-muted-foreground">{provider.name} · {model.version}</span></span></span>
                    </th>
                    <td><span className={cn("badge", model.status !== "active" && `badge-${model.status}`)}>{statusLabels[model.status]}</span></td>
                    <td className="text-xs text-muted-foreground">{formatDate(model.updatedAt, "short")}{model.updatedBy ? ` · ${model.updatedBy}` : ""}</td>
                    <td>
                      <span className="flex flex-wrap gap-0.5">
                        {modelSections.map((section) => <span key={section.value}>{editButton(section.value === "record" ? "Details" : section.label, () => openEditor("models", model, false, section.value))}</span>)}
                      </span>
                    </td>
                    <td>
                      <span className="flex gap-0.5">
                        {model.status !== "deprecated" && model.status !== "retired" && editButton("Deprecate", () => setStatus(model, "deprecated"))}
                        {model.status !== "retired" && <button type="button" className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12.5px] text-muted-foreground hover:bg-surface-2 hover:text-foreground" onClick={() => setStatus(model, "retired")}><Archive size={12} aria-hidden="true" />Archive</button>}
                        {model.status !== "active" && editButton("Reactivate", () => setStatus(model, "active"))}
                      </span>
                    </td>
                    <td><Link href={modelPath(provider.slug, model.slug)} target="_blank" aria-label={`Open ${model.name}`} className="text-muted-foreground hover:text-foreground"><ExternalLink size={14} /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === "providers" && (
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Providers</caption>
            <thead><tr><th scope="col">Provider</th><th scope="col">Type</th><th scope="col">Models</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {catalog.providers.filter((provider) => provider.name.toLowerCase().includes(q)).map((provider) => (
                <tr key={provider.id}>
                  <th scope="row" className="font-normal"><span className="flex items-center gap-2.5"><ProviderLogo provider={provider} size={26} /><span className="font-medium">{provider.name}</span></span></th>
                  <td>{provider.kind === "lab" ? "Lab" : "Platform"}</td>
                  <td className="tabular">{catalog.models.filter((model) => model.providerId === provider.id).length}</td>
                  <td className="text-xs text-muted-foreground">{formatDate(provider.updatedAt, "short")}{provider.updatedBy ? ` · ${provider.updatedBy}` : ""}</td>
                  <td>{editButton("Edit", () => openEditor("providers", provider, false))} <Link href={`/providers/${provider.slug}`} target="_blank" className="ml-2 inline-flex text-muted-foreground hover:text-foreground" aria-label={`Open ${provider.name}`}><ExternalLink size={14} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(view === "links" || view === "sponsored" || view === "changelog") && (() => {
        const records = (catalog[view] as AnyRecord[]).filter((record) => JSON.stringify(record).toLowerCase().includes(q));
        const describe = (record: AnyRecord) => {
          if (view === "links") { const link = record as OutboundLink; return [link.label, `${link.targetType}: ${link.targetId}`, link.isAffiliate ? "Affiliate" : "Direct", link.enabled ? "Enabled" : "Disabled"]; }
          if (view === "sponsored") { const placement = record as SponsoredPlacement; return [placement.title, `${placement.slot} · ${placement.sponsor}`, placement.enabled ? "Enabled" : "Disabled", formatDate(placement.startsAt, "short")]; }
          const entry = record as ChangelogEntry; return [entry.title, entry.kind, formatDate(entry.date, "short"), ""];
        };
        return (
          <>
            {view === "links" && <p className="mb-3 flex gap-2 text-[13px] text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0" />Each link overrides a model or provider&apos;s &ldquo;Try&rdquo; button. Affiliate links are disclosed on the page and marked rel=&quot;sponsored&quot;. Clicks are counted at /go before redirecting.</p>}
            {view === "sponsored" && <p className="mb-3 flex gap-2 text-[13px] text-muted-foreground"><TriangleAlert size={14} className="mt-0.5 shrink-0" />Placements are always labeled &ldquo;Sponsored&rdquo; and never appear inside rankings or comparisons. Slots: home, models, comparison, provider, newsletter.</p>}
            {records.length ? (
              <ul className="divide-y rounded-lg border bg-card">
                {records.map((record) => {
                  const [title, meta, state, date] = describe(record);
                  return (
                    <li key={record.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{meta}{date ? ` · ${date}` : ""}</p></div>
                      {state && <span className="badge">{state}</span>}
                      {editButton("Edit", () => openEditor(view, record, false))}
                      <button type="button" className="icon-btn !size-8" onClick={() => remove(view, record.id)} aria-label={`Remove ${title}`}><Trash2 size={14} /></button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing here yet. Use “Add” to create one.</p>}
          </>
        );
      })()}

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) { setEditing(null); setIssues([]); } }}>
        <DialogContent className="!max-w-4xl" showCloseButton={false}>
          <div className="flex items-start justify-between gap-5">
            <div>
              <DialogTitle className="text-xl">{editing?.isNew ? `Add ${editing.collection.replace(/s$/, "")}` : "name" in (editing?.record ?? {}) ? (editing?.record as AIModel).name : editing?.record.id}</DialogTitle>
              <DialogDescription className="mt-1">Schema-validated JSON. Known facts need a source; use <code>null</code> values for unknowns.</DialogDescription>
            </div>
            <button type="button" onClick={() => setEditing(null)} aria-label="Close editor" className="icon-btn"><X size={18} /></button>
          </div>
          {editing?.collection === "models" && (
            <div className="flex flex-wrap gap-1 border-y py-2" role="tablist" aria-label="Record section">
              {modelSections.map((entry) => (
                <button key={entry.value} type="button" role="tab" aria-selected={editing.section === entry.value} className="h-8 rounded-md px-3 text-[13px] text-muted-foreground aria-selected:bg-surface-2 aria-selected:text-foreground" onClick={() => openEditor("models", editing.record, editing.isNew, entry.value)}>
                  {entry.label}
                </button>
              ))}
            </div>
          )}
          <details className="rounded-md border bg-surface p-3 text-[13px] text-muted-foreground">
            <summary className="flex items-center gap-1.5 font-medium text-foreground"><FileJson size={14} />Data format guide</summary>
            <p className="mt-2">Facts: <code>{`{"value": …, "source": {"label", "url", "checkedAt"}, "updatedAt", "note"?}`}</code>. Unknown: <code>{`{"value": null, "source": null, …}`}</code>. Benchmarks: <code>id, benchmarkId, score, display?, version, evaluatedAt, conditions, reportedBy (provider|independent), source</code>. Releases: <code>id, date, title, description, type (release|update|pricing|api-feature|context|modality|deprecation|retirement), source</code>. Trending requires <code>editorial.trendSource</code>. Prices are USD per 1M tokens; non-token pricing goes in <code>pricing.other</code>.</p>
          </details>
          <label htmlFor="record-json" className="sr-only">Record JSON</label>
          <textarea id="record-json" spellCheck={false} className="mono h-[46vh] w-full resize-y rounded-md border bg-card p-3 text-[12.5px] leading-relaxed outline-none focus:border-ring" value={text} onChange={(event) => setText(event.target.value)} />
          {issues.length > 0 && (
            <div className="rounded-md border p-3 text-[13px] text-danger" role="alert">
              <strong>Fix these before applying:</strong>
              <ul className="mt-1 list-disc pl-5">{issues.slice(0, 15).map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul>
              {issues.length > 15 && <p>…and {issues.length - 15} more.</p>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={applyEdit}><Check size={14} />Validate & apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReload} onOpenChange={setConfirmReload}>
        <DialogContent>
          <DialogTitle>Discard your draft?</DialogTitle>
          <DialogDescription>Reloading discards unpublished changes. Export first to keep a copy.</DialogDescription>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmReload(false)}>Keep editing</Button>
            <Button variant="destructive" disabled={busy} onClick={reload}>Discard & reload</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
