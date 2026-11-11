import { describe, expect, it } from "vitest";

import { seedCatalog } from "../src/data/catalog";
import { catalogSchema } from "../src/lib/catalog-schema";
import { AUTO_TAG, modelKey, planModelSync, type ModelSources, type OpenRouterModel } from "../src/lib/model-sync";

const now = new Date("2026-11-11T06:00:00.000Z");
const created = (date: string) => Date.parse(`${date}T12:00:00Z`) / 1000;

function orModel(id: string, name: string, date: string, extra: Partial<OpenRouterModel> = {}): OpenRouterModel {
  return {
    id,
    name,
    created: created(date),
    description: `${name.replace(/^[^:]*:\s*/, "")} is a test model for agents. It supports long documents. It has 280 billion total...`,
    context_length: 1_000_000,
    architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
    pricing: { prompt: "0.000008", completion: "0.00004" },
    top_provider: { max_completion_tokens: 128_000 },
    supported_parameters: ["tools", "reasoning", "response_format"],
    ...extra,
  };
}

const sources = (): ModelSources => ({
  openRouter: [
    orModel("anthropic/claude-fable-9.2", "Anthropic: Claude Fable 9.2", "2026-11-09"),
    orModel("anthropic/claude-fable-9.2:free", "Anthropic: Claude Fable 9.2 (free)", "2026-11-09"),
    orModel("~anthropic/claude-latest", "Anthropic: Claude Latest", "2026-11-09"),
    orModel("google/gemini-9-carbon-preview", "Google: Gemini 9 Carbon Preview", "2026-11-10"),
    orModel("unknownlab/frontier-1", "Unknown Lab: Frontier 1", "2026-11-10"),
    orModel("openai/gpt-ancient", "OpenAI: GPT Ancient", "2025-01-01"),
    orModel("anthropic/claude-opus-5.5", "Anthropic: Claude Opus 5.5", "2026-11-10", {
      pricing: { prompt: "0.000003", completion: "0.000015" },
    }),
  ],
  modelsDev: {
    anthropic: {
      models: {
        "claude-opus-5-5": { id: "claude-opus-5-5", name: "Claude Opus 5.5", cost: { input: 3, output: 15 } },
        "claude-fable-9-2": { id: "claude-fable-9-2", name: "Claude Fable 9.2", release_date: "2026-11-08", knowledge: "2026-06", open_weights: false },
      },
    },
    mistral: {
      models: {
        "deepseek-v9-flash": { id: "deepseek-v9-flash", name: "DeepSeek V9 Flash", release_date: "2026-11-10" },
      },
    },
  },
});

describe("model sync planning", () => {
  it("normalizes IDs, names, variants, and dated snapshots to one key", () => {
    expect(modelKey("anthropic/claude-fable-5.2:free")).toBe("claude-fable-5-2");
    expect(modelKey("Gemini 4 Carbon")).toBe("gemini-4-carbon");
    expect(modelKey("claude-opus-4-5-20251101")).toBe("claude-opus-4-5");
  });

  it("adds recent releases from known providers with cited facts and leaves the rest alone", () => {
    const plan = planModelSync(seedCatalog, sources(), { now });
    expect(plan.added.map((model) => model.id).sort()).toEqual(["claude-fable-9-2", "gemini-9-carbon-preview"]);

    const fable = plan.added.find((model) => model.id === "claude-fable-9-2")!;
    expect(fable).toMatchObject({ name: "Claude Fable 9.2", providerId: "anthropic", status: "active", version: "claude-fable-9.2", updatedBy: "model-sync" });
    expect(fable.tags).toContain(AUTO_TAG);
    expect(fable.releaseDate.value).toBe("2026-11-08");
    expect(fable.knowledgeCutoff.value).toBe("2026-06");
    expect(fable.openness.value).toBe("proprietary");
    expect(fable.pricing.input.value).toBe(8);
    expect(fable.pricing.output.value).toBe(40);
    expect(fable.capabilities.toolCalling.value).toBe(true);
    expect(fable.capabilities.imageInput.value).toBe(true);
    expect(fable.capabilities.computerUse.value).toBeNull();
    expect(fable.description).toBe("Claude Fable 9.2 is a test model for agents. It supports long documents.");
    expect(fable.releases[0]).toMatchObject({ type: "release", date: "2026-11-08" });
    expect(fable.apiDocs).toBe("https://openrouter.ai/anthropic/claude-fable-9.2");
    for (const fact of [fable.contextWindow, fable.pricing.input, fable.capabilities.reasoning]) expect(fact.source).not.toBeNull();

    expect(plan.added.find((model) => model.id === "gemini-9-carbon-preview")!.status).toBe("preview");
    expect(plan.catalog.models).toHaveLength(seedCatalog.models.length + 2);
    expect(plan.catalog.changelog[0]).toMatchObject({ id: "model-sync-2026-11-11", kind: "data" });
    expect(() => catalogSchema.parse(plan.catalog)).not.toThrow();
  });

  it("does not attribute models a provider only hosts", () => {
    const plan = planModelSync(seedCatalog, sources(), { now });
    expect(plan.added.some((model) => model.id.startsWith("deepseek"))).toBe(false);
  });

  it("updates an existing price only when two listings agree, and records the change", () => {
    const plan = planModelSync(seedCatalog, sources(), { now });
    expect(plan.priceChanges).toEqual([{ modelId: "claude-opus-5-5", name: "Claude Opus 5.5", input: [4, 3], output: [20, 15] }]);
    const opus = plan.catalog.models.find((model) => model.id === "claude-opus-5-5")!;
    expect(opus.pricing.input.value).toBe(3);
    expect(opus.releases[0]).toMatchObject({ type: "pricing", date: "2026-11-11" });
    const original = seedCatalog.models.find((model) => model.id === "claude-opus-5-5")!;
    expect({ ...opus, pricing: original.pricing, releases: original.releases, updatedAt: original.updatedAt, updatedBy: undefined })
      .toEqual({ ...original, updatedBy: undefined });

    const disagreeing = sources();
    disagreeing.modelsDev.anthropic!.models!["claude-opus-5-5"].cost = { input: 2, output: 10 };
    expect(planModelSync(seedCatalog, disagreeing, { now }).priceChanges).toEqual([]);
  });

  it("is idempotent and respects the per-run cap", () => {
    const first = planModelSync(seedCatalog, sources(), { now });
    const second = planModelSync(first.catalog, sources(), { now });
    expect(second.added).toEqual([]);
    expect(second.priceChanges).toEqual([]);
    expect(second.catalog).toBe(first.catalog);

    const capped = planModelSync(seedCatalog, sources(), { now, maxNew: 1 });
    expect(capped.added.map((model) => model.id)).toEqual(["gemini-9-carbon-preview"]);
    expect(capped.skipped).toBeGreaterThanOrEqual(1);
  });

  it("ignores releases outside the window or in the future", () => {
    const plan = planModelSync(seedCatalog, sources(), { now: new Date("2026-11-09T00:00:00Z"), windowDays: 30 });
    expect(plan.added.map((model) => model.id)).toEqual(["claude-fable-9-2"]);
  });
});
