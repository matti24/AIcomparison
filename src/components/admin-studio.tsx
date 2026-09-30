"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Building2, Check, Code2, Database, Download, ExternalLink, FileJson, Info, LoaderCircle, LockKeyhole, LogOut, Plus, RotateCcw, Save, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { ProviderLogo } from "@/components/brand";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { newModelTemplate, newProviderTemplate } from "@/lib/admin-templates";
import { catalogSchema } from "@/lib/catalog-schema";
import { formatDate, getProvider } from "@/lib/catalog";
import type { AIModel, Catalog, Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

const responseSchema = z.object({
  configured: z.boolean().optional(),
  authenticated: z.boolean().optional(),
  catalog: catalogSchema.optional(),
  storage: z.enum(["local", "supabase"]).optional(),
  error: z.string().optional(),
  issues: z.array(z.string()).optional(),
});

const sections = [
  { value: "record", label: "Full record" },
  { value: "pricing", label: "Pricing" },
  { value: "capabilities", label: "Capabilities" },
  { value: "benchmarks", label: "Benchmarks" },
  { value: "releases", label: "Releases" },
  { value: "editorial", label: "Editorial" },
] as const;
type EditorSection = (typeof sections)[number]["value"];
type Editing = { kind: "model"; record: AIModel; isNew: boolean } | { kind: "provider"; record: Provider; isNew: boolean };

async function requestAdmin(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body: unknown = await response.json();
  const result = responseSchema.safeParse(body);
  if (!result.success) throw new Error("The server returned an unexpected response. Your changes have not been published.");
  return { response, data: result.data };
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
  const [view, setView] = useState<"models" | "providers">("models");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [section, setSection] = useState<EditorSection>("record");
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const dirty = catalog !== null && JSON.stringify(catalog) !== baseline;

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
      toast.success("Welcome to the catalog studio");
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
      console.error("Admin sign-out failed:", cause);
      toast.error(cause instanceof Error ? cause.message : "Unable to sign out.");
    } finally { setBusy(false); }
  }

  function openEditor(value: Editing, nextSection: EditorSection = "record") {
    setEditing(value);
    setSection(nextSection);
    setIssues([]);
    setText(JSON.stringify(value.kind === "model" && nextSection !== "record" ? value.record[nextSection] : value.record, null, 2));
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

  function applyEdit() {
    if (!catalog || !editing) return;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch (cause) {
      setIssues([cause instanceof Error ? cause.message : "Invalid JSON."]); return;
    }
    const now = new Date().toISOString();
    const value = section === "record" || editing.kind === "provider" ? parsed : { ...editing.record, [section]: parsed };
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      setIssues(["A record must be a JSON object."]); return;
    }
    const record = { ...value, updatedAt: now };
    const candidate = editing.kind === "model"
      ? { ...catalog, models: editing.isNew ? [...catalog.models, record] : catalog.models.map((model) => model.id === editing.record.id ? record : model) }
      : { ...catalog, providers: editing.isNew ? [...catalog.providers, record] : catalog.providers.map((provider) => provider.id === editing.record.id ? record : provider) };
    const result = catalogSchema.safeParse(candidate);
    if (!result.success) {
      setIssues(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)); return;
    }
    setCatalog(result.data);
    setEditing(null);
    setIssues([]);
    toast.success("Change added to your draft", { description: "Publish the catalog to make it visible to visitors." });
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
      toast.success("Catalog published", { description: "Your changes are persisted. New page requests will use the updated catalog." });
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
      console.error("Catalog reload failed:", cause);
      setError(cause instanceof Error ? cause.message : "Unable to reload the catalog.");
    } finally { setBusy(false); }
  }

  if (loading) return <div className="content-width py-20"><div className="mx-auto flex items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle size={20} className="animate-spin" />Opening the catalog studio...</div></div>;

  if (!authenticated) return (
    <div className="content-width py-14">
      <div className="admin-login">
        <span className="admin-login-icon"><LockKeyhole size={28} strokeWidth={1.5} /></span>
        <span className="eyebrow">For the people behind the details</span><h1>The catalog studio.</h1><p>Keep good information current. Manage providers, model versions, prices, capabilities, and source-backed releases.</p>
        {!configured && <div className="notice mt-5 text-left"><Info size={15} /><p>Admin access is not configured. Run <code>npm run setup:local</code> to generate local credentials, or set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> on your server, then restart.</p></div>}
        <form onSubmit={signIn} className="mt-7 text-left">
          <label htmlFor="admin-password" className="mb-2 block text-xs font-medium">Admin password</label>
          <Input id="admin-password" type="password" required minLength={1} maxLength={512} autoComplete="current-password" placeholder="Your catalog, your key" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11" disabled={!configured || authBusy} />
          {error && <p role="alert" className="mt-3 text-xs leading-6 whitespace-pre-wrap text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="mt-5 w-full" disabled={!configured || authBusy || !password}>{authBusy ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowRight size={15} />}Open the studio</Button>
        </form>
        <p className="admin-login-note"><ShieldCheck size={12} />Protected with an HttpOnly, signed admin session.</p>
        <p className="mt-4 text-[10px] leading-5 text-muted-foreground">For local development, the generated password is the <code>ADMIN_PASSWORD</code> value in your private <code>.env.local</code> file.</p>
      </div>
    </div>
  );

  if (!catalog) return <div className="content-width py-16"><div className="notice"><Info size={16} /><p role="alert">{error ?? "The catalog has not loaded. Reload the page to try again."}</p></div><Button onClick={() => window.location.reload()} className="mt-5">Reload studio</Button></div>;
  const records = view === "models" ? catalog.models.filter((model) => `${model.name} ${model.version} ${getProvider(catalog, model.providerId).name}`.toLowerCase().includes(query.toLowerCase())) : catalog.providers.filter((provider) => provider.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="content-width pb-14">
      <PageHeading eyebrow="Good information is a work in progress" title="The catalog studio." description="Keep the details current, the sources clear, and the next version easy to find."><Button variant="outline" onClick={signOut} disabled={busy}><LogOut size={13} />Sign out</Button></PageHeading>
      <div className="admin-stats"><div><Database size={18} /><strong>{catalog.models.length}</strong><span>Model versions</span></div><div><Building2 size={18} /><strong>{catalog.providers.length}</strong><span>Providers</span></div><div><BookOpen size={18} /><strong>{catalog.models.reduce((sum, model) => sum + model.benchmarks.length, 0)}</strong><span>Benchmark entries</span></div><div><ShieldCheck size={18} /><strong className="!text-lg">{storage === "local" ? "Local file" : "Supabase"}</strong><span>Persistent storage</span></div></div>
      <div className="admin-publish-bar"><div className="flex items-center gap-3"><span className={cn("status-dot", dirty && "!bg-amber-500")} /><div><strong>{dirty ? "You have unpublished changes." : "The catalog is up to date."}</strong><p>Published {formatDate(catalog.updatedAt)}. {storage === "local" ? "Stored on this server's local disk." : "Stored in your PostgreSQL database."}</p></div></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={exportCatalog}><Download size={12} />Export JSON</Button><Button variant="outline" size="sm" onClick={() => dirty ? setConfirmReload(true) : void reload()} disabled={busy}><RotateCcw size={12} />Reload</Button><Button size="sm" onClick={publish} disabled={!dirty || busy}>{busy ? <LoaderCircle size={12} className="animate-spin" /> : <Save size={12} />}Publish catalog</Button></div></div>
      {error && <div role="alert" className="my-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs leading-6 whitespace-pre-wrap text-destructive">{error}</div>}
      <div className="admin-toolbar"><div className="model-tabs !mb-0"><button className="model-tab" aria-pressed={view === "models"} onClick={() => setView("models")}><Code2 size={13} />Model versions</button><button className="model-tab" aria-pressed={view === "providers"} onClick={() => setView("providers")}><Building2 size={13} />Providers</button></div><div className="flex items-center gap-3"><div className="directory-search !py-2.5"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search catalog records" placeholder="Find a record..." /></div><Button variant="outline" size="sm" onClick={() => {
        const now = new Date().toISOString();
        if (view === "models") openEditor({ kind: "model", record: newModelTemplate(catalog, now), isNew: true });
        else openEditor({ kind: "provider", record: newProviderTemplate(catalog, now), isNew: true });
      }}><Plus size={13} />Add {view === "models" ? "model" : "provider"}</Button></div></div>
      <div className="data-table-wrapper"><table className="data-table"><caption className="sr-only">Editable {view} in the catalog</caption><thead><tr><th>{view === "models" ? "Model version" : "Provider"}</th><th>{view === "models" ? "Status" : "Country"}</th><th>Updated</th><th>Edit record</th><th><span className="sr-only">View public page</span></th></tr></thead><tbody>
        {records.map((record) => {
          const isModel = "providerId" in record;
          const provider = isModel ? getProvider(catalog, record.providerId) : record;
          return <tr key={record.id}><td><div className="flex items-center gap-3"><ProviderLogo provider={provider} size={34} /><div><strong className="text-xs font-semibold">{record.name}</strong><p className="mt-1 text-[9px] text-muted-foreground">{isModel ? `${provider.name} / ${record.version}` : record.slug}</p></div></div></td><td><span className={cn("tag", isModel && record.status === "preview" && "tag-amber")}>{isModel ? record.status : record.country ?? "Unknown"}</span></td><td>{formatDate(record.updatedAt, true)}</td><td><div className="flex gap-2"><button className="admin-edit-link" onClick={() => openEditor(isModel ? { kind: "model", record, isNew: false } : { kind: "provider", record, isNew: false })}>Details</button>{isModel && <><button className="admin-edit-link" onClick={() => openEditor({ kind: "model", record, isNew: false }, "pricing")}>Pricing</button><button className="admin-edit-link" onClick={() => openEditor({ kind: "model", record, isNew: false }, "capabilities")}>Capabilities</button><button className="admin-edit-link" onClick={() => openEditor({ kind: "model", record, isNew: false }, "benchmarks")}>Benchmarks</button><button className="admin-edit-link" onClick={() => openEditor({ kind: "model", record, isNew: false }, "releases")}>Releases</button></>}</div></td><td><Link href={`/${isModel ? "models" : "companies"}/${record.slug}`} target="_blank" aria-label={`View ${record.name} public page`} className="text-muted-foreground hover:text-primary"><ExternalLink size={13} /></Link></td></tr>;
        })}
        {!records.length && <tr><td colSpan={5} className="!py-10 text-center text-muted-foreground">No records match this search.</td></tr>}
      </tbody></table></div>
      <div className="notice mt-6"><Info size={16} /><div><p>Changes stay in your draft until you publish. Publishing validates the complete catalog and rejects conflicting updates. To retire a model, set its status to &ldquo;deprecated&rdquo;; keep the record for historical comparisons.</p><p className="mt-2">Use null for unknown facts. Known facts need reliable provenance; updating a record does not automatically reverify each fact. Maintain individual source and last-updated fields when reviewing them.</p></div></div>
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) { setEditing(null); setIssues([]); } }}>
        <DialogContent className="admin-editor !max-w-4xl" showCloseButton={false}>
          <div className="flex items-start justify-between gap-5"><div><DialogTitle className="text-xl">{editing?.isNew ? `Add a ${editing.kind}` : editing?.record.name}</DialogTitle><DialogDescription className="mt-2">Source-backed records. Schema-validated edits. No invisible defaults.</DialogDescription></div><button onClick={() => setEditing(null)} aria-label="Close record editor" className="p-1 text-muted-foreground"><X size={19} /></button></div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-y py-3"><span className="flex items-center gap-2 text-xs font-medium"><FileJson size={15} className="text-primary" />{sections.find((item) => item.value === section)?.label} editor</span><span className="text-[10px] text-muted-foreground">JSON &middot; validate before applying</span></div>
          {editing?.isNew && <div className="notice"><Sparkles size={15} /><p>Start with a unique id, a URL-friendly slug without &ldquo;-vs-&rdquo;, a name, and an official website. New models start with unknown specifications. Add a valid provider first if needed.</p></div>}
          <details className="admin-editor-help"><summary><Info size={12} />Data format guide</summary><p>Each fact uses <code>{`{"value": null, "source": null, "updatedAt": "ISO date"}`}</code>. To publish a known value, include a source object with <code>label</code>, an official <code>https://</code> URL, and <code>checkedAt</code>. Benchmarks need <code>id, name, score, date, source</code>. Releases need <code>id, date, title, description, type, source</code>. Release types: <code>release, pricing, capability, deprecation</code>. Keep USD per 1M tokens as the pricing unit.</p></details>
          <label htmlFor="record-json" className="sr-only">Record JSON</label><textarea id="record-json" spellCheck={false} className="admin-json" value={text} onChange={(event) => setText(event.target.value)} />
          {issues.length > 0 && <div className="admin-validation" role="alert"><strong>These details need attention:</strong><ul>{issues.slice(0, 15).map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul>{issues.length > 15 && <p>...and {issues.length - 15} more validation issues.</p>}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-muted-foreground">Applying updates your draft. Publish it when you&apos;re ready.</p><div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={applyEdit}><Check size={13} />Validate & apply</Button></div></div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmReload} onOpenChange={setConfirmReload}><DialogContent><DialogTitle>Reload the published catalog?</DialogTitle><DialogDescription>This discards the unpublished in-memory draft. Export it first if you want to keep a copy. Published data will not be changed.</DialogDescription><div className="mt-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmReload(false)}>Keep editing</Button><Button variant="destructive" disabled={busy} onClick={reload}>Discard draft & reload</Button></div></DialogContent></Dialog>
    </div>
  );
}
