const { prisma } = require("../config/prisma");
const { verifyAdminToken } = require("../utils/jwt");

const SESSION_COOKIE_NAME = "admin_session";

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
