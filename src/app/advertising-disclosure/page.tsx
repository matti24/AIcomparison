import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Placeholder } from "@/components/content-page";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Advertising Disclosure", description: "How sponsored placements work on AI Compare.", alternates: { canonical: "/advertising-disclosure" } };

export default function AdvertisingDisclosurePage() {
  return (
    <ContentPage title="Advertising Disclosure" path="/advertising-disclosure" label="Advertising disclosure">
      <p>AI Compare may show a small number of sponsored placements — for example a sponsored card on the homepage, on a comparison page, or in the newsletter.</p>
      <h2>Our rules</h2>
      <ul>
        <li>Every sponsored placement is visibly labeled <strong>Sponsored</strong> and names the sponsor.</li>
        <li>Sponsored placements are separate from model lists, rankings, comparisons, and AI Finder results. They never appear as a &ldquo;#1&rdquo; or &ldquo;best&rdquo; pick.</li>
        <li>Sponsors cannot edit or review catalog data, prices, or benchmark results.</li>
        <li>No autoplay ads, pop-ups, or ads that cover content.</li>
        <li>Sponsored links are marked <code>rel=&quot;sponsored&quot;</code>.</li>
      </ul>
      <h2>Advertise with us</h2>
      <p>Contact <Placeholder value={LEGAL.contactEmail} label="Contact email" /> or use the <Link href="/contact">contact page</Link>.</p>
    </ContentPage>
  );
}
