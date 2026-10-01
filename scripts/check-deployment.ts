import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { parseCatalog } from "../src/lib/catalog-schema";
import { deploymentProblems, requireSupabaseServerConfig } from "../src/lib/deployment-config";

class DeploymentCheckError extends Error {}

async function main() {
  loadEnvConfig(process.cwd());
  const problems = deploymentProblems();
  if (problems.length) {
    console.error("Deployment configuration is incomplete:");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
    return;
  }

  const { url, key } = requireSupabaseServerConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
    },
  });

  const { data, error } = await supabase.rpc("get_catalog");
  if (error || data === null) {
    throw new DeploymentCheckError("The production catalog is unavailable. Apply supabase/schema.sql and run npm run db:seed before deploying.");
  }
  const catalog = parseCatalog(data);
  if (!catalog.models.length || !catalog.providers.length) {
    throw new DeploymentCheckError("The production catalog is empty. Seed it before deploying.");
  }

  for (const table of ["analytics_events", "newsletter_subscribers"]) {
    const { error: tableError } = await supabase.from(table).select("*", { head: true }).limit(1);
    if (tableError) {
      throw new DeploymentCheckError(`Production storage table ${table} is unavailable. Apply supabase/schema.sql before deploying.`);
    }
  }
  console.info(`Deployment checks passed: ${catalog.models.length} models, ${catalog.providers.length} providers, durable newsletter and analytics storage.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof DeploymentCheckError
    ? error.message
    : "Deployment checks failed. Verify database connectivity, service credentials, schema, and seed data. No credentials were printed.");
  process.exitCode = 1;
});
