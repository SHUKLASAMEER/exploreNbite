const { prisma } = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");

// Ported from the Next.js app's app/api/health/route.js — same response
// shape, same DB connectivity check.
const check = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  let database = "unreachable";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (err) {
    database = "unreachable";
    // Log the real reason server-side only — the DB error message can
    // contain the connection string / internal host names, so it must not
    // go out in the response body of an unauthenticated endpoint.
    console.error("Health check: database unreachable:", err instanceof Error ? err.message : err);
  }

  const body = {
    status: database === "connected" ? "ok" : "degraded",
    api: "running",
    database,
    responseTimeMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };

  res.status(database === "connected" ? 200 : 503).json(body);
});

module.exports = { check };
