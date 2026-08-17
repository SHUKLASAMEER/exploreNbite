import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
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

  return NextResponse.json(body, { status: database === "connected" ? 200 : 503 });
}
