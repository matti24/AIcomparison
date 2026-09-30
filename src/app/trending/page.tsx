import type { Metadata } from "next";
import { TrendingPage } from "@/components/trending-page";

export const metadata: Metadata = {
  title: "Trending AI Models - The Editorial Radar",
  description: "Discover editorially selected AI models and recently released versions. Transparent curation with explanations, not invented popularity metrics.",
  alternates: { canonical: "/trending" },
};

export default function Page() {
  return <TrendingPage />;
}
