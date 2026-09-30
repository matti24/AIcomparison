import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { seedCatalog } from "../src/data/catalog";
import {
  catalogSchema,
  factSchema,
  httpUrlSchema,
  knowledgeCutoffSchema,
  modelSchema,
  providerSchema,
  timestampSchema,
} from "../src/lib/catalog-schema";
import { CAPABILITIES } from "../src/lib/types";
import { z } from "zod";

const fresh = () => structuredClone(seedCatalog);

describe("catalogSchema", () => {
  it("accepts the complete sourced seed and every model/provider creation record", () => {
    const catalog = catalogSchema.parse(seedCatalog);
    expect(catalog.models).toHaveLength(21);
    expect(catalog.providers).toHaveLength(13);
    expect(catalog.providers.find((provider) => provider.id === "qwen")?.name).toBe("Alibaba / Qwen");
    expect(new Set(catalog.models.map((model) => model.type)).size).toBe(8);
    for (const model of catalog.models) {
      expect(modelSchema.safeParse(model).success).toBe(true);
      expect(model.tags.length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(model.capabilities).sort()).toEqual([...CAPABILITIES].sort());
      expect(model.speed.value).toBeNull();
      expect(model.editorial.rationale).toMatch(/^Editorial selection:/);
    }
    for (const provider of catalog.providers) {
      expect(providerSchema.safeParse(provider).success).toBe(true);
    }
  });

  it("curates six trending picks from six providers before same-provider alternatives", () => {
    const trending = seedCatalog.models.filter((model) => model.editorial.trending);
    expect(trending).toHaveLength(6);
    expect(new Set(trending.map((model) => model.providerId)).size).toBe(6);
    expect(seedCatalog.models.slice(0, 6)).toEqual(trending);
    expect(trending.map((model) => model.editorial.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(seedCatalog.models.map((model) => model.editorial.rank)).size).toBe(seedCatalog.models.length);
    for (const model of trending) {
      expect(model.editorial.rationale).toMatch(/^Editorial selection:/);
      expect(model.editorial.rationale).toContain("not measured popularity");
    }
  });

  it.each([
    ["providers", "id"],
    ["providers", "slug"],
    ["models", "id"],
    ["models", "slug"],
  ] as const)("rejects duplicate %s %s values at their exact path", (collection, field) => {
    const catalog = fresh();
    catalog[collection][1][field] = catalog[collection][0][field];
    const result = catalogSchema.safeParse(catalog);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === `${collection}.1.${field}`)).toBe(true);
    }
  });

  it("rejects an orphan provider reference", () => {
    const catalog = fresh();
    catalog.models[0].providerId = "missing-provider";
    const result = catalogSchema.safeParse(catalog);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["models", 0, "providerId"]);
  });

  it("rejects unknown fields at the catalog and nested fact levels", () => {
    expect(catalogSchema.safeParse({ ...fresh(), hiddenSetting: true }).success).toBe(false);
    const catalog = fresh();
    const model = catalog.models[0];
    const malformed = {
      ...model,
      pricing: {
        ...model.pricing,
        input: { ...model.pricing.input, unsupportedUnit: "credits" },
      },
    };
    expect(modelSchema.safeParse(malformed).success).toBe(false);
  });

  it("requires all capability keys and rejects extra ones", () => {
    const model = fresh().models[0];
    const { text: omitted, ...incomplete } = model.capabilities;
    expect(omitted).toBeDefined();
    expect(modelSchema.safeParse({ ...model, capabilities: incomplete }).success).toBe(false);
    expect(modelSchema.safeParse({
      ...model,
      capabilities: { ...model.capabilities, quantum: model.capabilities.text },
    }).success).toBe(false);
  });

  it("requires provenance for known facts, including false and zero", () => {
    for (const value of [true, false]) {
      const schema = factSchema(z.boolean());
      expect(schema.safeParse({ value, source: null, updatedAt: "2026-09-30" }).success).toBe(false);
    }
    expect(factSchema(z.number()).safeParse({
      value: 0, source: null, updatedAt: "2026-09-30",
    }).success).toBe(false);
    const catalog = fresh();
    catalog.models[0].pricing.input.source = null;
    expect(catalogSchema.safeParse(catalog).success).toBe(false);
  });

  it("allows null facts with or without a source, without converting unknown into zero", () => {
    const schema = factSchema(z.number());
    const bare = schema.parse({ value: null, source: null, updatedAt: "2026-09-30" });
    expect(bare.value).toBeNull();
    expect(schema.safeParse({
      value: null,
      source: seedCatalog.providers[0].sources[0],
      updatedAt: "2026-09-30",
      note: "Not applicable to text token billing.",
    }).success).toBe(true);
  });

  it.each([-1, -0.01, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid prices: %s", (value) => {
      const catalog = fresh();
      catalog.models[0].pricing.input.value = value;
      expect(catalogSchema.safeParse(catalog).success).toBe(false);
    },
  );

  it("rejects fractional token counts and nonpositive editorial ranks", () => {
    const catalog = fresh();
    catalog.models[0].contextWindow.value = 1024.5;
    expect(catalogSchema.safeParse(catalog).success).toBe(false);
    catalog.models[0].contextWindow.value = 1024;
    catalog.models[0].editorial.rank = 0;
    expect(catalogSchema.safeParse(catalog).success).toBe(false);
  });

  it("allows empty or single classifications and rejects duplicate tags and use cases", () => {
    const model = fresh().models[0];
    expect(modelSchema.safeParse({ ...model, tags: [], bestFor: [] }).success).toBe(true);
    expect(modelSchema.safeParse({ ...model, tags: ["5.5"] }).success).toBe(true);
    expect(modelSchema.safeParse({ ...model, tags: ["Vision", "vision"] }).success).toBe(false);
    expect(modelSchema.safeParse({ ...model, bestFor: ["coding", "coding"] }).success).toBe(false);
  });

  it("accepts a new model with null facts and empty classifications", () => {
    const model = fresh().models[0];
    model.tags = [];
    model.bestFor = [];
    model.benchmarks = [];
    model.releases = [];
    const facts = [
      model.releaseDate, model.knowledgeCutoff, model.contextWindow, model.maxOutput,
      model.openness, model.apiAvailable, model.freeAccess, model.speed,
      ...Object.values(model.capabilities),
      model.pricing.input, model.pricing.output, model.pricing.subscription,
    ];
    for (const fact of facts) {
      fact.value = null;
      fact.source = null;
    }
    expect(modelSchema.safeParse(model).success).toBe(true);
  });

  it("rejects duplicate benchmark and release IDs within a model", () => {
    const benchmarkModel = fresh().models.find((model) => model.benchmarks.length > 0)!;
    benchmarkModel.benchmarks.push(structuredClone(benchmarkModel.benchmarks[0]));
    expect(modelSchema.safeParse(benchmarkModel).success).toBe(false);
    const releaseModel = fresh().models.find((model) => model.releases.length > 0)!;
    releaseModel.releases.push(structuredClone(releaseModel.releases[0]));
    expect(modelSchema.safeParse(releaseModel).success).toBe(false);
  });

  it("validates dates while preserving the source's cutoff precision", () => {
    for (const value of ["2026-02-30", "2025-02-29", "2026-13-01", "tomorrow", "2026-09-30T25:00:00Z"]) {
      expect(timestampSchema.safeParse(value).success).toBe(false);
    }
    for (const value of ["2024-02-29", "2026-09-30T12:00:00.123Z", "2026-09-30T14:00:00+02:00"]) {
      expect(timestampSchema.safeParse(value).success).toBe(true);
    }
    for (const value of ["2026", "2026-06", "2026-06-30"]) {
      expect(knowledgeCutoffSchema.parse(value)).toBe(value);
    }
    expect(knowledgeCutoffSchema.safeParse("2026-13").success).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "file:///C:/secret",
    "ftp://example.com/catalog",
    "//example.com/catalog",
    "not a URL",
    "https://username:password@example.com",
  ])("rejects unsafe or malformed URL %s without throwing outside Zod", (url) => {
    expect(httpUrlSchema.safeParse(url).success).toBe(false);
  });

  it("applies URL restrictions to sources and products and requires local logos", () => {
    const provider = fresh().providers[0];
    provider.sources[0].url = "javascript:alert(1)";
    expect(providerSchema.safeParse(provider).success).toBe(false);
    const another = fresh().providers[0];
    another.products[0].url = "file:///C:/private";
    expect(providerSchema.safeParse(another).success).toBe(false);
    expect(providerSchema.safeParse({ ...fresh().providers[0], logo: "https://example.com/logo.svg" }).success).toBe(false);
    expect(providerSchema.safeParse({ ...fresh().providers[0], logo: "/logos/../../private.svg" }).success).toBe(false);
  });

  it("allows an explicit empty-logo monogram fallback but rejects unsafe or whitespace paths", () => {
    const provider = fresh().providers[0];
    expect(providerSchema.parse({ ...provider, logo: "" }).logo).toBe("");
    for (const logo of [
      " ", "\n", "/logos/openai.svg\n", "//example.com/logo.svg",
      "data:image/svg+xml,unsafe", "javascript:alert(1)",
      "/logos/%2e%2e/private.svg", "/logos\\..\\private.svg",
    ]) {
      expect(providerSchema.safeParse({ ...provider, logo }).success).toBe(false);
    }
  });

  it("includes real local SVGs and their distribution license for every provider", async () => {
    await Promise.all(seedCatalog.providers.map(async (provider) => {
      const file = path.join(process.cwd(), "public", ...provider.logo.split("/").filter(Boolean));
      const svg = await readFile(file, "utf8");
      expect(svg).toMatch(/<svg[\s>]/);
      expect(svg).not.toMatch(/<script|<foreignObject|(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/|data:)/i);
    }));
    const license = await readFile(path.join(process.cwd(), "public", "logos", "LICENSE.txt"), "utf8");
    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2023 LobeHub");
  });
});

