import type { Metadata } from "next";
import { ContentPage, Placeholder } from "@/components/content-page";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "Report a data correction, ask about partnerships or advertising, or get in touch with AI Compare.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  const email = LEGAL.contactEmail;
  return (
    <ContentPage title="Contact" description="Corrections, partnerships, data access, and press." path="/contact" label="Contact" updated={null}>
      <h2>Report a data correction</h2>
      <p>Found an outdated price, a wrong context window, or a missing model? Email us with the model name, the field, and a link to the official source. We verify every correction against primary sources before publishing it.</p>
      <h2>Partnerships, advertising, and the Data API</h2>
      <p>For sponsorships (always labeled), affiliate programs, or bulk data access, reach out with a short description of what you have in mind.</p>
      <h2>Email</h2>
      <p>{email ? <a href={`mailto:${email}`}>{email}</a> : <Placeholder value={null} label="Contact email (set NEXT_PUBLIC_CONTACT_EMAIL)" />}</p>
      <p><Placeholder value={LEGAL.address} label="Postal address" /></p>
    </ContentPage>
  );
}
