import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_COOKIE, allowLoginAttempt, createAdminToken, getAdminConfig, isSameOrigin, resetLoginAttempts, SESSION_SECONDS, verifyAdminToken, verifyPassword } from "@/lib/admin-auth";
import { HttpInputError, jsonResponse, readJsonBody } from "@/lib/admin-http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const config = getAdminConfig();
    return jsonResponse({ configured: Boolean(config), authenticated: config ? verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value, config) : false });
  } catch (error) {
    console.error("Admin configuration error:", error);
    return jsonResponse({ error: "Admin credentials are not configured correctly. Check the server environment." }, 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonResponse({ error: "Sign in from this website's own origin." }, 403);
  // A shared limiter is deliberate: untrusted forwarded IP headers cannot bypass it.
  const clientAddress = "admin-login";
  if (!allowLoginAttempt(clientAddress)) return jsonResponse({ error: "Too many login attempts. Please wait 15 minutes and try again." }, 429);
  try {
    const config = getAdminConfig();
    if (!config) return jsonResponse({ error: "Admin access is not configured. Run the local setup or configure the server environment." }, 503);
    const body = z.object({ password: z.string().min(1).max(512) }).strict().safeParse(await readJsonBody(request, 2_048));
    if (!body.success) return jsonResponse({ error: "Enter a password of at most 512 characters." }, 400);
    if (!verifyPassword(body.data.password, config)) return jsonResponse({ error: "That password is not correct." }, 401);
    resetLoginAttempts(clientAddress);
    const response = jsonResponse({ authenticated: true });
    response.cookies.set(ADMIN_COOKIE, createAdminToken(config), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof HttpInputError) return jsonResponse({ error: error.message }, error.status);
    console.error("Admin sign-in failed:", error);
    return jsonResponse({ error: "Sign-in is temporarily unavailable. Check the server configuration." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonResponse({ error: "Sign out from this website's own origin." }, 403);
  const response = jsonResponse({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
