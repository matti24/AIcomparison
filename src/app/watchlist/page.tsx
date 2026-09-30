import type { Metadata } from "next";
import { WatchlistPage } from "@/components/watchlist-page";

export const metadata: Metadata = {
  title: "Your AI Model Watchlist",
  description: "Your personal shortlist of AI models, with recorded release history, pricing changes, and capability updates.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <WatchlistPage />;
}
