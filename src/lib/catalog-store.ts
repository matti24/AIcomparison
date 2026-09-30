import "server-only";

import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { seedCatalog } from "../data/catalog";
import { catalogSchema, httpUrlSchema, timestampSchema } from "./catalog-schema";
import type { Catalog } from "./types";

export class ConflictError extends Error {
  readonly code = "CATALOG_CONFLICT";

  constructor() {
    super("The catalog changed since it was loaded. Reload it before saving again.");
    this.name = "ConflictError";
  }
}

export { ConflictError as CatalogConflictError };

export class CatalogStorageError extends Error {
  readonly code = "CATALOG_STORAGE_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "CatalogStorageError";
  }
}

export function getStorageMode(): "local" | "supabase" {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (Boolean(url) !== Boolean(key)) {
    throw new CatalogStorageError(
      "Configure both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither for local storage.",
    );
  }
  if (!url || !key) return "local";
  if (!httpUrlSchema.safeParse(url).success) {
    throw new CatalogStorageError("SUPABASE_URL must be a valid HTTP(S) URL.");
  }
  return "supabase";
}

function supabase() {
  return createClient(
    process.env.SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            cache: "no-store",
            signal: init?.signal ?? AbortSignal.timeout(15_000),
          }),
      },
    },
  );
}

function rpcError(operation: "read" | "save", code?: string) {
  if (code === "PT409") return new ConflictError();
  const safeCode = code && /^[a-zA-Z0-9_]{1,20}$/.test(code) ? ` (${code})` : "";
  return new CatalogStorageError(
    `Supabase catalog ${operation} failed${safeCode}. Check connectivity, service-role credentials, and supabase/schema.sql.`,
  );
}

async function resolveRuntimeDirectory(configuredDirectory: string) {
  // Keep arbitrary deployment paths opaque to both supported bundlers.
  const runtimePath = await import(
    /* webpackIgnore: true */
    /* turbopackIgnore: true */
    "node:path"
  );
  return runtimePath.resolve(/* turbopackIgnore: true */ process.cwd(), configuredDirectory);
}

async function localPaths() {
  const defaultDirectory = path.join(/* turbopackIgnore: true */ process.cwd(), ".data");
  const configuredDirectory = process.env.AI_COMPARE_DATA_DIR?.trim();
  // Overrides are runtime-only, absolute or cwd-relative writable directories.
  // Mount persistent storage in production; user data is not a bundled asset.
  const directory = configuredDirectory
    ? await resolveRuntimeDirectory(configuredDirectory)
    : defaultDirectory;
  return {
    directory,
    catalog: path.join(/* turbopackIgnore: true */ directory, "catalog.json"),
    lock: path.join(/* turbopackIgnore: true */ directory, "catalog.lock"),
  };
}

type LocalPaths = Awaited<ReturnType<typeof localPaths>>;

function hasCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function isWindowsSharingError(error: unknown) {
  return process.platform === "win32" &&
    ["EPERM", "EACCES", "EBUSY"].some((code) => hasCode(error, code));
}

async function retryFileMutation(operation: () => Promise<void>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isWindowsSharingError(error) || attempt >= 8) throw error;
      // Windows readers and indexers can briefly deny rename or unlink after a handle closes.
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}

async function readLocal(paths: LocalPaths): Promise<Catalog | null> {
  let content: string;
  try {
    content = await readFile(/* turbopackIgnore: true */ paths.catalog, "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new CatalogStorageError(
      "Local catalog.json contains invalid JSON. Repair or restore it; the stored file has not been replaced.",
    );
  }
  return catalogSchema.parse(parsed);
}

async function removeIfPresent(file: string) {
  try {
    await retryFileMutation(() => unlink(/* turbopackIgnore: true */ file));
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
  }
}

