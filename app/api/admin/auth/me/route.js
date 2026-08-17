import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { verifyAdminToken } from "@/lib/auth/jwt";
import { getSessionToken } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api/response";

function unauthorized() {
  return NextResponse.json(
    { error: { message: "Authentication required.", code: "UNAUTHORIZED" } },
    { status: 401 }
  );
}

export async function GET() {
  try {
    const token = await getSessionToken();
    const payload = token ? verifyAdminToken(token) : null;

    if (!payload?.adminId) {
      return unauthorized();
    }

    // Explicit select — passwordHash is never fetched, so it can never
    // accidentally leak into this response.
    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!admin) {
      return unauthorized();
    }

    return NextResponse.json({ admin });
  } catch (err) {
    return handleApiError(err);
  }
}
