/**
 * Validates one provider data file (or all of them) against the catalog schema.
 *
 *   npx tsx scripts/check-provider-file.ts src/data/providers/openai.ts
 *   npx tsx scripts/check-provider-file.ts src/data/providers/openai.ts --urls
 *   npx tsx scripts/check-provider-file.ts --all
 *
 * --urls also requests every cited source URL and reports unreachable ones.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { benchmarkDefinitions } from "../src/data/benchmarks";
import { buildModel, buildProvider, type ProviderFile } from "../src/data/define";
import { benchmarkDefinitionSchema, modelSchema, providerSchema } from "../src/lib/catalog-schema";

const args = process.argv.slice(2);
const checkUrls = args.includes("--urls");
const directory = path.join(process.cwd(), "src", "data", "providers");
const files = args.includes("--all")
  ? readdirSync(directory).filter((file) => file.endsWith(".ts")).map((file) => path.join(directory, file))
  : args.filter((arg) => !arg.startsWith("--")).map((file) => path.resolve(file));

if (!files.length) {
  console.error("Pass a provider file path or --all.");
  process.exit(2);
}

let failures = 0;
const fail = (message: string) => {
  failures++;
  console.error(`  ✗ ${message}`);
};

async function reachable(url: string) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; AICompareSourceCheck/1.0)" },
    });
    return response.status;
  } catch {
    return 0;
  }
}

async function main() {
for (const file of files) {
  console.log(`\n${path.relative(process.cwd(), file)}`);
  const data = (await import(pathToFileURL(file).href)) as ProviderFile;
  const providerIds = new Set<string>();
  const benchmarkIds = new Set(benchmarkDefinitions.map((benchmark) => benchmark.id));
  for (const extra of data.extraBenchmarks ?? []) {
    const parsed = benchmarkDefinitionSchema.safeParse(extra);
    if (!parsed.success) fail(`extra benchmark ${extra.id}: ${parsed.error.message}`);
    benchmarkIds.add(extra.id);
  }

  const urls = new Set<string>();
  for (const input of data.providers ?? []) {
    const provider = buildProvider(input);
    providerIds.add(provider.id);
    const parsed = providerSchema.safeParse(provider);
    if (!parsed.success) fail(`provider ${input.id}: ${JSON.stringify(parsed.error.issues, null, 1)}`);
    provider.sources.forEach((source) => urls.add(source.url));
  }

  const modelIds = new Set<string>();
  (data.models ?? []).forEach((input, index) => {
    if (modelIds.has(input.id)) fail(`duplicate model id ${input.id}`);
    modelIds.add(input.id);
    if (!providerIds.has(input.provider)) fail(`model ${input.id}: provider "${input.provider}" is not defined in this file`);
    let model;
    try {
      model = buildModel(input, index + 1);
    } catch (error) {
      fail(`model ${input.id}: ${(error as Error).message}`);
      return;
    }
    const parsed = modelSchema.safeParse(model);
    if (!parsed.success) {
      fail(`model ${input.id}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    }
    for (const result of model.benchmarks) {
      if (!benchmarkIds.has(result.benchmarkId)) fail(`model ${input.id}: unknown benchmark "${result.benchmarkId}"`);
    }
    const collect = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.url === "string" && typeof record.checkedAt === "string") urls.add(record.url);
        Object.values(record).forEach(collect);
      }
    };
    collect(model);
  });

  console.log(`  ${providerIds.size} provider(s), ${modelIds.size} model(s), ${urls.size} unique source URL(s)`);

  if (checkUrls) {
    const list = [...urls];
    for (let index = 0; index < list.length; index += 8) {
      const batch = list.slice(index, index + 8);
      const statuses = await Promise.all(batch.map(reachable));
      batch.forEach((url, offset) => {
        const status = statuses[offset];
        if (status === 404 || status === 410) fail(`source not found (${status}): ${url}`);
        else if (status === 0 || status >= 500) console.warn(`  ! source unreachable (${status || "network"}): ${url}`);
        else if (status >= 400) console.warn(`  ! source returned ${status} (often bot protection; verify manually): ${url}`);
      });
    }
  }
}

if (failures) {
  console.error(`\n${failures} problem(s) found.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
}

void main();
