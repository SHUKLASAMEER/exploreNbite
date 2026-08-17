import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";

export { SESSION_COOKIE_NAME };

// Converts a jsonwebtoken `expiresIn` string ("7d", "12h", "30m", "45s") or
// a bare number of seconds into a cookie maxAge (seconds), so the cookie's
// lifetime always matches the JWT's actual lifetime instead of being
// configured separately in two places.
function expiresInToMaxAgeSeconds(expiresIn) {
  const FALLBACK_SECONDS = 60 * 60 * 24 * 7; // 7 days
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) {
    return expiresIn;
  }
  const match = /^(\d+)\s*([smhd])?$/.exec(String(expiresIn ?? "").trim());
  if (!match) return FALLBACK_SECONDS;
  const value = Number(match[1]);
  const unit = match[2] ?? "s";
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * multipliers[unit];
}

// Call from a Route Handler after a successful login.
export async function createSessionCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresInToMaxAgeSeconds(process.env.JWT_EXPIRES_IN ?? "7d"),
  });
}

// Call from the logout Route Handler. Safe to call even if no session
// cookie currently exists (e.g. it already expired) — deleting a
// non-existent cookie is a no-op, not an error.
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Call from a Server Component or Route Handler to read the raw token.
// Returns null if no cookie is present. Does not verify the token — pair
// with verifyAdminToken() from lib/auth/jwt.js.
export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
