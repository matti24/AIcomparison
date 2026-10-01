import type { Metadata } from "next";
import { CompareBuilder } from "@/components/compare-builder";
import { PageHeader } from "@/components/ui-kit";

export const metadata: Metadata = {
  title: "Compare AI Models Side by Side — Pricing, Context, Benchmarks",
  description: "Choose two to four AI models and compare API pricing, context windows, capabilities, modalities, benchmarks, and availability with source-linked data.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <>
      <PageHeader
        title="Compare AI models"
        description="Pick two to four models. You'll get pricing, context, capabilities, multimodal support, benchmarks, and a cost calculator — with a source for every value."
        breadcrumbs={[{ href: "/compare", label: "Compare" }]}
      />
      <div className="container-page py-8">
        <CompareBuilder />
      </div>
    </>
  );
}
