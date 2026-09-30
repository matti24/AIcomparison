import type { Metadata } from "next";
import { Suspense } from "react";
import { ModelDirectory } from "@/components/model-directory";
import Loading from "@/app/loading";

export const metadata: Metadata = {
  title: "Explore AI Models - Pricing, Capabilities & Context",
  description: "Search and filter source-linked AI models by provider, price, capabilities, context window, API availability, and licensing.",
  alternates: { canonical: "/models" },
};

export default function ModelsPage() {
  return <Suspense fallback={<Loading />}><ModelDirectory /></Suspense>;
}
