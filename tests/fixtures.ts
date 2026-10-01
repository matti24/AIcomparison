import { benchmarkDefinitions } from "../src/data/benchmarks";
import { newModelTemplate } from "../src/lib/admin-templates";
import type { AIModel, Catalog, Fact, Provider, Source } from "../src/lib/types";

export const timestamp = "2026-01-10T00:00:00.000Z";
export const testSource: Source = { label: "Test model documentation", url: "https://example.com/model", checkedAt: timestamp };
export const fact = <T,>(value: T | null): Fact<T> => ({ value, source: value === null ? null : testSource, updatedAt: timestamp });

export const testProvider: Provider = {
  id: "test-labs", slug: "test-labs", name: "Test Labs", kind: "lab",
  description: "A provider fixture for isolated unit tests.", website: "https://example.com",
  country: "Test country", founded: 2020, color: "#7454d6", logo: "",
  products: [{ name: "Test Chat", description: "A product fixture.", url: "https://example.com/chat" }],
  sources: [testSource], updatedAt: timestamp,
};

export function catalogFixture(models: AIModel[]): Catalog {
  return {
    schemaVersion: 2, providers: [testProvider], models, benchmarks: benchmarkDefinitions,
    links: [], sponsored: [], changelog: [], updatedAt: timestamp,
  };
}

export function modelFixture(overrides: Partial<AIModel> = {}): AIModel {
  return {
    ...newModelTemplate(catalogFixture([]), timestamp),
    id: "test-model", slug: "test-model", name: "Test Model", status: "active", family: "Test",
    website: "https://example.com/model", apiDocs: "https://example.com/docs",
    releaseDate: fact("2026-01-01"), contextWindow: fact(128_000), maxOutput: fact(16_000),
    openness: fact("proprietary"), apiAvailable: fact(true), bestFor: ["coding", "writing", "general"],
    ...overrides,
  };
}