describe("Supabase deployment contract (static checks, no hosted database)", () => {
  it("provides matching snapshot RPCs, relational tables, concurrency, and restricted access", async () => {
    const sql = await readFile(path.join(process.cwd(), "supabase", "schema.sql"), "utf8");
    const tables = ["catalog_state", "providers", "models", "capabilities", "pricing", "benchmark_sources", "benchmarks", "model_releases", "trending_metrics", "favorites"];
    for (const table of tables) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("create or replace function public.get_catalog()");
    expect(sql).toContain("create or replace function public.save_catalog(");
    expect(sql).toContain("p_expected_updated_at text default null");
    expect(sql).toContain("p_expected_updated_at is distinct from v_current_version");
    expect(sql.indexOf("pg_advisory_xact_lock")).toBeLessThan(sql.indexOf("insert into public.providers"));
    expect(sql).toContain("errcode = 'PT409'");
    expect(sql).toContain("security invoker");
    expect(sql).not.toMatch(/security definer/i);
    expect(sql).toContain("origin = 'editorial'");
    expect(sql).toContain("grant execute on function public.save_catalog(jsonb, text) to service_role");
    expect(sql).toContain("revoke all on function public.save_catalog(jsonb, text) from public, anon, authenticated");
    expect(sql.match(/auth\.uid\(\)/g)).toHaveLength(3);
    expect(sql).not.toContain("delete from public.favorites");
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
    for (const capability of CAPABILITIES) expect(sql).toContain(`'${capability}'`);
  });
});
