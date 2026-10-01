import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = { title: "Affiliate Disclosure", description: "How affiliate links work on AI Compare and why they never affect our data.", alternates: { canonical: "/affiliate-disclosure" } };

export default function AffiliateDisclosurePage() {
  return (
    <ContentPage title="Affiliate Disclosure" path="/affiliate-disclosure" label="Affiliate disclosure">
      <p>Some &ldquo;Try&rdquo; links on AI Compare may be affiliate or referral links. If you sign up or purchase through one, we may earn a commission at no extra cost to you.</p>
      <h2>What affiliate links never change</h2>
      <ul>
        <li>Model data, prices, capabilities, and benchmark results are the same whether or not a provider has an affiliate program.</li>
        <li>Sorting, filters, comparisons, and AI Finder results never consider affiliate status.</li>
        <li>We don&apos;t accept payment to change a fact, hide a competitor, or add a &ldquo;winner&rdquo; label.</li>
      </ul>
      <h2>How we label them</h2>
      <p>Pages with an active affiliate link show a short disclosure next to the button, and the link is marked <code>rel=&quot;sponsored&quot;</code>. All outbound links go through a redirect at <code>/go/…</code> that counts clicks without cookies or personal data.</p>
      <p>See also our <Link href="/advertising-disclosure">Advertising Disclosure</Link> and <Link href="/methodology">Methodology</Link>.</p>
    </ContentPage>
  );
}
