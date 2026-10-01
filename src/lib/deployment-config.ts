import { httpUrlSchema } from "./catalog-schema";

type Environment = Record<string, string | undefined>;

export class CatalogStorageError extends Error {
  readonly code = "CATALOG_STORAGE_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "CatalogStorageError";
  }
}

export function getSupabaseServerConfig(env: Environment = process.env) {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (Boolean(url) !== Boolean(key)) {
    throw new CatalogStorageError(
      "Configure SUPABASE_URL together with SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!url || !key) {
    if (env.VERCEL === "1") {
      throw new CatalogStorageError(
        "Vercel requires Supabase for persistent catalog, newsletter, and analytics storage. Local filesystem storage is not supported on Vercel.",
      );
    }
    return null;
  }
  if (!httpUrlSchema.safeParse(url).success) {
    throw new CatalogStorageError("SUPABASE_URL must be a valid HTTP(S) URL.");
  }
  return { url, key };
}

export function requireSupabaseServerConfig(env: Environment = process.env) {
  const config = getSupabaseServerConfig(env);
  if (!config) throw new CatalogStorageError("Supabase storage is not configured.");
  return config;
}

export function deploymentProblems(env: Environment = process.env): string[] {
  const problems: string[] = [];
  try {
    if (!getSupabaseServerConfig(env)) {
      problems.push("Set SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.");
    }
  } catch (error) {
    if (!(error instanceof CatalogStorageError)) throw error;
    problems.push(error.message);
  }

  const origin = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!origin || !httpUrlSchema.safeParse(origin).success) {
    problems.push("Set NEXT_PUBLIC_SITE_URL to the public HTTPS origin of this deployment.");
  } else {
    const url = new URL(origin);
    if (
      url.protocol !== "https:" ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(url.hostname) ||
      url.hostname.endsWith(".localhost")
    ) {
      problems.push("NEXT_PUBLIC_SITE_URL must be a public HTTPS origin without a path, query, or fragment.");
    }
  }

  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16) {
    problems.push("Set a production ADMIN_PASSWORD with at least 16 characters.");
  }
  if (!env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32) {
    problems.push("Set a production ADMIN_SESSION_SECRET with at least 32 characters.");
  }
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD === env.ADMIN_SESSION_SECRET) {
    problems.push("ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be different.");
  }
  return problems;
}
