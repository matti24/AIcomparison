import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Placeholder } from "@/components/content-page";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", description: "How AI Compare handles personal data, analytics, newsletter subscriptions, and browser storage.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" path="/privacy" label="Privacy">
      <p>This policy explains what personal data <Placeholder value={LEGAL.companyName} label="Company legal name" /> (&ldquo;AI Compare&rdquo;, &ldquo;we&rdquo;) processes when you use this website, why, and your rights.</p>

      <h2>Controller</h2>
      <p><Placeholder value={LEGAL.companyName} label="Company legal name" />, <Placeholder value={LEGAL.address} label="Registered address" />. Contact: <Placeholder value={LEGAL.privacyEmail} label="Privacy contact email" />.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Browser storage (essential).</strong> Favorites, watchlist, comparison selections, recent searches, and your cookie choice are stored in your browser&apos;s local storage. They are not sent to us.</li>
        <li><strong>Product analytics (only with consent).</strong> If you accept analytics, we record events such as page views, searches, comparisons created, calculator use, and outbound clicks, with a random per-tab session ID. We do not store your IP address, name, or email with these events, and we do not use them for advertising or cross-site tracking.</li>
        <li><strong>Outbound click counts.</strong> When you follow a &ldquo;Try&rdquo; or provider link, our redirect counts the click (model or provider ID only, without cookies or personal identifiers) so we can measure which links are useful and report affiliate performance.</li>
        <li><strong>Newsletter and waitlists.</strong> If you subscribe, we store your email address, the list, where you signed up, and the time. We use it only to send the newsletter or the specific launch notice you asked for.</li>
        <li><strong>Server logs.</strong> Our hosting provider may process technical request logs (including IP address) for security and reliability for a limited period.</li>
      </ul>

      <h2>Legal bases</h2>
      <ul>
        <li>Consent — analytics and newsletter/waitlist emails. You can withdraw consent at any time.</li>
        <li>Legitimate interests — security logs, aggregate outbound click counts, and operating the service.</li>
      </ul>

      <h2>Retention</h2>
      <p>Analytics events are kept for up to 13 months. Newsletter data is kept until you unsubscribe. Waitlist emails are deleted after the launch notice unless you subscribe to the newsletter.</p>

      <h2>Processors</h2>
      <p>We may use a hosting provider and a database provider (for example Supabase) to run the service. <Placeholder value={null} label="List processors and their locations before launch" /></p>

      <h2>Your rights</h2>
      <p>Depending on where you live, you may have rights to access, correct, delete, restrict, or port your data, to object to processing, and to complain to a supervisory authority. Contact <Placeholder value={LEGAL.privacyEmail} label="Privacy contact email" /> to exercise them.</p>

      <h2>Cookies</h2>
      <p>See our <Link href="/cookies">Cookie Policy</Link>.</p>
    </ContentPage>
  );
}
