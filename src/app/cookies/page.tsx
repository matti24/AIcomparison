import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { ConsentSettingsButton } from "@/components/site-client";

export const metadata: Metadata = { title: "Cookie Policy", description: "Which browser storage AI Compare uses and how to control analytics.", alternates: { canonical: "/cookies" } };

const rows = [
  ["ai-compare:favorites:v1, ai-compare:watchlist:v2, ai-compare:selection:v1, ai-compare:recent:v1, ai-compare:recent-searches:v1", "Local storage", "Essential — saves your favorites, watchlist, comparison tray, and recent searches on this device", "Until you clear them"],
  ["ai-compare:consent:v1", "Local storage", "Essential — remembers your analytics choice", "Until you clear it"],
  ["ai-compare:session", "Session storage", "Analytics (only with consent) — random ID that groups events within one tab session", "Until the tab closes"],
  ["theme", "Local storage", "Essential — remembers light/dark mode", "Until you clear it"],
  ["ai-compare-admin", "Cookie (HttpOnly)", "Essential — admin sign-in session, only for site administrators", "8 hours"],
];

export default function CookiesPage() {
  return (
    <ContentPage title="Cookie Policy" path="/cookies" label="Cookies">
      <p>AI Compare uses very little browser storage. We don&apos;t use advertising cookies or third-party trackers. Analytics only run after you opt in.</p>
      <div className="not-prose my-6 overflow-x-auto rounded-lg border">
        <table className="data-table">
          <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Purpose</th><th scope="col">Duration</th></tr></thead>
          <tbody>
            {rows.map(([name, type, purpose, duration]) => (
              <tr key={name}><td className="!whitespace-normal mono text-xs">{name}</td><td>{type}</td><td className="!whitespace-normal text-[13.5px]">{purpose}</td><td>{duration}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Change your choice</h2>
      <p>You can change your analytics choice at any time: <ConsentSettingsButton /></p>
    </ContentPage>
  );
}
