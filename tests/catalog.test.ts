import { describe, expect, it } from "vitest";
import {
  canonicalComparisonSlugs, comparisonPath, defaultExploreState, estimateCost, formatContext, formatDate, formatPrice, isNew,
  matchesFilters, modalitiesFromCaps, modelBadges, parseExploreState, recommendModels, resolveComparison, searchModels,
  serializeExploreState, sortModels, summarizeCatalog, toModelSummary,
} from "../src/lib/catalog";
import { comparisonSections, highlightedIndices, rowIsDifferent } from "../src/lib/comparison";
import { comparisonFaq, comparisonNarrative } from "../src/lib/comparison-content";
import { MODEL_CATEGORIES } from "../src/lib/types";
import { catalogFixture, fact, modelFixture, testProvider } from "./fixtures";

const REFERENCE = "2026-10-01T00:00:00.000Z";
const base = modelFixture({ categories: ["general"] });
const cheapCoder = modelFixture({
  id: "cheap-coder", slug: "cheap-coder", name: "Budget Coder", categories: ["coding"],
  capabilities: { ...base.capabilities, text: fact(true), coding: fact(true), reasoning: fact(true), selfHosting: fact(true) },
  pricing: { ...base.pricing, input: fact(0.2), cachedInput: fact(0.02), output: fact(0.6) },
  openness: fact("open-source"),
});
const visionModel = modelFixture({
  id: "vision-model", slug: "vision-model", name: "Vision Model", categories: ["multimodal"], bestFor: ["research", "general"],
  capabilities: { ...base.capabilities, text: fact(true), imageInput: fact(true), videoInput: fact(true) },
  pricing: { ...base.pricing, input: fact(2), output: fact(8) }, contextWindow: fact(1_000_000),
  releaseDate: fact("2026-09-20"),
});
const openWeights = modelFixture({
  id: "open-weights", slug: "open-weights", name: "Open Weights", categories: ["coding"],
  openness: fact("open-weights"), capabilities: { ...base.capabilities, coding: fact(true) },
});
const retired = modelFixture({ id: "old-model", slug: "old-model", name: "Old Model", status: "retired" });
const catalog = catalogFixture([base, cheapCoder, visionModel, openWeights, retired]);
const { models: summaries, providers } = summarizeCatalog(catalog);
const summary = (slug: string) => summaries.find((model) => model.slug === slug)!;

describe("summaries", () => {
  it("project only true capabilities and provider-scoped paths", () => {
    const coder = summary("cheap-coder");
    expect(coder.path).toBe(`/models/${testProvider.slug}/cheap-coder`);
    expect(coder.caps).toEqual(expect.arrayContaining(["coding", "reasoning", "selfHosting"]));
    expect(coder.caps).not.toContain("imageInput");
    expect(providers[0].modelCount).toBe(5);
  });
  it("marks new, open, and lifecycle badges from dates", () => {
    expect(isNew(summary("vision-model"), REFERENCE)).toBe(true);
    expect(modelBadges(summary("cheap-coder"), REFERENCE)).toContain("open-source");
    expect(modelBadges(summary("open-weights"), REFERENCE)).toContain("open-weights");
    expect(modelBadges(summary("old-model"), REFERENCE)).toEqual(["retired"]);
  });
});

describe("search", () => {
  it("finds models by name, provider, and typos", () => {
    expect(searchModels(summaries, providers, "budget coder").results[0].slug).toBe("cheap-coder");
    expect(searchModels(summaries, providers, "test labs").results.length).toBeGreaterThan(1);
    expect(searchModels(summaries, providers, "visoin model").results[0]?.slug).toBe("vision-model");
  });
  it("parses intents such as cheap coding, vision, and context sizes", () => {
    const cheap = searchModels(summaries, providers, "cheap coding");
    expect(cheap.results.map((model) => model.slug)).toEqual(["cheap-coder"]);
    expect(cheap.intents).toEqual(expect.arrayContaining(["Coding"]));
    expect(searchModels(summaries, providers, "vision").results.map((model) => model.slug)).toEqual(["vision-model"]);
    expect(searchModels(summaries, providers, "1m context").results.map((model) => model.slug)).toEqual(["vision-model"]);
  });
  it("never treats unknown prices as cheap", () => {
    expect(searchModels(summaries, providers, "cheap").results.every((model) => model.input !== null && model.input <= 1)).toBe(true);
  });
});

