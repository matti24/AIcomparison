/**
 * Preview what the daily model sync would change, without writing anything.
 * Usage: npm run models:preview
 * Compares against the Supabase catalog when configured, otherwise the bundled seed.
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { seedCatalog } from "../src/data/catalog";
import { parseCatalog } from "../src/lib/catalog-schema";
import { getSupabaseServerConfig } from "../src/lib/deployment-config";
import { fetchModelSources, planModelSync } from "../src/lib/model-sync";

async function main() {
  loadEnvConfig(process.cwd());
  const config = getSupabaseServerConfig();
  let catalog = seedCatalog;
  if (config) {
    const supabase = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc("get_catalog");
    if (error || data === null) throw new Error("Could not read the Supabase catalog.");
    catalog = parseCatalog(data);
  }
  const plan = planModelSync(catalog, await fetchModelSources(), { now: new Date() });
  console.info(`Compared against the ${config ? "Supabase" : "bundled seed"} catalog (${catalog.models.length} models).`);
  for (const model of plan.added) console.info(`+ ${model.releaseDate.value}  ${model.providerId}/${model.id}  ${model.name}`);
  for (const change of plan.priceChanges) {
    console.info(`$ ${change.modelId}: input ${change.input[0] ?? "-"} -> ${change.input[1]}, output ${change.output[0] ?? "-"} -> ${change.output[1]}`);
  }
  console.info(`${plan.added.length} new, ${plan.priceChanges.length} price changes, ${plan.skipped} skipped.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
