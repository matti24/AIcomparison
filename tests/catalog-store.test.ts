import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import * as filesystem from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { seedCatalog } from "../src/data/catalog";
import {
  CatalogConflictError,
  CatalogStorageError,
  ConflictError,
  getCatalog,
  getStorageMode,
  saveCatalog,
} from "../src/lib/catalog-store";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, rename: vi.fn(original.rename) };
});

const execute = promisify(execFile);
const project = process.cwd();
// Test artifacts stay inside the project, never in an OS temporary directory.
const suiteDirectory = path.join(project, "tests", `.catalog-store-tests-${randomUUID()}`);
let directory: string;

beforeEach(async () => {
  directory = path.join(suiteDirectory, randomUUID());
  await mkdir(directory, { recursive: true });
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("AI_COMPARE_DATA_DIR", directory);
});

afterEach(async () => {
  vi.mocked(filesystem.rename).mockReset();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});

afterAll(async () => {
  await rm(suiteDirectory, { recursive: true, force: true });
});

const target = () => path.join(directory, "catalog.json");

describe("local catalog persistence", () => {
  it("exports the requested ConflictError name and keeps the compatibility alias", () => {
    const error = new ConflictError();
    expect(error.name).toBe("ConflictError");
    expect(error.code).toBe("CATALOG_CONFLICT");
    expect(CatalogConflictError).toBe(ConflictError);
  });

  it("explicitly initializes a missing catalog and returns independent snapshots", async () => {
    expect(getStorageMode()).toBe("local");
    const first = await getCatalog();
    expect(first).toEqual(seedCatalog);
    expect(JSON.parse(await readFile(target(), "utf8"))).toEqual(seedCatalog);
    first.models[0].description = "Unpersisted caller mutation";
    expect((await getCatalog()).models[0].description).toBe(seedCatalog.models[0].description);
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  });

  it("uses the statically scoped .data default when no override is configured", async () => {
    vi.stubEnv("AI_COMPARE_DATA_DIR", "");
    vi.spyOn(process, "cwd").mockReturnValue(directory);
    const catalog = await getCatalog();
    const file = path.join(directory, ".data", "catalog.json");
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual(catalog);
    expect(await readdir(directory)).toEqual([".data"]);
  });

  it("resolves a relative runtime directory without changing the default catalog", async () => {
    const destination = path.join(directory, "relative-storage");
    vi.stubEnv("AI_COMPARE_DATA_DIR", path.relative(project, destination));
    const catalog = await getCatalog();
    expect(JSON.parse(await readFile(path.join(destination, "catalog.json"), "utf8"))).toEqual(catalog);
    expect(await readdir(directory)).toEqual(["relative-storage"]);
  });

  it("keeps runtime data paths outside Turbopack's asset tracing", async () => {
    const source = await readFile(path.join(project, "src", "lib", "catalog-store.ts"), "utf8");
    expect(source).toContain('const defaultDirectory = path.join(/* turbopackIgnore: true */ process.cwd(), ".data")');
    expect(source).toContain("await resolveRuntimeDirectory(configuredDirectory)");
    expect(source).toContain("/* webpackIgnore: true */");
    expect(source).not.toContain("path.resolve(");
    expect(source).toContain('readFile(/* turbopackIgnore: true */ paths.catalog, "utf8")');
    expect(source).not.toContain('process.env.AI_COMPARE_DATA_DIR?.trim() || ".data"');
  });

  it("saves atomically, persists after re-read, and does not mutate its input", async () => {
    const original = await getCatalog();
    const proposed = structuredClone(original);
    proposed.models[0].description = "A persistent editorial edit.";
    const saved = await saveCatalog(proposed, original.updatedAt);
    expect(saved.models[0].description).toBe(proposed.models[0].description);
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse(original.updatedAt));
    expect(proposed.updatedAt).toBe(original.updatedAt);
    expect(await getCatalog()).toEqual(saved);
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  });

  it("allows one of concurrent stale writes and surfaces conflicts for the others", async () => {
    const original = await getCatalog();
    const outcomes = await Promise.allSettled(
      ["first", "second", "third"].map(async (name) => {
        const proposed = structuredClone(original);
        proposed.models[0].description = `${name} writer`;
        return saveCatalog(proposed, original.updatedAt);
      }),
    );
    const saved = outcomes.filter((outcome) => outcome.status === "fulfilled");
    const rejected = outcomes.filter((outcome) => outcome.status === "rejected");
    expect(saved).toHaveLength(1);
    expect(rejected).toHaveLength(2);
    for (const outcome of rejected) {
      if (outcome.status === "rejected") expect(outcome.reason).toBeInstanceOf(CatalogConflictError);
    }
    expect((await getCatalog()).models[0].description).toBe("first writer");
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  });

  it.skipIf(process.platform !== "win32")("retries a transient Windows sharing violation without losing the snapshot", async () => {
    const original = await getCatalog();
    const sharingError = Object.assign(new Error("Snapshot is temporarily held by another reader"), { code: "EPERM" });
    const replacement = vi.mocked(filesystem.rename).mockRejectedValueOnce(sharingError);
    const proposed = structuredClone(original);
    proposed.models[0].description = "Saved after a transient Windows sharing violation.";
    const saved = await saveCatalog(proposed, original.updatedAt);
    expect(replacement).toHaveBeenCalledTimes(2);
    expect(await getCatalog()).toEqual(saved);
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  });

  it.skipIf(process.platform !== "win32")("bounds Windows sharing retries and preserves the old catalog on failure", async () => {
    const original = await getCatalog();
    const sharingError = Object.assign(new Error("Snapshot remains locked"), { code: "EACCES" });
    const replacement = vi.mocked(filesystem.rename).mockRejectedValue(sharingError);
    await expect(saveCatalog(original, original.updatedAt)).rejects.toBe(sharingError);
    expect(replacement).toHaveBeenCalledTimes(9);
    expect(await getCatalog()).toEqual(original);
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  });

  it("does not retry unrelated filesystem failures or report an unsuccessful write as saved", async () => {
    const original = await getCatalog();
    const storageError = Object.assign(new Error("No space left"), { code: "ENOSPC" });
    const replacement = vi.mocked(filesystem.rename).mockRejectedValue(storageError);
    await expect(saveCatalog(original, original.updatedAt)).rejects.toBe(storageError);
    expect(replacement).toHaveBeenCalledTimes(1);
    expect(await getCatalog()).toEqual(original);
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  });

  it("keeps versions monotonic even if the clock has not advanced", async () => {
    const first = await getCatalog();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(first.updatedAt));
    const second = await saveCatalog(first, first.updatedAt);
    const third = await saveCatalog(second, second.updatedAt);
    expect(Date.parse(second.updatedAt)).toBe(Date.parse(first.updatedAt) + 1);
    expect(Date.parse(third.updatedAt)).toBe(Date.parse(second.updatedAt) + 1);
  });

  it("recovers its write queue after a rejected optimistic-concurrency check", async () => {
    const current = await getCatalog();
    await expect(saveCatalog(current, "2000-01-01")).rejects.toBeInstanceOf(CatalogConflictError);
    const saved = await saveCatalog(current, current.updatedAt);
    expect(await getCatalog()).toEqual(saved);
  });

  it("never replaces corrupt JSON with the seed", async () => {
    const corrupt = "{ this is not valid JSON";
    await writeFile(target(), corrupt);
    await expect(getCatalog()).rejects.toBeInstanceOf(CatalogStorageError);
    await expect(saveCatalog(seedCatalog, seedCatalog.updatedAt)).rejects.toBeInstanceOf(CatalogStorageError);
    expect(await readFile(target(), "utf8")).toBe(corrupt);
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  });

  it("rejects a schema-invalid stored catalog instead of hiding the problem", async () => {
    const invalid = { ...structuredClone(seedCatalog), updatedAt: "not-a-date" };
    const content = JSON.stringify(invalid);
    await writeFile(target(), content);
    await expect(getCatalog()).rejects.toBeInstanceOf(ZodError);
    expect(await readFile(target(), "utf8")).toBe(content);
  });

  it("rejects invalid proposed data and leaves the previous snapshot untouched", async () => {
    const current = await getCatalog();
    const before = await readFile(target(), "utf8");
    current.models[0].pricing.input.value = -1;
    await expect(saveCatalog(current, current.updatedAt)).rejects.toBeInstanceOf(ZodError);
    expect(await readFile(target(), "utf8")).toBe(before);
  });

  it("surfaces filesystem errors rather than interpreting them as missing data", async () => {
    await mkdir(target());
    await expect(getCatalog()).rejects.toThrow();
    expect((await stat(target())).isDirectory()).toBe(true);
  });

  it("serializes writers across independent Node processes", async () => {
    const original = await getCatalog();
    const store = path.join(project, "src", "lib", "catalog-store.ts");
    const seed = path.join(project, "src", "data", "catalog.ts");
    const runWriter = (name: string) => {
      const script = `
        const { saveCatalog } = require(${JSON.stringify(store)});
        const { seedCatalog } = require(${JSON.stringify(seed)});
        const proposed = structuredClone(seedCatalog);
        proposed.models[0].description = ${JSON.stringify(name)};
        saveCatalog(proposed, ${JSON.stringify(original.updatedAt)})
          .then(() => console.log("saved"))
          .catch(error => {
            if (error.code === "CATALOG_CONFLICT") console.log("conflict");
            else { console.error(error.message); process.exitCode = 1; }
          });
      `;
      return execute(process.execPath, ["--conditions=react-server", "--import", "tsx", "-e", script], {
        cwd: project,
        env: { ...process.env, SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", AI_COMPARE_DATA_DIR: directory },
        timeout: 15_000,
      });
    };
    const outputs = await Promise.all([runWriter("process one"), runWriter("process two")]);
    expect(outputs.map((output) => output.stdout.trim()).sort()).toEqual(["conflict", "saved"]);
    expect(["process one", "process two"]).toContain((await getCatalog()).models[0].description);
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  }, 20_000);
});