describe("explore filters", () => {
  const state = (patch: Partial<typeof defaultExploreState>) => ({ ...defaultExploreState, ...patch });
  it("hides retired models by default but shows them when requested", () => {
    expect(summaries.filter((model) => matchesFilters(model, state({}), REFERENCE)).map((model) => model.slug)).not.toContain("old-model");
    expect(summaries.filter((model) => matchesFilters(model, state({ status: ["retired"] }), REFERENCE)).map((model) => model.slug)).toEqual(["old-model"]);
  });
  it("applies price and context thresholds only to known values", () => {
    expect(summaries.filter((model) => matchesFilters(model, state({ price: "1" }), REFERENCE)).map((model) => model.slug)).toEqual(["cheap-coder"]);
    expect(summaries.filter((model) => matchesFilters(model, state({ context: "1000000" }), REFERENCE)).map((model) => model.slug)).toEqual(["vision-model"]);
  });
  it("distinguishes open weights and self-hosting", () => {
    expect(summaries.filter((model) => matchesFilters(model, state({ availability: ["open-weights"] }), REFERENCE)).map((model) => model.slug)).toEqual(["cheap-coder", "open-weights"]);
    expect(summaries.filter((model) => matchesFilters(model, state({ availability: ["self-host"] }), REFERENCE)).map((model) => model.slug)).toEqual(["cheap-coder"]);
  });
  it("round-trips URL state and ignores invalid values", () => {
    const original = state({ q: "coding", providers: [testProvider.id], categories: ["coding"], price: "5", sort: "price", view: "table" });
    const parsed = parseExploreState(new URLSearchParams(serializeExploreState(original)), MODEL_CATEGORIES, [testProvider.id]);
    expect(parsed).toEqual(original);
    const invalid = parseExploreState(new URLSearchParams("category=nope&price=7&sort=bad&provider=ghost"), MODEL_CATEGORIES, [testProvider.id]);
    expect(invalid).toEqual(defaultExploreState);
  });
  it("sorts unknown values last without mutating input", () => {
    const original = [...summaries];
    expect(sortModels(summaries, "price").slice(0, 2).map((model) => model.slug)).toEqual(["cheap-coder", "vision-model"]);
    expect(sortModels(summaries, "context")[0].slug).toBe("vision-model");
    expect(summaries).toEqual(original);
  });
});

describe("comparisons", () => {
  it("round-trips two to four slugs and rejects invalid sets", () => {
    for (const length of [2, 3, 4]) {
      const slugs = catalog.models.slice(0, length).map((model) => model.slug);
      expect(resolveComparison(catalog, comparisonPath(slugs).replace("/compare/", ""))?.map((model) => model.slug)).toEqual(slugs);
    }
    expect(resolveComparison(catalog, "test-model")).toBeNull();
    expect(resolveComparison(catalog, "test-model-vs-test-model")).toBeNull();
    expect(resolveComparison(catalog, "test-model-vs-missing")).toBeNull();
  });
  it("uses an order-independent canonical slug", () => {
    expect(canonicalComparisonSlugs(["z", "a"])).toEqual(["a", "z"]);
  });
  it("keeps unknown distinct from false and zero", () => {
    const rows = comparisonSections(catalog).flatMap((section) => section.rows);
    const coding = rows.find((row) => row.key === "coding")!;
    expect(rowIsDifferent(coding, [base, modelFixture({ capabilities: { ...base.capabilities, coding: fact(false) } })])).toBe(true);
    const input = rows.find((row) => row.key === "input")!;
    expect(rowIsDifferent(input, [base, modelFixture({ pricing: { ...base.pricing, input: fact(0) } })])).toBe(true);
  });
  it("highlights only objective numeric extremes", () => {
    const rows = comparisonSections(catalog).flatMap((section) => section.rows);
    expect(highlightedIndices(rows.find((row) => row.key === "input")!, [cheapCoder, visionModel])).toEqual([0]);
    expect(highlightedIndices(rows.find((row) => row.key === "context")!, [cheapCoder, visionModel])).toEqual([1]);
    expect(highlightedIndices(rows.find((row) => row.key === "input")!, [base, cheapCoder])).toEqual([]);
    expect(highlightedIndices(rows.find((row) => row.key === "reasoning")!, [base, cheapCoder])).toEqual([]);
  });
  it("generates narrative only from facts and never names a universal winner", () => {
    const providerMap = new Map([[testProvider.id, testProvider]]);
    const text = comparisonNarrative([cheapCoder, visionModel], providerMap).flatMap((section) => section.paragraphs).join(" ");
    expect(text).toContain("$0.20 per million input tokens");
    expect(text).not.toMatch(/\bbest\b/i);
    expect(comparisonFaq([cheapCoder, visionModel]).find((item) => item.q.startsWith("Which is better"))?.a).toContain("Neither is universally better");
  });
});

