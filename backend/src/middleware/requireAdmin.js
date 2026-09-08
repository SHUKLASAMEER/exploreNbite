const { prisma } = require("../config/prisma");
const { verifyAdminToken } = require("../utils/jwt");
const { env } = require("../config/env");

const SESSION_COOKIE_NAME = "admin_session";

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY LOCAL DEVELOPMENT ADMIN BYPASS
// REMOVE/DISABLE BEFORE PRODUCTION
//
// While the API runs in local development, an admin request that has NO valid
// session is allowed through as the first admin in the database, so the admin
// panel can be browsed on http://localhost:3000/admin without logging in.
//
// This never touches the real auth path:
//   • a valid `admin_session` cookie is still verified normally and always wins;
//   • the bypass only rescues the "no valid session" branch below.
//
// It activates ONLY when BOTH are true:
//   1. env.nodeEnv === "development"  (never "production", never "test"), and
//   2. the request's Host header is a localhost address.
// `trust proxy` is not enabled app-wide (see middleware/rateLimit.js), so
// req.hostname is the literal Host header — in a real deployment that is the
// public domain, so condition 2 fails there even if NODE_ENV were mis-set.
//
// Escape hatch without deleting this code: set ADMIN_DEV_BYPASS=off in
// backend/.env.
// ─────────────────────────────────────────────────────────────────────────────
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLocalDevAdminBypass(req) {
  if (env.nodeEnv !== "development") return false;
  if (process.env.ADMIN_DEV_BYPASS === "off") return false;
  const host = String(req.hostname || "").toLowerCase();
  return LOCALHOST_HOSTS.has(host);
}

// Express equivalent of the Next.js app's lib/auth/requireAdmin.js +
// proxy.js combined: reads the session cookie, verifies the JWT, confirms
// the admin still exists, and attaches it to req.admin. Mounted at the
// router level for every protected module (see routes/index.js), so a new
// module inherits protection just by being registered there — the same
// "protected by default" guarantee proxy.js gave the old single-app setup.
async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    const payload = token ? verifyAdminToken(token) : null;

    if (!payload?.adminId) {
      // TEMPORARY LOCAL DEVELOPMENT ADMIN BYPASS — REMOVE/DISABLE BEFORE
      // PRODUCTION. See the note above isLocalDevAdminBypass(). Only reached
      // when there is no valid session, and only passes in local dev on a
      // localhost Host. Production / non-localhost falls straight through to
      // the 401 below, exactly as before.
      if (isLocalDevAdminBypass(req)) {
        const devAdmin = await prisma.admin.findFirst({
          orderBy: { id: "asc" },
          select: { id: true, name: true, email: true, createdAt: true },
        });
        if (devAdmin) {
          req.admin = devAdmin;
          console.warn(
            `[requireAdmin] LOCAL DEV BYPASS — allowing ${req.method} ${req.originalUrl} as ${devAdmin.email} with no session`
          );
          return next();
        }
      }
      return res.status(401).json({ error: { message: "Authentication required.", code: "UNAUTHORIZED" } });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!admin) {
      return res.status(401).json({ error: { message: "Authentication required.", code: "UNAUTHORIZED" } });
    }

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin, SESSION_COOKIE_NAME };
