import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { comparePassword, getDummyHash } from "@/lib/auth/password";
import { signAdminToken } from "@/lib/auth/jwt";
import { createSessionCookie } from "@/lib/auth/session";
import { ValidationError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      throw new ValidationError("Email and password are required.");
    }

    const admin = await prisma.admin.findUnique({ where: { email } });

    // Always run a bcrypt compare of equivalent cost, whether or not an
    // admin was found, so the response doesn't reveal which one failed.
    const passwordHash = admin?.passwordHash ?? (await getDummyHash());
    const passwordValid = await comparePassword(password, passwordHash);

    if (!admin || !passwordValid) {
      return NextResponse.json(
        { error: { message: "Invalid email or password.", code: "INVALID_CREDENTIALS" } },
        { status: 401 }
      );
    }

    const token = signAdminToken({ adminId: admin.id });
    await createSessionCookie(token);

    // Token only ever goes out as an httpOnly cookie — never in this body.
    return NextResponse.json({
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
