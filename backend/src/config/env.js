function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// A permissive true/false read for optional boolean-ish env vars.
const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "off"]);
function envFlag(name) {
  const raw = (process.env[name] ?? "").trim().toLowerCase();
  if (TRUE_VALUES.has(raw)) return true;
  if (FALSE_VALUES.has(raw)) return false;
  return null; // unset / unrecognised
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const isDevelopment = nodeEnv === "development";

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
const cookieSecureFlag = envFlag("COOKIE_SECURE");
const cookieSecure = cookieSecureFlag != null ? cookieSecureFlag : isProduction;

// --- Admin dev-bypass gate -------------------------------------------------
// The localhost-only "browse /admin without logging in" convenience
// (middleware/requireAdmin.js) is enabled ONLY here, and ONLY when:
//   • NODE_ENV === "development" (never production, never test), AND
//   • ADMIN_DEV_BYPASS is not explicitly disabled.
// It is impossible to turn on in production: the flag is ignored there, and
// a production start that finds ADMIN_DEV_BYPASS set to a truthy value fails
// fast below. Production therefore fails closed even if NODE_ENV is
// mis-set — `isProduction` is the first gate everywhere.
const adminDevBypassFlag = envFlag("ADMIN_DEV_BYPASS");
const adminDevBypass = isDevelopment && adminDevBypassFlag !== false;

// --- SMTP / mail transport ------------------------------------------------
// Contact-form email is only ATTEMPTED when SMTP_HOST + SMTP_FROM are both
// set. `secure` defaults to true only for the implicit-TLS port 465;
// everything else uses STARTTLS (the nodemailer default). Never logged.
const smtpHost = process.env.SMTP_HOST?.trim() || null;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecureFlag = envFlag("SMTP_SECURE");
const smtp = {
  host: smtpHost,
  port: Number.isFinite(smtpPort) ? smtpPort : 587,
  secure: smtpSecureFlag != null ? smtpSecureFlag : smtpPort === 465,
  user: process.env.SMTP_USER?.trim() || null,
  pass: process.env.SMTP_PASS || null,
  from: process.env.SMTP_FROM?.trim() || null,
};
smtp.configured = Boolean(smtp.host && smtp.from);

// --- Media storage -------------------------------------------------------
// Uploaded files live on local disk (backend/uploads). That is only safe in
// production if the directory is a persistent mounted volume OR media is
// served from object storage / a CDN via ASSET_BASE_URL. In production the
// server refuses to start unless one of those is asserted (see below).
const assetBaseUrl = (process.env.ASSET_BASE_URL ?? "").trim().replace(/\/+$/, "") || null;
const mediaStorageAck = (process.env.MEDIA_STORAGE_ACK ?? "").trim().toLowerCase() || null;

// --- Rate limiter (env-tunable; defaults unchanged) ---------------------
function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

const env = {
  nodeEnv,
  isProduction,
  isDevelopment,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  // First origin kept as a plain string for existing callers (logs, etc.);
  // frontendUrls is the full list used for CORS matching.
  frontendUrl: frontendUrls[0],
  frontendUrls,
  adminDevBypass,
  // Absolute base URL that uploaded-media URLs are built from. When unset,
  // media URLs are stored root-relative ("/uploads/...") and the frontend
  // proxies them. Set this to a CDN / dedicated media origin in production.
  assetBaseUrl,
  mediaStorageAck,
  cookie: {
    sameSite: cookieSameSite,
    secure: cookieSecure,
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  },
  smtp,
  rateLimit: {
    loginMax: envInt("RATE_LIMIT_LOGIN_MAX", 10),
    publicWriteMax: envInt("RATE_LIMIT_PUBLIC_WRITE_MAX", 20),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  // --- AI provider (AI SEO Suggestions) ---------------------------------
  // No provider is wired yet — see services/ai/provider.js. These env vars
  // are read but currently unused by any request path; `configured` only
  // becomes true once a real adapter is registered in that file's PROVIDERS
  // map AND both vars are set. Never assume "configured" implies a working
  // call exists.
  ai: {
    provider: process.env.AI_PROVIDER?.trim() || null,
    apiKey: process.env.AI_API_KEY || null,
  },
};

// Fail fast on a misconfigured production deployment rather than silently
// serving localhost CORS / an insecure session cookie / a weak JWT secret /
// an enabled dev bypass / ephemeral media storage.
if (isProduction) {
  const problems = [];
  if (!process.env.FRONTEND_URL) {
    problems.push("FRONTEND_URL must be set explicitly in production (used for CORS).");
  }
  if (frontendUrls.some((u) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(u))) {
    problems.push("FRONTEND_URL points at localhost in a production build.");
  }
  if (env.jwtSecret.length < 32) {
    problems.push("JWT_SECRET must be at least 32 characters in production.");
  }
  if (adminDevBypassFlag === true) {
    problems.push("ADMIN_DEV_BYPASS must not be enabled in production — unset it or set it to false.");
  }
  if (cookieSecureFlag === false) {
    problems.push("COOKIE_SECURE=false is not allowed in production — the admin session cookie must be Secure.");
  }
  if (cookieSameSite === "none" && !cookieSecure) {
    problems.push("COOKIE_SAMESITE=none requires COOKIE_SECURE=true (and HTTPS).");
  }
  if (assetBaseUrl && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(assetBaseUrl)) {
    problems.push("ASSET_BASE_URL points at localhost in a production build.");
  }
  if (smtp.host && !smtp.from) {
    problems.push("SMTP_HOST is set but SMTP_FROM is missing — set a sender address or unset SMTP_HOST.");
  }
  if (!assetBaseUrl && mediaStorageAck !== "persistent-volume") {
    problems.push(
      "Media storage persistence is not asserted. Either set ASSET_BASE_URL to an object-storage / CDN " +
        "origin, or set MEDIA_STORAGE_ACK=persistent-volume to confirm backend/uploads is a persistent " +
        "mounted volume (not ephemeral container storage)."
    );
  }
  if (problems.length) {
    throw new Error("Invalid production configuration:\n  - " + problems.join("\n  - "));
  }
}

module.exports = { env };