describe("Supabase adapter contract (mock HTTP, not a hosted database test)", () => {
  const configure = () => {
    vi.stubEnv("SUPABASE_URL", "https://catalog.invalid");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  };
  const response = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("requires both private configuration variables and validates the URL", () => {
    vi.stubEnv("SUPABASE_URL", "https://catalog.invalid");
    expect(getStorageMode).toThrow(CatalogStorageError);
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    expect(getStorageMode).toThrow(CatalogStorageError);
    vi.stubEnv("SUPABASE_URL", "file:///private");
    expect(getStorageMode).toThrow(CatalogStorageError);
    configure();
    expect(getStorageMode()).toBe("supabase");
  });

  it("reads the get_catalog RPC with no fetch caching and no local fallback", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(response(seedCatalog));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getCatalog()).toEqual(seedCatalog);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://catalog.invalid/rest/v1/rpc/get_catalog");
    expect(init.cache).toBe("no-store");
    expect(await readdir(directory)).toEqual([]);
  });

  it("passes the expected version to save_catalog and returns the server's saved version", async () => {
    configure();
    const saved = { ...structuredClone(seedCatalog), updatedAt: "2026-09-30T14:00:00.001Z" };
    const fetchMock = vi.fn().mockResolvedValue(response(saved));
    vi.stubGlobal("fetch", fetchMock);
    expect(await saveCatalog(seedCatalog, seedCatalog.updatedAt)).toEqual(saved);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://catalog.invalid/rest/v1/rpc/save_catalog");
    expect(JSON.parse(init.body)).toEqual({
      p_catalog: seedCatalog,
      p_expected_updated_at: seedCatalog.updatedAt,
    });
    expect(await readdir(directory)).toEqual([]);
  });

  it("surfaces PT409 as the same conflict error used by local storage", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ code: "PT409", message: "Conflict" }, 409)));
    await expect(saveCatalog(seedCatalog, seedCatalog.updatedAt)).rejects.toBeInstanceOf(CatalogConflictError);
  });

  it("fails explicitly on uninitialized or invalid Supabase data", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(null)));
    await expect(getCatalog()).rejects.toThrow("not initialized");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ unexpected: true })));
    await expect(getCatalog()).rejects.toBeInstanceOf(ZodError);
    expect(await readdir(directory)).toEqual([]);
  });

  it("does not leak remote error details or silently fall back to the seed", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      code: "42883", message: "Private diagnostic with a credential", details: "secret", hint: "secret",
    }, 404)));
    const error = await getCatalog().then(() => null, (failure: unknown) => failure);
    expect(error).toBeInstanceOf(CatalogStorageError);
    expect(String(error)).toContain("42883");
    expect(String(error)).not.toMatch(/secret|Private diagnostic|test-service-role-key/);
    expect(await readdir(directory)).toEqual([]);
  });
});

describe("standalone non-destructive seed CLI", () => {
  const runSeed = () => execute(process.execPath, ["--import", "tsx", path.join(project, "scripts", "seed.ts")], {
    cwd: project,
    env: { ...process.env, SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", AI_COMPARE_DATA_DIR: directory },
    timeout: 15_000,
  });

  it("initializes once and preserves subsequent manual/admin edits byte-for-byte", async () => {
    const first = await runSeed();
    expect(first.stdout).toContain("Initialized local catalog");
    const catalog = JSON.parse(await readFile(target(), "utf8"));
    catalog.models[0].description = "An existing edit that a seed must never discard.";
    const content = JSON.stringify(catalog);
    await writeFile(target(), content);
    const second = await runSeed();
    expect(second.stdout).toContain("No changes made");
    expect(await readFile(target(), "utf8")).toBe(content);
    expect(await readdir(directory)).toEqual(["catalog.json"]);
  }, 20_000);

  it("fails rather than overwriting an invalid existing file", async () => {
    const corrupt = '{"broken":';
    await writeFile(target(), corrupt);
    await expect(runSeed()).rejects.toMatchObject({ code: 1 });
    expect(await readFile(target(), "utf8")).toBe(corrupt);
  }, 20_000);
});
