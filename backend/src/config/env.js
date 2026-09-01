function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

// FRONTEND_URL may be a single origin or a comma-separated list (e.g. an
// apex + www, or a preview domain alongside the real one). Each entry is
// used as an exact CORS origin — never a wildcard.
const frontendUrls = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Cookie behaviour is environment-driven so the same code works for a
// same-site deployment (frontend + API under one registrable domain →
// SameSite=Lax is fine) and a cross-site one (different domains →
// SameSite=None; Secure, which the browser only accepts over HTTPS).
// Defaults preserve the existing local-dev behaviour exactly.
const cookieSameSite = (process.env.COOKIE_SAMESITE ?? "lax").toLowerCase();
const cookieSecure =
  process.env.COOKIE_SECURE != null ? process.env.COOKIE_SECURE === "true" : isProduction;

const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  // First origin kept as a plain string for existing callers (logs, etc.);
  // frontendUrls is the full list used for CORS matching.
  frontendUrl: frontendUrls[0],
  frontendUrls,
  // Absolute base URL that uploaded-media URLs are built from. When unset,
  // media.service.js falls back to deriving it from the incoming request
  // (correct for local dev). Set this in any real deployment so stored
  // media URLs don't depend on the request Host header.
  assetBaseUrl: (process.env.ASSET_BASE_URL ?? "").trim().replace(/\/+$/, "") || null,
  cookie: {
    sameSite: cookieSameSite,
    secure: cookieSecure,
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  },
  // SMTP / mail transport. Contact-form email is only ATTEMPTED when a host
  // is configured here; otherwise enquiries are stored and the mailer
  // reports "not delivered" (it never fakes success). See utils/mailer.js.
  smtp: {
    host: process.env.SMTP_HOST?.trim() || null,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER?.trim() || null,
    pass: process.env.SMTP_PASS ?? null,
    from: process.env.SMTP_FROM?.trim() || null,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
};

// Fail fast on a misconfigured production deployment rather than silently
// serving localhost CORS / an insecure session cookie / a weak JWT secret.
if (isProduction) {
  const problems = [];
  if (!process.env.FRONTEND_URL) {
    problems.push("FRONTEND_URL must be set explicitly in production (used for CORS).");
  }
  if (frontendUrls.some((u) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(u))) {
    problems.push("FRONTEND_URL points at localhost in a production build.");
  }
  if (env.jwtSecret.length < 32) {
    problems.push("JWT_SECRET must be at least 32 characters in production.");
  }
  if (cookieSameSite === "none" && !cookieSecure) {
    problems.push("COOKIE_SAMESITE=none requires COOKIE_SECURE=true (and HTTPS).");
  }
  if (env.assetBaseUrl && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(env.assetBaseUrl)) {
    problems.push("ASSET_BASE_URL points at localhost in a production build.");
  }
  if (problems.length) {
    throw new Error("Invalid production configuration:\n  - " + problems.join("\n  - "));
  }
}

module.exports = { env };
