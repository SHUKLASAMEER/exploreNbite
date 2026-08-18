const { prisma } = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");

// Ported from the Next.js app's app/api/health/route.js — same response
// shape, same DB connectivity check.
const check = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  let database = "unreachable";
  let databaseError;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (err) {
    database = "unreachable";
    databaseError = err instanceof Error ? err.message : "Unknown database error";
  }

  const body = {
    status: database === "connected" ? "ok" : "degraded",
    api: "running",
    database,
    ...(databaseError ? { databaseError } : {}),
    responseTimeMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };

  res.status(database === "connected" ? 200 : 503).json(body);
});

module.exports = { check };
