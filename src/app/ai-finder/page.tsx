import type { Metadata } from "next";
import { AiFinder } from "@/components/ai-finder";
import { PageHeader } from "@/components/ui-kit";

export const metadata: Metadata = {
  title: "AI Model Finder — Find the Right AI for Your Use Case",
  description: "Answer four questions about your task, priorities, API needs, and budget. Get 3–5 AI models with the exact reasons they match.",
  alternates: { canonical: "/ai-finder" },
};

export default function AiFinderPage() {
  return (
    <>
      <PageHeader
        eyebrow="AI Finder"
        title="Find the right AI for your use case"
        description="Four quick questions. You'll get a short list of models and the specific documented facts that match your answers — no “best model” claims."
        breadcrumbs={[{ href: "/ai-finder", label: "AI Finder" }]}
      />
      <div className="container-narrow py-10">
        <AiFinder />
      </div>
    </>
  );
}
