import { describe, expect, it } from "vitest";
import {
  comparisonPath, emptyFilters, filterModels, formatContext, formatPrice, getModalities,
  matchesSearch, recommendModels, resolveComparison, sortModels,
} from "../src/lib/catalog";
import { comparisonGroups, rowIsDifferent } from "../src/lib/comparison";
import { catalogFixture, fact, modelFixture, testProvider } from "./fixtures";

const base = modelFixture();
const cheapCoder = modelFixture({
  id: "cheap-coder", slug: "cheap-coder", name: "Budget Coder",
  capabilities: { ...base.capabilities, text: fact(true), coding: fact(true), reasoning: fact(true), selfHosting: fact(true) },
  pricing: { ...base.pricing, input: fact(0.2), output: fact(0.6) },
  openness: fact("open-source"),
});
const visionModel = modelFixture({
  id: "vision-model", slug: "vision-model", name: "Vision Model", bestFor: ["research", "general"],
  capabilities: { ...base.capabilities, text: fact(true), imageInput: fact(true), videoInput: fact(true) },
  pricing: { ...base.pricing, input: fact(2), output: fact(8) }, contextWindow: fact(1_000_000),
});
const openWeights = modelFixture({
  id: "open-weights", slug: "open-weights", name: "Open Weights",
  openness: fact("open-weights"), capabilities: { ...base.capabilities, coding: fact(true) },
});
const catalog = catalogFixture([base, cheapCoder, visionModel, openWeights]);

describe("search and directory", () => {
  it("matches model, provider, and product names", () => {
    expect(matchesSearch(cheapCoder, testProvider, "budget coder")).toBe(true);
    expect(matchesSearch(cheapCoder, testProvider, "Test Labs")).toBe(true);
    expect(matchesSearch(cheapCoder, testProvider, "Test Chat")).toBe(true);
  });
  it("combines natural-language capabilities with AND", () => {
    expect(filterModels(catalog, { ...emptyFilters, query: "open source reasoning" }).map((model) => model.id)).toEqual(["cheap-coder"]);
    expect(matchesSearch(visionModel, testProvider, "models with video")).toBe(true);
    expect(matchesSearch(base, testProvider, "models with video")).toBe(false);
  });
  it("enforces the documented cheap input threshold, including its boundary", () => {
    const exact = modelFixture({ pricing: { ...base.pricing, input: fact(1) } });
    const above = modelFixture({ pricing: { ...base.pricing, input: fact(1.001) } });
    expect(matchesSearch(exact, testProvider, "cheap API")).toBe(true);
    expect(matchesSearch(above, testProvider, "cheap API")).toBe(false);
    expect(matchesSearch(base, testProvider, "cheap API")).toBe(false);
  });
  it("enforces the 128K context shortcut", () => {
    expect(matchesSearch(base, testProvider, "large context window")).toBe(true);
    expect(matchesSearch(modelFixture({ contextWindow: fact(127_999) }), testProvider, "large context")).toBe(false);
    expect(matchesSearch(modelFixture({ contextWindow: fact<number>(null) }), testProvider, "large context")).toBe(false);
  });
  it("does not conflate open-source with open weights", () => {
    expect(matchesSearch(openWeights, testProvider, "open source")).toBe(false);
    expect(matchesSearch(openWeights, testProvider, "open weights")).toBe(true);
    expect(filterModels(catalog, { ...emptyFilters, availability: ["open"] }).map((model) => model.id)).toEqual(["cheap-coder"]);
  });
  it("excludes unknown and false capabilities", () => {
    expect(filterModels(catalog, { ...emptyFilters, capabilities: ["reasoning", "coding"] }).map((model) => model.id)).toEqual(["cheap-coder"]);
    const falseModel = modelFixture({ capabilities: { ...base.capabilities, coding: fact(false) } });
    expect(matchesSearch(falseModel, testProvider, "coding")).toBe(false);
  });
  it("uses OR inside model-type filters but AND across availability filters", () => {
    const typed = catalogFixture([cheapCoder, { ...visionModel, type: "research" }]);
    expect(filterModels(typed, { ...emptyFilters, types: ["general", "research"] })).toHaveLength(2);
    expect(filterModels(catalog, { ...emptyFilters, availability: ["api", "self-hosted"] })).toEqual([cheapCoder]);
  });
  it("sorts unknown values last without mutating the catalog", () => {
    const original = [...catalog.models];
    expect(sortModels(catalog.models, "cheapest").slice(0, 2)).toEqual([cheapCoder, visionModel]);
    expect(sortModels(catalog.models, "context")[0]).toEqual(visionModel);
    expect(catalog.models).toEqual(original);
  });
});

