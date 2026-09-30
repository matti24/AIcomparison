import { describe, expect, it } from "vitest";
import { newModelTemplate, newProviderTemplate } from "../src/lib/admin-templates";
import { catalogSchema } from "../src/lib/catalog-schema";
import { catalogFixture, modelFixture, testSource, timestamp } from "./fixtures";

describe("admin creation templates", () => {
  it("accepts a new provider and model after the required official URLs are supplied", () => {
    const catalog = catalogFixture([modelFixture()]);
    const provider = { ...newProviderTemplate(catalog, timestamp), website: "https://example.com", sources: [testSource] };
    const model = { ...newModelTemplate(catalog, timestamp), providerId: provider.id, website: "https://example.com/model" };
    const result = catalogSchema.safeParse({ ...catalog, providers: [...catalog.providers, provider], models: [...catalog.models, model] });
    expect(result.error?.issues).toBeUndefined();
    expect(result.success).toBe(true);
  });
  it("requires an explicit URL rather than publishing incomplete templates", () => {
    const catalog = catalogFixture([modelFixture()]);
    const result = catalogSchema.safeParse({ ...catalog, models: [...catalog.models, newModelTemplate(catalog, timestamp)] });
    expect(result.success).toBe(false);
  });
  it("starts technical facts unknown, not guessed", () => {
    const template = newModelTemplate(catalogFixture([]), timestamp);
    expect(Object.values(template.capabilities).every((fact) => fact.value === null && fact.source === null)).toBe(true);
    expect(template.pricing.input.value).toBeNull();
    expect(template.contextWindow.value).toBeNull();
    expect(template.benchmarks).toEqual([]);
  });
  it("generates non-conflicting placeholder IDs", () => {
    const catalog = catalogFixture([]);
    const first = newModelTemplate(catalog, timestamp);
    const second = newModelTemplate({ ...catalog, models: [first] }, timestamp);
    expect(first.id).not.toEqual(second.id);
  });
});
