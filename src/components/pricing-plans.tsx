"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { BillingToggle, WaitlistForm } from "@/components/waitlist";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/billing";

export function PricingPlans({ billingLive }: { billingLive: boolean }) {
  const [yearly, setYearly] = useState(true);
  const pro = PLANS.pro;
  return (
    <div>
      <div className="flex justify-center"><BillingToggle yearly={yearly} onChange={setYearly} /></div>
      <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="panel flex flex-col p-6">
          <h2 className="text-lg">{PLANS.free.name}</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">{PLANS.free.description}</p>
          <p className="mt-5 text-4xl font-semibold tracking-tight">$0</p>
          <p className="text-[13px] text-muted-foreground">Free forever</p>
          <ul className="mt-6 grid gap-2.5 text-[14px]">
            {PLANS.free.features.map((feature) => <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />{feature}</li>)}
          </ul>
          <Button asChild variant="outline" className="mt-auto h-10 w-full"><Link href="/models">Start exploring</Link></Button>
        </div>
        <div className="panel flex flex-col p-6 shadow-[0_0_0_1px_var(--foreground)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">{pro.name}</h2>
            <span className="badge">{billingLive ? "Available" : "Coming soon"}</span>
          </div>
          <p className="mt-1 text-[14px] text-muted-foreground">{pro.description}</p>
          <p className="mt-5 text-4xl font-semibold tracking-tight tabular">
            ${yearly ? Math.round((pro.yearly / 12) * 100) / 100 : pro.monthly}<span className="text-base font-normal text-muted-foreground">/month</span>
          </p>
          <p className="text-[13px] text-muted-foreground">{yearly ? `$${pro.yearly} billed yearly` : "Billed monthly"}{billingLive ? "" : " · planned launch pricing"}</p>
          <ul className="mt-6 mb-6 grid gap-2.5 text-[14px]">
            {pro.features.map((feature) => <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-positive" aria-hidden="true" />{feature}</li>)}
          </ul>
          <div className="mt-auto">
            {billingLive ? (
              <Button asChild className="h-10 w-full"><Link href="/sign-in?next=/pricing">Sign in to upgrade</Link></Button>
            ) : (
              <>
                <p className="mb-2 text-[13px] font-medium">Get early access and launch pricing</p>
                <WaitlistForm list="pro-waitlist" source="pricing" cta="Join waitlist" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
