import type { Metadata } from "next";
import { CompaniesPage } from "@/components/company-pages";

export const metadata: Metadata = {
  title: "AI Companies & Model Providers",
  description: "Explore AI providers, their products and platforms, and individual model families. OpenAI, Anthropic, Google, Meta, DeepSeek, and more.",
  alternates: { canonical: "/companies" },
};

export default function Page() {
  return <CompaniesPage />;
}
