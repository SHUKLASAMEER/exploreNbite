const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

// Ported from the Next.js app's lib/auth/jwt.js — same contract, generic
// JWT helpers not tied to any specific route.

function signAdminToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyAdminToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

module.exports = { signAdminToken, verifyAdminToken };
