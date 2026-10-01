"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

export function WaitlistForm({ list, source, cta = "Join the waitlist" }: { list: "pro-waitlist" | "api-waitlist"; source: string; cta?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("loading");
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, list, source }) });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Something went wrong.");
      setState("done");
      setMessage(body.message ?? "You're on the list.");
      track(list === "pro-waitlist" ? "pro_upgrade_clicked" : "api_waitlist_joined", { source });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  if (state === "done") return <p className="flex items-center gap-2 text-sm" role="status"><Check size={16} className="text-positive" /> {message}</p>;
  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`waitlist-${source}`} className="sr-only">Work email</label>
        <input id={`waitlist-${source}`} type="email" required autoComplete="email" className="field flex-1" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Button type="submit" className="h-10" disabled={state === "loading"}>{state === "loading" && <Loader2 size={15} className="animate-spin" />}{cta}</Button>
      </div>
      {state === "error" && <p className="text-xs text-danger" role="alert">{message}</p>}
    </form>
  );
}

export function BillingToggle({ yearly, onChange }: { yearly: boolean; onChange: (yearly: boolean) => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-1" role="group" aria-label="Billing period">
      <button type="button" aria-pressed={!yearly} onClick={() => onChange(false)} className="h-8 rounded-md px-4 text-[13.5px] text-muted-foreground aria-pressed:bg-foreground aria-pressed:text-background">Monthly</button>
      <button type="button" aria-pressed={yearly} onClick={() => onChange(true)} className="h-8 rounded-md px-4 text-[13.5px] text-muted-foreground aria-pressed:bg-foreground aria-pressed:text-background">Yearly <span className="opacity-70">· 2 months free</span></button>
    </div>
  );
}
