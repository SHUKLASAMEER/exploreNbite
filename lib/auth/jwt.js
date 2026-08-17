import jwt from "jsonwebtoken";

// Generic JWT helpers. Not tied to any specific route — the admin login
// route (Phase 2B) will call signAdminToken() after verifying a password;
// protected routes/middleware will call verifyAdminToken() on the request's
// session cookie or Authorization header.

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }
  return secret;
}

export function signAdminToken(payload) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  });
}

export function verifyAdminToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}
