const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limit (prisma/schema.prisma,
// Subscriber model) so a validation error surfaces before the database
// would reject it.
const EMAIL_MAX = 190;

function isValidEmail(value) {
  // Same lightweight-but-real check already used in
  // utils/validation/comments.js — not a full RFC 5322 validator, just
  // enough to catch obviously wrong input.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Validates a public subscribe submission into a clean { email } object.
 * Deliberately only ever reads `email` off the request body — id, status,
 * subscribedAt, or anything else the client sends is silently ignored, not
 * merely rejected. The service always creates with the schema's own
 * defaults (status: "active", subscribedAt: now()), so there is no code
 * path a client could use to set anything else.
 */
function parseSubscriberInput(body) {
  const input = body && typeof body === "object" ? body : {};

  const rawEmail = typeof input.email === "string" ? input.email : "";
  // Trim + lowercase so "JohnDoe@Example.com" and "johndoe@example.com"
  // are recognized as the same subscriber for duplicate detection, not
  // just visually similar.
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    throw new ValidationError("Email is required.");
  }
  if (email.length > EMAIL_MAX) {
    throw new ValidationError(`Email must be ${EMAIL_MAX} characters or fewer.`);
  }
  if (!isValidEmail(email)) {
    throw new ValidationError("Email must be a valid email address.");
  }

  return { email };
}

module.exports = { parseSubscriberInput };
