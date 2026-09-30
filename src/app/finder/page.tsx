import type { Metadata } from "next";
import { AIFinder } from "@/components/ai-finder";

export const metadata: Metadata = {
  title: "AI Model Finder - Find the Right AI for You",
  description: "Tell us your use case and priority. Get an explained shortlist of AI models based on documented capabilities, price, privacy, and API access.",
  alternates: { canonical: "/finder" },
};

export default function Page() {
  return <AIFinder />;
}
