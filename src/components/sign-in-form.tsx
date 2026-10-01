"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Passwordless email sign-in via Supabase Auth. Only rendered when the public
 * Supabase URL and anon key are configured; no custom password handling exists.
 */
export function SignInForm({ url, anonKey, next }: { url: string; anonKey: string; next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("loading");
    const supabase = createClient(url, anonKey);
    const redirect = new URL(next.startsWith("/") ? next : "/", location.origin).toString();
    const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    if (authError) {
      setState("error");
      setError("We couldn't send the sign-in link. Check the address and try again.");
    } else setState("sent");
  }

  if (state === "sent") {
    return <p className="flex items-start gap-2 text-[14.5px]" role="status"><Check size={18} className="mt-0.5 text-positive" /> Check your inbox — we sent a sign-in link to {email}.</p>;
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <label htmlFor="signin-email" className="text-[13px] font-medium">Email</label>
      <input id="signin-email" type="email" required autoComplete="email" className="field" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
      <Button type="submit" className="h-10" disabled={state === "loading"}>{state === "loading" && <Loader2 size={15} className="animate-spin" />}Email me a sign-in link</Button>
      {state === "error" && <p className="text-xs text-danger" role="alert">{error}</p>}
    </form>
  );
}
