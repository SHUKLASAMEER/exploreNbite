// Ported from the Next.js app's lib/auth/session.js. Converts a
// jsonwebtoken `expiresIn` string ("7d", "12h", "30m", "45s") or a bare
// number of seconds into a cookie maxAge (seconds), so the cookie's
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

module.exports = { expiresInToMaxAgeSeconds };
