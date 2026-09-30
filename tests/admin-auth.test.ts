import { afterEach, describe, expect, it, vi } from "vitest";
import { allowLoginAttempt, createAdminToken, getAdminConfig, isSameOrigin, resetLoginAttempts, SESSION_SECONDS, verifyAdminToken, verifyPassword } from "../src/lib/admin-auth";
import { HttpInputError, readJsonBody } from "../src/lib/admin-http";
import { randomBytes } from "node:crypto";

const config = { password: randomBytes(24).toString("hex"), secret: randomBytes(48).toString("hex") };
const now = new Date("2026-01-10T12:00:00Z").getTime();
afterEach(() => vi.unstubAllEnvs());

describe("admin authentication", () => {
  it("has no insecure default configuration", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(getAdminConfig()).toBeNull();
    vi.stubEnv("ADMIN_PASSWORD", "short");
    expect(() => getAdminConfig()).toThrow("Admin configuration requires");
  });
  it("checks passwords without a plain-text equality comparison", () => {
    expect(verifyPassword(config.password, config)).toBe(true);
    expect(verifyPassword("wrong", config)).toBe(false);
  });
  it("accepts valid tokens and rejects expired, malformed, and tampered tokens", () => {
    const token = createAdminToken(config, now);
    expect(verifyAdminToken(token, config, now)).toBe(true);
    expect(verifyAdminToken(token, config, now + SESSION_SECONDS * 1000)).toBe(false);
    expect(verifyAdminToken(`${token}tampered`, config, now)).toBe(false);
    expect(verifyAdminToken("not-a-token", config, now)).toBe(false);
    expect(verifyAdminToken(undefined, config, now)).toBe(false);
  });
  it("revokes tokens on password or signing-key changes", () => {
    const token = createAdminToken(config, now);
    expect(verifyAdminToken(token, { ...config, password: randomBytes(24).toString("hex") }, now)).toBe(false);
    expect(verifyAdminToken(token, { ...config, secret: randomBytes(48).toString("hex") }, now)).toBe(false);
  });
  it("rejects cross-origin and missing-origin mutations", () => {
    expect(isSameOrigin(new Request("https://ai.example/api/admin/catalog", { headers: { origin: "https://ai.example" } }))).toBe(true);
    expect(isSameOrigin(new Request("https://ai.example/api/admin/catalog", { headers: { origin: "https://elsewhere.example" } }))).toBe(false);
    expect(isSameOrigin(new Request("https://ai.example/api/admin/catalog"))).toBe(false);
  });
  it("uses the actual request host when Next normalizes a production loopback URL", () => {
    const request = new Request("http://localhost:3011/api/admin/session", {
      headers: { host: "127.0.0.1:3011", origin: "http://127.0.0.1:3011" },
    });
    expect(isSameOrigin(request)).toBe(true);
    expect(isSameOrigin(new Request(request, { headers: { host: "127.0.0.1:3011", origin: "https://elsewhere.example" } }))).toBe(false);
  });
  it("rejects malformed authority and explicitly cross-site requests", () => {
    expect(isSameOrigin(new Request("https://ai.example/api/admin/session", { headers: { host: "evil.example@ai.example", origin: "https://ai.example" } }))).toBe(false);
    expect(isSameOrigin(new Request("https://ai.example/api/admin/session", { headers: { host: "ai.example", origin: "https://ai.example", "sec-fetch-site": "cross-site" } }))).toBe(false);
  });
  it("caps login attempts and allows recovery after the window", () => {
    const client = randomBytes(16).toString("hex");
    for (let attempt = 0; attempt < 10; attempt++) expect(allowLoginAttempt(client, now)).toBe(true);
    expect(allowLoginAttempt(client, now)).toBe(false);
    expect(allowLoginAttempt(client, now + 15 * 60 * 1000)).toBe(true);
    resetLoginAttempts(client);
    expect(allowLoginAttempt(client, now)).toBe(true);
  });
});

describe("bounded admin request bodies", () => {
  it("parses JSON and rejects invalid data explicitly", async () => {
    const request = (body: string) => new Request("https://example.com", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    expect(await readJsonBody(request('{"value":1}'), 50)).toEqual({ value: 1 });
    await expect(readJsonBody(request("{oops"), 50)).rejects.toThrow("not valid JSON");
    await expect(readJsonBody(request('{"value":"too long"}'), 5)).rejects.toMatchObject({ status: 413 });
  });
  it("rejects a non-JSON content type", async () => {
    const request = new Request("https://example.com", { method: "POST", body: "{}" });
    await expect(readJsonBody(request, 50)).rejects.toBeInstanceOf(HttpInputError);
  });
});
