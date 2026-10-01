/**
 * npm run db:seed              Initialize an empty catalog (non-destructive).
 * npm run db:seed -- --replace Replace the stored catalog with the current reference seed.
 *
 * Loads .env.local / .env using Next's environment loader.
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY: seed Supabase after applying supabase/schema.sql.
 * Neither variable: seed .data/catalog.json, or AI_COMPARE_DATA_DIR/catalog.json.
 *
 * Without --replace, existing valid catalogs are left untouched. --replace writes a
 * timestamped backup first (local mode) and publishes with optimistic concurrency
 * (Supabase), so admin edits are never silently lost. Use it after upgrading the
 * reference data, for example from catalog schema v1 to v2.
 *
 * This standalone CLI does not import the server-only Next.js storage module.
 */
import { randomUUID } from "node:crypto";
import { copyFile, link, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { ZodError } from "zod";

import { seedCatalog } from "../src/data/catalog";
import { catalogSchema, parseCatalog } from "../src/lib/catalog-schema";
import { getSupabaseServerConfig } from "../src/lib/deployment-config";
import type { Catalog } from "../src/lib/types";

function hasCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function summary(catalog: Catalog) {
  return `${catalog.providers.length} providers, ${catalog.models.length} models`;
}

async function readExisting(file: string): Promise<Catalog | null> {
  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    throw new Error("Cannot read local catalog.json. Check directory permissions; no data was replaced.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Existing catalog.json is malformed. Repair or restore it; seeding will not overwrite it.");
  }
  return parseCatalog(parsed);
}

async function writeStaged(directory: string, seed: Catalog) {
  const staging = path.join(directory, `.catalog-seed-${randomUUID()}.tmp`);
  const handle = await open(staging, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(seed, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  return staging;
}

async function seedLocal(seed: Catalog, replace: boolean) {
  const configuredDirectory = process.env.AI_COMPARE_DATA_DIR?.trim();
  const directory = configuredDirectory ? path.resolve(process.cwd(), configuredDirectory) : path.join(process.cwd(), ".data");
  const target = path.join(directory, "catalog.json");
  const existing = await readExisting(target);
  if (existing && !replace) {
    console.info(`Local catalog already initialized (${summary(existing)}). No changes made. Use --replace to load the current reference seed.`);
    return;
  }

  await mkdir(directory, { recursive: true });
  if (existing) {
    const backup = path.join(directory, `catalog.backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    await copyFile(target, backup);
    console.info(`Backed up the previous catalog to ${path.relative(process.cwd(), backup)}.`);
  }

  const staging = await writeStaged(directory, seed);
  let created = false;
  try {
    if (existing) {
      await rename(staging, target);
      created = true;
    } else {
      try {
        // Hard-link publication is atomic and cannot overwrite a concurrently created catalog.
        await link(staging, target);
        created = true;
      } catch (error) {
        if (!hasCode(error, "EEXIST")) throw new Error("Cannot publish the local catalog atomically. Check filesystem permissions and hard-link support.");
      }
    }
  } finally {
    try {
      await unlink(staging);
    } catch (error) {
      if (!hasCode(error, "ENOENT")) throw new Error("Could not remove the seed staging file.");
    }
  }

  const persisted = await readExisting(target);
  if (!persisted) throw new Error("Seed initialization did not persist a local catalog.");
  console.info(created ? `${existing ? "Replaced" : "Initialized"} local catalog (${summary(persisted)}).` : `Another writer initialized the local catalog (${summary(persisted)}). No data replaced.`);
}

function rpcFailure(operation: string, code?: string): Error {
  const safeCode = code && /^[a-zA-Z0-9_]{1,20}$/.test(code) ? ` (${code})` : "";
  return new Error(`Supabase ${operation} failed${safeCode}. Check connectivity, service-role credentials, and apply supabase/schema.sql first.`);
}

async function seedSupabase(seed: Catalog, url: string, key: string, replace: boolean) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(60_000) }) },
  });
  const existing = await client.rpc("get_catalog");
  if (existing.error) throw rpcFailure("read", existing.error.code);
  let expected: string | null = null;
  if (existing.data !== null) {
    const catalog = parseCatalog(existing.data);
    if (!replace) {
      console.info(`Supabase catalog already initialized (${summary(catalog)}). No changes made. Use --replace to load the current reference seed.`);
      return;
    }
    expected = catalog.updatedAt;
  }

  const result = await client.rpc("save_catalog", { p_catalog: seed, p_expected_updated_at: expected });
  if (result.error?.code === "PT409") throw new Error("The Supabase catalog changed during seeding. Nothing was replaced; run the command again.");
  if (result.error) throw rpcFailure("save", result.error.code);
  const saved = parseCatalog(result.data);
  console.info(`${expected ? "Replaced" : "Initialized"} Supabase catalog (${summary(saved)}).`);
}

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--replace");
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(" ")}. The only supported option is --replace.`);
  const replace = args.includes("--replace");
  loadEnvConfig(process.cwd());
  const seed = catalogSchema.parse(seedCatalog);
  const supabase = getSupabaseServerConfig();
  if (supabase) {
    await seedSupabase(seed, supabase.url, supabase.key, replace);
  } else {
    await seedLocal(seed, replace);
  }
}

main().catch((error: unknown) => {
  if (error instanceof ZodError) {
    console.error("Catalog validation failed; no invalid catalog was written.");
    for (const issue of error.issues.slice(0, 30)) console.error(`${issue.path.join(".")}: ${issue.message}`);
  } else if (error instanceof Error && !("code" in error)) {
    console.error(error.message);
  } else {
    console.error("Catalog initialization failed. Check local permissions or database configuration; existing data was not reset.");
  }
  process.exitCode = 1;
});
