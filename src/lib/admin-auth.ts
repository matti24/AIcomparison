import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "ai-compare-admin";
export const SESSION_SECONDS = 8 * 60 * 60;
const SESSION_VERSION = "v1";

interface AdminConfig { password: string; secret: string }

export function getAdminConfig(): AdminConfig | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password && !secret) return null;
  if (!password || password.length < 16 || !secret || secret.length < 32) {
    throw new Error("Admin configuration requires ADMIN_PASSWORD (16+ characters) and ADMIN_SESSION_SECRET (32+ characters).");
  }
  return { password, secret };
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function verifyPassword(candidate: string, config: AdminConfig) {
  return timingSafeEqual(digest(candidate), digest(config.password));
}

function signature(payload: string, config: AdminConfig) {
  return createHmac("sha256", config.secret).update(`${payload}.${digest(config.password).toString("hex")}`).digest("base64url");
}

export function createAdminToken(config: AdminConfig, now = Date.now()) {
  const payload = `${SESSION_VERSION}.${Math.floor(now / 1000) + SESSION_SECONDS}.${randomBytes(20).toString("base64url")}`;
  return `${payload}.${signature(payload, config)}`;
}

export function verifyAdminToken(token: string | undefined, config: AdminConfig, now = Date.now()) {
  if (!token || token.length > 240) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== SESSION_VERSION || !/^\d{10,12}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{27}$/.test(parts[2])) return false;
  const expiry = Number(parts[1]);
  const currentTime = Math.floor(now / 1000);
  if (expiry <= currentTime || expiry > currentTime + SESSION_SECONDS) return false;
  const expected = signature(parts.slice(0, 3).join("."), config);
  return timingSafeEqual(digest(expected), digest(parts[3]));
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (!host) return origin === url.origin;
  if (/[/\\@?#\s]/.test(host)) return false;
  // Next may normalize a loopback hostname in request.url; Host retains the browser's authority.
  const transportOrigin = `${url.protocol}//${host}`;
  return URL.canParse(transportOrigin) && origin === new URL(transportOrigin).origin;
}

const attempts = new Map<string, { count: number; expires: number }>();
const ATTEMPT_WINDOW = 15 * 60 * 1000;

export function allowLoginAttempt(clientAddress: string, now = Date.now()) {
  for (const [key, value] of attempts) {
    if (value.expires <= now) attempts.delete(key);
  }
  const key = digest(clientAddress).toString("hex");
  const entry = attempts.get(key);
  if (entry && entry.count >= 10) return false;
  if (attempts.size >= 10_000 && !entry) return false;
  attempts.set(key, { count: (entry?.count ?? 0) + 1, expires: entry?.expires ?? now + ATTEMPT_WINDOW });
  return true;
}

export function resetLoginAttempts(clientAddress: string) {
  attempts.delete(digest(clientAddress).toString("hex"));
}
