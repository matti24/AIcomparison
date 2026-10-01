import { describe, expect, it } from "vitest";
import {
  CatalogStorageError,
  deploymentProblems,
  getSupabaseServerConfig,
} from "../src/lib/deployment-config";

const configured = {
  VERCEL: "1",
  SUPABASE_URL: "https://catalog.example.com",
  SUPABASE_SECRET_KEY: "sb_secret_test_only",
  NEXT_PUBLIC_SITE_URL: "https://ai-compare.example.com",
  ADMIN_PASSWORD: "test-admin-password-12345",
  ADMIN_SESSION_SECRET: "test-independent-session-secret-1234567890",
};

describe("Vercel deployment configuration", () => {
  it("accepts the marketplace secret key and keeps legacy service-role support", () => {
    expect(getSupabaseServerConfig(configured)).toEqual({
      url: configured.SUPABASE_URL,
      key: configured.SUPABASE_SECRET_KEY,
    });
    expect(getSupabaseServerConfig({
      ...configured,
      SUPABASE_SECRET_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-key",
    })?.key).toBe("legacy-key");
    expect(deploymentProblems(configured)).toEqual([]);
  });

  it("preserves local development without database credentials", () => {
    expect(getSupabaseServerConfig({})).toBeNull();
  });

  it("refuses ephemeral local storage on Vercel", () => {
    expect(() => getSupabaseServerConfig({ VERCEL: "1" })).toThrow(CatalogStorageError);
    expect(deploymentProblems({ VERCEL: "1" }).join("\n")).toContain("Local filesystem storage is not supported");
  });

  it("rejects partial credentials and unsafe database URLs", () => {
    expect(() => getSupabaseServerConfig({ SUPABASE_URL: configured.SUPABASE_URL })).toThrow(CatalogStorageError);
    expect(() => getSupabaseServerConfig({ SUPABASE_SECRET_KEY: "key" })).toThrow(CatalogStorageError);
    expect(() => getSupabaseServerConfig({ ...configured, SUPABASE_URL: "file:///private" })).toThrow(CatalogStorageError);
  });

  it.each([
    undefined,
    "http://localhost:3000",
    "https://localhost",
    "https://127.0.0.1",
    "https://preview.localhost",
    "https://example.com/models",
    "https://example.com?token=secret",
    "https://example.com#models",
  ])("requires a public HTTPS canonical origin: %s", (origin) => {
    expect(deploymentProblems({ ...configured, NEXT_PUBLIC_SITE_URL: origin }).length).toBeGreaterThan(0);
  });

  it("requires independent production admin secrets without printing their values", () => {
    const secret = "sensitive-test-value";
    const problems = deploymentProblems({
      ...configured,
      ADMIN_PASSWORD: secret,
      ADMIN_SESSION_SECRET: secret,
    });
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).not.toContain(secret);
  });
});
