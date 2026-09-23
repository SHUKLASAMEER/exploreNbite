// Minimal in-memory rate limiter — no new dependency.
//
// Scope & limits: this is per-process memory. It is correct and sufficient
// for a SINGLE backend instance (the current deployment shape).
//
// ⚠ HORIZONTAL SCALING: if the API ever runs as more than one instance
// behind a load balancer, each instance keeps its own counters, so a client
// effectively gets N× the limit by spreading requests across N instances.
// Before scaling out, move this to a shared store (Redis) — e.g. swap the
// `buckets` Map for `rate-limiter-flexible` + `ioredis`. Until then, keep
// the API at one instance (or use sticky sessions per client IP).
//
// The two limits are env-tunable (RATE_LIMIT_LOGIN_MAX /
// RATE_LIMIT_PUBLIC_WRITE_MAX) without a code change; defaults below are
// unchanged.
//
// Algorithm: fixed-window counter keyed by client IP (+ an optional route
// key). Windows are coarse on purpose; the goal is to stop brute-force and
// bulk-spam, not to police normal use. A cleanup sweep drops stale buckets
// so memory stays bounded.

const { env } = require("../config/env");

const buckets = new Map(); // key -> { count, resetAt }
let lastSweep = Date.now();

function sweep(now) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

function clientIp(req) {
  // trust proxy is not enabled app-wide; prefer the left-most XFF entry
  // when present (set by the platform's own proxy), else the socket addr.
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

/**
 * @param {object} opts
 * @param {number} opts.windowMs   window length in ms
 * @param {number} opts.max        allowed requests per window per client
 * @param {string} [opts.key]      namespace so different routes count separately
 * @param {string} [opts.message]  429 body message
 */
function rateLimit({ windowMs, max, key = "default", message } = {}) {
  return function rateLimiter(req, res, next) {
    const now = Date.now();
    sweep(now);

    const bucketKey = `${key}:${clientIp(req)}`;
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        error: {
          message: message || "Too many requests. Please wait a moment and try again.",
          code: "RATE_LIMITED",
        },
      });
    }
    next();
  };
}

// Presets — deliberately generous so real visitors are never blocked.
const loginRateLimit = rateLimit({
  key: "login",
  windowMs: 15 * 60_000,
  max: env.rateLimit.loginMax,
  message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
});

const publicWriteRateLimit = rateLimit({
  key: "public-write",
  windowMs: 10 * 60_000,
  max: env.rateLimit.publicWriteMax,
  message: "You're doing that too often. Please wait a few minutes and try again.",
});

// AI SEO Suggestions — admin-only, but generation is potentially expensive
// once a real provider is wired, and rapid clicking must not spam it. Fixed
// (not env-tunable) since this isn't a public-facing limit to tune per
// deployment; bump the constant directly if it's ever too tight.
const aiSeoRateLimit = rateLimit({
  key: "ai-seo",
  windowMs: 60_000,
  max: 5,
  message: "Too many AI suggestion requests. Please wait a minute and try again.",
});

module.exports = { rateLimit, loginRateLimit, publicWriteRateLimit, aiSeoRateLimit };
