const { env } = require("../config/env");
const { asyncHandler } = require("../utils/asyncHandler");
const { expiresInToMaxAgeSeconds } = require("../utils/cookie");
const { SESSION_COOKIE_NAME } = require("../middleware/requireAdmin");
const authService = require("../services/auth.service");

// httpOnly is always on; sameSite / secure / domain come from config
// (env.cookie) so a cross-site deployment can switch to SameSite=None;
// Secure without a code change. Defaults are unchanged from before
// (SameSite=Lax, Secure only in production).
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  domain: env.cookie.domain,
  path: "/",
};

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body ?? {});

  if (!result.ok) {
    return res
      .status(401)
      .json({ error: { message: "Invalid email or password.", code: "INVALID_CREDENTIALS" } });
  }

  // Token only ever goes out as an httpOnly cookie — never in this body.
  res.cookie(SESSION_COOKIE_NAME, result.token, {
    ...COOKIE_OPTIONS,
    maxAge: expiresInToMaxAgeSeconds(env.jwtExpiresIn) * 1000, // Express wants milliseconds
  });
  res.json({ admin: result.admin });
});

// Always succeeds, even if the cookie is already missing/expired/invalid —
// clearing a cookie that isn't there is a no-op, not an error. Reachable
// without a valid session on purpose (see routes/auth.routes.js), so a
// client with a stale/expired token can still reliably clear it.
const logout = asyncHandler(async (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: "/",
    domain: env.cookie.domain,
    sameSite: env.cookie.sameSite,
    secure: env.cookie.secure,
  });
  res.json({ success: true });
});

// requireAdmin middleware already resolved + attached req.admin before this
// runs (see routes/auth.routes.js) — nothing else to do here.
const me = asyncHandler(async (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = { login, logout, me };
