/**
 * npm run db:seed
 *
 * Loads .env.local / .env using Next's environment loader.
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY: initialize a Supabase catalog after
 * applying supabase/schema.sql. Never use a NEXT_PUBLIC_* service-role key.
 * Neither variable: initialize .data/catalog.json, or AI_COMPARE_DATA_DIR/catalog.json.
 * AI_COMPARE_DATA_DIR accepts an absolute path (including an external mounted volume)
 * or a path relative to the working directory. It must be writable and persistent.
 * Runtime catalog files are excluded from Turbopack tracing; deploy or initialize them
 * separately. The compiled seed remains the fallback only for a missing local file.
 * Existing valid catalogs are left untouched. There is deliberately no reset flag.
 *
 * This standalone CLI does not import the server-only Next.js storage module.
 */
import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { ZodError } from "zod";

import { seedCatalog } from "../src/data/catalog";
import { catalogSchema, httpUrlSchema } from "../src/lib/catalog-schema";
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
  return catalogSchema.parse(parsed);
}

async function seedLocal(seed: Catalog) {
  const configuredDirectory = process.env.AI_COMPARE_DATA_DIR?.trim();
  const directory = configuredDirectory
    ? path.resolve(process.cwd(), configuredDirectory)
    : path.join(process.cwd(), ".data");
  const target = path.join(directory, "catalog.json");
  const existing = await readExisting(target);
  if (existing) {
    console.info(`Local catalog already initialized (${summary(existing)}). No changes made.`);
    return;
  }

  await mkdir(directory, { recursive: true });
  const staging = path.join(directory, `.catalog-seed-${randomUUID()}.tmp`);
  const handle = await open(staging, "wx", 0o600);
  let created = false;
  try {
    try {
      await handle.writeFile(`${JSON.stringify(seed, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      // Publishing with link is atomic and cannot overwrite a concurrently created catalog.
      await link(staging, target);
      created = true;
    } catch (error) {
      if (!hasCode(error, "EEXIST")) {
        throw new Error("Cannot publish the local catalog atomically. Check filesystem permissions and hard-link support.");
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
  console.info(
    created
      ? `Initialized local catalog (${summary(persisted)}).`
      : `Another writer initialized the local catalog (${summary(persisted)}). No data replaced.`,
  );
}

function rpcFailure(operation: string, code?: string): Error {
  const safeCode = code && /^[a-zA-Z0-9_]{1,20}$/.test(code) ? ` (${code})` : "";
  return new Error(`Supabase ${operation} failed${safeCode}. Check connectivity, service-role credentials, and apply supabase/schema.sql first.`);
}

async function seedSupabase(seed: Catalog, url: string, key: string) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15_000) }),
    },
  });
  const existing = await client.rpc("get_catalog");
  if (existing.error) throw rpcFailure("read", existing.error.code);
  if (existing.data !== null) {
    const catalog = catalogSchema.parse(existing.data);
    console.info(`Supabase catalog already initialized (${summary(catalog)}). No changes made.`);
    return;
  }

  const result = await client.rpc("save_catalog", {
    p_catalog: seed,
    p_expected_updated_at: null,
  });
  if (result.error?.code === "PT409") {
    const concurrent = await client.rpc("get_catalog");
    if (concurrent.error) throw rpcFailure("read after concurrent initialization", concurrent.error.code);
    const catalog = catalogSchema.parse(concurrent.data);
    console.info(`Another writer initialized Supabase (${summary(catalog)}). No data replaced.`);
    return;
  }
  if (result.error) throw rpcFailure("initialization", result.error.code);
  const saved = catalogSchema.parse(result.data);
  console.info(`Initialized Supabase catalog (${summary(saved)}).`);
}

async function main() {
  if (process.argv.slice(2).length > 0) {
    throw new Error("This non-destructive seed script accepts no reset or overwrite flags.");
  }
  loadEnvConfig(process.cwd());
  const seed = catalogSchema.parse(seedCatalog);
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (Boolean(url) !== Boolean(key)) {
    throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither for local storage.");
  }
  if (url && key) {
    if (!httpUrlSchema.safeParse(url).success) throw new Error("SUPABASE_URL must be a valid HTTP(S) URL.");
    await seedSupabase(seed, url, key);
  } else {
    await seedLocal(seed);
  }
}

main().catch((error: unknown) => {
  if (error instanceof ZodError) {
    console.error("Catalog validation failed; no invalid catalog was written.");
    for (const issue of error.issues) console.error(`${issue.path.join(".")}: ${issue.message}`);
  } else if (error instanceof Error && !("code" in error)) {
    console.error(error.message);
  } else {
    console.error("Catalog initialization failed. Check local permissions or database configuration; existing data was not reset.");
  }
  process.exitCode = 1;
});
