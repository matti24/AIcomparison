import type { Metadata } from "next";
import { ComparisonWorkspace } from "@/components/comparison-workspace";

export const metadata: Metadata = {
  title: "Compare AI Models Side by Side",
  description: "Choose two to four AI models and compare pricing, context windows, capabilities, licensing, and API availability with source-linked data.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return <ComparisonWorkspace />;
}
