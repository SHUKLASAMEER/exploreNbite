import { Router } from "express";
import { prisma } from "../../config/prisma";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const startedAt = Date.now();
  let database: "connected" | "unreachable" = "unreachable";
  let databaseError: string | undefined;

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
