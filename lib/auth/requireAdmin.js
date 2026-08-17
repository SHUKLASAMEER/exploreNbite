import { prisma } from "@/lib/prisma/client";
import { verifyAdminToken } from "./jwt";
import { getSessionToken } from "./session";
import { UnauthorizedError } from "@/lib/api/errors";

// Shared "who is calling this API route" check for app/api/admin/** route
// handlers. proxy.js already blocks unauthenticated requests to /api/admin/*
// before they reach here — this is the defense-in-depth re-check each route
// does on its own (same three steps app/api/admin/auth/me/route.js already
// performs inline), pulled out so new admin modules don't re-implement it.
// Throws UnauthorizedError (see lib/api/errors.js), which handleApiError
// already maps to a 401 JSON response.
export async function requireAdmin() {
  const token = await getSessionToken();
  const payload = token ? verifyAdminToken(token) : null;

  if (!payload?.adminId) {
    throw new UnauthorizedError();
  }

  const admin = await prisma.admin.findUnique({
    where: { id: payload.adminId },
    select: { id: true, name: true, email: true },
  });

  if (!admin) {
    throw new UnauthorizedError();
  }

  return admin;
}
