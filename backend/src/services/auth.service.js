const { prisma } = require("../config/prisma");
const { comparePassword, getDummyHash } = require("../utils/password");
const { signAdminToken } = require("../utils/jwt");
const { ValidationError } = require("../utils/errors");

// Ported from the Next.js app's app/api/admin/auth/login/route.js. Always
// runs a bcrypt compare of equivalent cost, whether or not an admin was
// found, so the response (and its timing) doesn't reveal which one failed.
async function login({ email, password }) {
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!cleanEmail || !cleanPassword) {
    throw new ValidationError("Email and password are required.");
  }

  const admin = await prisma.admin.findUnique({ where: { email: cleanEmail } });
  const passwordHash = admin?.passwordHash ?? (await getDummyHash());
  const passwordValid = await comparePassword(cleanPassword, passwordHash);

  if (!admin || !passwordValid) {
    return { ok: false };
  }

  const token = signAdminToken({ adminId: admin.id });
  return {
    ok: true,
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  };
}

module.exports = { login };
