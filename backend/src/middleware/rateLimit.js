// Minimal in-memory rate limiter — no new dependency.
//
// Scope & limits: this is per-process memory. It is correct and sufficient
// for a single backend instance (the current deployment shape). If the API
// is ever scaled to multiple instances behind a load balancer, this needs
// to move to a shared store (Redis) so a client can't get N× the limit by
// hitting N instances — that is a deployment decision, noted in the audit.
//
// Algorithm: fixed-window counter keyed by client IP (+ an optional route
// key). Windows are coarse on purpose; the goal is to stop brute-force and
// bulk-spam, not to police normal use. A cleanup sweep drops stale buckets
// so memory stays bounded.

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
  max: 10,
  message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
});

const publicWriteRateLimit = rateLimit({
  key: "public-write",
  windowMs: 10 * 60_000,
  max: 20,
  message: "You're doing that too often. Please wait a few minutes and try again.",
});

module.exports = { rateLimit, loginRateLimit, publicWriteRateLimit };
