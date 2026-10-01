import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Placeholder } from "@/components/content-page";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Use", description: "Terms for using AI Compare.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <ContentPage title="Terms of Use" path="/terms" label="Terms">
      <p>These terms govern your use of AI Compare, operated by <Placeholder value={LEGAL.companyName} label="Company legal name" />. By using the site you agree to them.</p>
      <h2>Information, not advice</h2>
      <p>AI Compare summarizes publicly available information about AI models — pricing, specifications, capabilities, and published benchmark results — with links to the original sources. Providers change models and prices frequently. Always confirm details with the provider before making purchasing, compliance, or deployment decisions. Nothing on the site is professional, legal, or financial advice.</p>
      <h2>Accuracy</h2>
      <p>We work to keep data accurate and mark unknown values as unknown, but we do not guarantee completeness or accuracy. If you find an error, please <Link href="/contact">tell us</Link>.</p>
      <h2>Trademarks</h2>
      <p>Model names, provider names, and logos belong to their respective owners and are used only to identify them. Their use does not imply endorsement.</p>
      <h2>Acceptable use</h2>
      <p>Do not scrape the site at a rate that degrades service, attempt to bypass security, or misrepresent our data. For bulk or commercial data access, see the <Link href="/api">Data API</Link>.</p>
      <h2>Affiliate links and sponsorships</h2>
      <p>Some outbound links may be affiliate links, and some placements may be sponsored. See the <Link href="/affiliate-disclosure">Affiliate Disclosure</Link> and <Link href="/advertising-disclosure">Advertising Disclosure</Link>.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, AI Compare is provided &ldquo;as is&rdquo; without warranties, and we are not liable for indirect or consequential losses arising from use of the site.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of <Placeholder value={LEGAL.governingLaw} label="Jurisdiction" />.</p>
      <h2>Contact</h2>
      <p><Placeholder value={LEGAL.contactEmail} label="Contact email" /></p>
    </ContentPage>
  );
}