describe("cost calculator", () => {
  it("computes per request, day, and month including cached input", () => {
    const cost = estimateCost(summary("cheap-coder"), { inputTokens: 1_000_000, outputTokens: 1_000_000, requestsPerDay: 2, cachedShare: 0.5 })!;
    expect(cost.perRequest).toBeCloseTo(0.5 * 0.2 + 0.5 * 0.02 + 0.6);
    expect(cost.perDay).toBeCloseTo(cost.perRequest * 2);
    expect(cost.perMonth).toBeCloseTo(cost.perDay * 30);
    expect(cost.usedCachedFallback).toBe(false);
  });
  it("returns null without published prices and flags missing cached rates", () => {
    expect(estimateCost(summary("open-weights"), { inputTokens: 1, outputTokens: 1, requestsPerDay: 1, cachedShare: 0 })).toBeNull();
    expect(estimateCost(summary("vision-model"), { inputTokens: 1, outputTokens: 1, requestsPerDay: 1, cachedShare: 0.5 })?.usedCachedFallback).toBe(true);
  });
});

describe("AI finder", () => {
  it("explains matches and orders known prices for low cost", () => {
    const { results } = recommendModels(summaries, { task: "coding", priority: "cost", api: "either", budget: "any" });
    expect(results[0].model.slug).toBe("cheap-coder");
    expect(results[0].reasons.join(" ")).toContain("$0.20");
  });
  it("requires self-hosting for privacy and excludes retired models", () => {
    const { results } = recommendModels(summaries, { task: "coding", priority: "privacy", api: "either", budget: "any" });
    expect(results.map((result) => result.model.slug)).toEqual(["cheap-coder"]);
    expect(recommendModels(summaries, { task: "general", priority: "quality", api: "either", budget: "any" }).results.map((result) => result.model.slug)).not.toContain("old-model");
  });
  it("is honest that speed is not measured", () => {
    expect(recommendModels(summaries, { task: "coding", priority: "speed", api: "either", budget: "any" }).notes.join(" ")).toContain("latency");
  });
  it("requires multiple modalities for multimodal priority", () => {
    expect(modalitiesFromCaps(toModelSummary(catalog, visionModel).caps)).toEqual(["Text", "Image", "Video"]);
    expect(recommendModels(summaries, { task: "general", priority: "multimodal", api: "either", budget: "any" }).results.map((result) => result.model.slug)).toEqual(["vision-model"]);
  });
});

describe("display formatting", () => {
  it("keeps unknown prices distinct from zero", () => {
    expect(formatPrice(null)).toBe("Not disclosed");
    expect(formatPrice(0)).toBe("$0");
    expect(formatPrice(0.001)).toBe("$0.001");
    expect(formatPrice(3)).toBe("$3.00");
  });
  it("preserves meaningful context limits and date precision", () => {
    expect(formatContext(null)).toBe("Not disclosed");
    expect(formatContext(128_000)).toBe("128K");
    expect(formatContext(1_000_000)).toBe("1M");
    expect(formatContext(32_768)).toBe("32.8K");
    expect(formatDate("2026-06", "month")).toBe("Jun 2026");
    expect(formatDate("2026")).toBe("2026");
  });
});
