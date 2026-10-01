"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function NewsletterForm({ source, compact = false, className }: { source: string; compact?: boolean; className?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Subscription failed.");
      setState("done");
      setMessage(body.message ?? "You're subscribed.");
      track("newsletter_subscribed", { source });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <p className={cn("flex items-center gap-2 text-sm", className)} role="status">
        <Check size={16} className="text-positive" /> {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={cn("grid gap-2", className)} noValidate>
      <div className={cn("flex gap-2", compact ? "flex-row" : "flex-col sm:flex-row")}>
        <label className="sr-only" htmlFor={`newsletter-${source}`}>Email address</label>
        <input
          id={`newsletter-${source}`}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="field flex-1"
          aria-invalid={state === "error" || undefined}
          aria-describedby={`newsletter-${source}-note`}
        />
        <Button type="submit" disabled={state === "loading"} className="h-10">
          {state === "loading" ? <Loader2 size={15} className="animate-spin" /> : null} Subscribe
        </Button>
      </div>
      <p id={`newsletter-${source}-note`} className={cn("text-xs", state === "error" ? "text-danger" : "text-muted-foreground")} role={state === "error" ? "alert" : undefined}>
        {state === "error" ? message : <>Weekly. No spam. Unsubscribe anytime. See our <a className="underline underline-offset-2" href="/privacy">privacy policy</a>.</>}
      </p>
    </form>
  );
}

export function NewsletterCard({ source, title = "The AI Model Brief", description = "New models, major price changes, and important AI releases — once a week." }: { source: string; title?: string; description?: string }) {
  return (
    <section className="panel grid gap-5 p-6 md:grid-cols-[1fr_minmax(0,420px)] md:items-center md:p-8" aria-label="Newsletter">
      <div>
        <p className="eyebrow">Newsletter</p>
        <h2 className="mt-1 text-xl">{title}</h2>
        <p className="mt-1.5 text-[14.5px] text-muted-foreground">{description}</p>
      </div>
      <NewsletterForm source={source} />
    </section>
  );
}