describe("comparison URLs and differences", () => {
  it("round-trips two, three, and four model slugs", () => {
    for (const length of [2, 3, 4]) {
      const slugs = catalog.models.slice(0, length).map((model) => model.slug);
      expect(resolveComparison(catalog, comparisonPath(slugs).replace("/compare/", ""))?.map((model) => model.slug)).toEqual(slugs);
    }
  });
  it("rejects duplicate, unknown, too few and too many versions", () => {
    expect(resolveComparison(catalog, "test-model")).toBeNull();
    expect(resolveComparison(catalog, "test-model-vs-test-model")).toBeNull();
    expect(resolveComparison(catalog, "test-model-vs-missing")).toBeNull();
    expect(resolveComparison(catalog, "test-model-vs-cheap-coder-vs-vision-model-vs-open-weights-vs-missing")).toBeNull();
  });
  it("keeps unknown distinct from false and zero", () => {
    const groups = comparisonGroups(catalog);
    const codingRow = groups.flatMap((group) => group.rows).find((row) => row.key === "coding")!;
    expect(rowIsDifferent(codingRow, [base, cheapCoder])).toBe(true);
    expect(rowIsDifferent(codingRow, [base, modelFixture({ capabilities: { ...base.capabilities, coding: fact(false) } })])).toBe(true);
    const inputRow = groups.flatMap((group) => group.rows).find((row) => row.key === "input")!;
    expect(rowIsDifferent(inputRow, [base, modelFixture({ pricing: { ...base.pricing, input: fact(0) } })])).toBe(true);
  });
  it("marks identical facts as equal", () => {
    const row = comparisonGroups(catalog)[0].rows[0];
    expect(rowIsDifferent(row, [base, cheapCoder])).toBe(false);
  });
});

describe("AI finder", () => {
  it("explains matches and sorts known input prices", () => {
    const results = recommendModels(catalog, "coding", "cheapest");
    expect(results.map((result) => result.model.id)).toEqual(["cheap-coder"]);
    expect(results[0].reasons.join(" ")).toContain("$0.20");
  });
  it("requires self-hosting for privacy and exact license for open-source", () => {
    expect(recommendModels(catalog, "coding", "privacy").map((result) => result.model.id)).toEqual(["cheap-coder"]);
    expect(recommendModels(catalog, "coding", "open").map((result) => result.model.id)).toEqual(["cheap-coder"]);
  });
  it("does not invent speed or return deprecated models", () => {
    expect(recommendModels(catalog, "coding", "fastest")).toEqual([]);
    expect(recommendModels(catalogFixture([{ ...cheapCoder, status: "deprecated" }]), "coding", "api")).toEqual([]);
  });
  it("honors image creation rather than only image understanding", () => {
    expect(recommendModels(catalog, "image-creation", "api")).toEqual([]);
    const imageCreator = modelFixture({ capabilities: { ...base.capabilities, imageOutput: fact(true) } });
    expect(recommendModels(catalogFixture([imageCreator]), "image-creation", "api")).toHaveLength(1);
  });
  it("requires multiple supported modalities", () => {
    expect(getModalities(visionModel)).toEqual(["Text", "Image", "Video"]);
    expect(recommendModels(catalog, "general", "multimodal").map((result) => result.model.id)).toEqual(["vision-model"]);
  });
});

describe("display formatting", () => {
  it("keeps unknown prices distinct from free", () => {
    expect(formatPrice(null)).toBe("Unknown");
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(0.001)).toBe("$0.001");
    expect(formatPrice(3)).toBe("$3.00");
  });
  it("preserves meaningful context limits", () => {
    expect(formatContext(null)).toBe("Unknown");
    expect(formatContext(128_000)).toBe("128K");
    expect(formatContext(1_000_000)).toBe("1M");
    expect(formatContext(32_768)).toBe("32.8K");
  });
});