async function writeAtomic(paths: LocalPaths, catalog: Catalog, createOnly = false) {
  const staging = path.join(
    /* turbopackIgnore: true */ paths.directory,
    `.catalog-${process.pid}-${randomUUID()}.tmp`,
  );
  const handle = await open(/* turbopackIgnore: true */ staging, "wx", 0o600);

  try {
    try {
      await handle.writeFile(`${JSON.stringify(catalog, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }

    if (createOnly) {
      // A hard link publishes the complete file without replacing an existing seed.
      try {
        await link(/* turbopackIgnore: true */ staging, paths.catalog);
      } catch (error) {
        if (hasCode(error, "EEXIST")) return false;
        throw error;
      }
    } else {
      // Same-directory rename replaces the snapshot atomically, including on Windows.
      await retryFileMutation(() => rename(/* turbopackIgnore: true */ staging, paths.catalog));
    }
    return true;
  } finally {
    await removeIfPresent(staging);
  }
}

async function withFileLock<T>(paths: LocalPaths, operation: () => Promise<T>): Promise<T> {
  await mkdir(/* turbopackIgnore: true */ paths.directory, { recursive: true });
  const deadline = performance.now() + 5000;
  let handle: Awaited<ReturnType<typeof open>>;

  for (;;) {
    try {
      handle = await open(/* turbopackIgnore: true */ paths.lock, "wx", 0o600);
      break;
    } catch (error) {
      if (!hasCode(error, "EEXIST") && !isWindowsSharingError(error)) throw error;
      if (performance.now() >= deadline) {
        if (!hasCode(error, "EEXIST")) throw error;
        throw new CatalogStorageError(
          "The local catalog is locked by another writer. Retry; if a stopped process left catalog.lock, remove it only after confirming no writer is running.",
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }

  try {
    await handle.writeFile(`${process.pid}\n`, "utf8");
    return await operation();
  } finally {
    await handle.close();
    await retryFileMutation(() => unlink(/* turbopackIgnore: true */ paths.lock));
  }
}

const localQueues = new Map<string, Promise<void>>();

function serializeLocal<T>(paths: LocalPaths, operation: () => Promise<T>): Promise<T> {
  const previous = localQueues.get(paths.catalog) ?? Promise.resolve();
  const result = previous.then(() => withFileLock(paths, operation));
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  localQueues.set(paths.catalog, settled);
  void settled.then(() => {
    if (localQueues.get(paths.catalog) === settled) localQueues.delete(paths.catalog);
  });
  return result;
}

function nextUpdatedAt(previous: string) {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}

export async function getCatalog(): Promise<Catalog> {
  if (getStorageMode() === "supabase") {
    const { data, error } = await supabase().rpc("get_catalog");
    if (error) throw rpcError("read", error.code);
    if (data === null) {
      throw new CatalogStorageError(
        "The Supabase catalog is not initialized. Apply supabase/schema.sql and run npm run db:seed.",
      );
    }
    return catalogSchema.parse(data);
  }

  const paths = await localPaths();
  const existing = await readLocal(paths);
  if (existing) return existing;

  return serializeLocal(paths, async () => {
    const current = await readLocal(paths);
    if (current) return current;
    const seed = catalogSchema.parse(seedCatalog);
    if (await writeAtomic(paths, seed, true)) return seed;
    const initialized = await readLocal(paths);
    if (!initialized) throw new CatalogStorageError("Local catalog initialization did not persist.");
    return initialized;
  });
}

export async function saveCatalog(
  catalog: Catalog,
  expectedUpdatedAt: string,
): Promise<Catalog> {
  const proposed = catalogSchema.parse(catalog);
  timestampSchema.parse(expectedUpdatedAt);

  if (getStorageMode() === "supabase") {
    const { data, error } = await supabase().rpc("save_catalog", {
      p_catalog: proposed,
      p_expected_updated_at: expectedUpdatedAt,
    });
    if (error) throw rpcError("save", error.code);
    if (data === null) throw new CatalogStorageError("Supabase did not return a saved catalog.");
    return catalogSchema.parse(data);
  }

  const paths = await localPaths();
  return serializeLocal(paths, async () => {
    const current = (await readLocal(paths)) ?? catalogSchema.parse(seedCatalog);
    // Check after acquiring both locks; a check before the queue would lose updates.
    if (current.updatedAt !== expectedUpdatedAt) throw new ConflictError();
    const saved = catalogSchema.parse({
      ...proposed,
      updatedAt: nextUpdatedAt(current.updatedAt),
    });
    await writeAtomic(paths, saved);
    return saved;
  });
}
