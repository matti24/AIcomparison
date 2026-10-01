import type { Metadata } from "next";
import { PricingPlans } from "@/components/pricing-plans";
import { PageHeader } from "@/components/ui-kit";
import { billingEnabled } from "@/lib/billing";

export const metadata: Metadata = {
  title: "AI Compare Pro — Pricing",
  description: "AI Compare is free to use. Pro adds saved comparisons, synced watchlists, release and pricing alerts, pricing history, and CSV export.",
  alternates: { canonical: "/pricing" },
};

const faq = [
  ["Will the free plan stay free?", "Yes. The model database, comparisons, and the calculator stay free. Pro adds workflow features for people who monitor models continuously."],
  ["Does Pro change the data or rankings?", "No. Every visitor sees the same source-linked data. Pro never buys placement or changes how models are presented."],
  ["When does Pro launch?", "We're building it now. Join the waitlist and we'll email you once, when it's ready. No payment details are collected today."],
  ["Can my team use Pro?", "Team plans are planned. Tell us about your use case through the contact page."],
];

export default function PricingPage() {
  return (
    <>
      <PageHeader eyebrow="Pricing" title="Free for everyone. Pro for people who ship." description="Research and compare models for free. Pro is for developers and teams who track models in production." breadcrumbs={[{ href: "/pricing", label: "Pricing" }]} />
      <div className="container-page py-10">
        <PricingPlans billingLive={billingEnabled()} />
        <section className="container-narrow mt-16" aria-labelledby="pricing-faq">
          <h2 id="pricing-faq" className="text-xl">Questions</h2>
          <dl className="mt-4 divide-y rounded-lg border bg-card">
            {faq.map(([q, a]) => (
              <div key={q} className="px-5 py-4">
                <dt className="font-medium">{q}</dt>
                <dd className="mt-1 text-[14px] text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
