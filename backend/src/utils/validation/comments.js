const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Comment
// model) so a validation error surfaces before the database would reject
// it.
const READER_NAME_MAX = 120;
const EMAIL_MAX = 190;
// Comment.message is `@db.Text` — generous cap for a reader comment,
// matching the same "sanity limit, not the column's real max" approach
// already used for Book.description.
const MESSAGE_MAX = 5000;

function isValidEmail(value) {
  // A simple, standard-enough check — not a full RFC 5322 validator, same
  // lightweight-but-real precedent as the URL checks in
  // utils/validation/{books,awards}.js. Just enough to catch obviously
  // wrong input, not to be a spam filter.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Validates a public comment submission into a clean
 * { readerName, email, message } object. Deliberately only ever reads
 * these three keys off the request body — id, postId, status, createdAt,
 * or anything else the client sends is silently ignored, not merely
 * rejected. This is what makes it impossible for a public request to set
 * its own moderation status or any other field: there is no code path that
 * would ever read `body.status`.
 */
function parsePublicCommentInput(body) {
  const input = body && typeof body === "object" ? body : {};

  const readerName = typeof input.readerName === "string" ? input.readerName.trim() : "";
  if (!readerName) {
    throw new ValidationError("Name is required.");
  }
  if (readerName.length > READER_NAME_MAX) {
    throw new ValidationError(`Name must be ${READER_NAME_MAX} characters or fewer.`);
  }

  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (!email) {
    throw new ValidationError("Email is required.");
  }
  if (email.length > EMAIL_MAX) {
    throw new ValidationError(`Email must be ${EMAIL_MAX} characters or fewer.`);
  }
  if (!isValidEmail(email)) {
    throw new ValidationError("Email must be a valid email address.");
  }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message) {
    throw new ValidationError("Message is required.");
  }
  if (message.length > MESSAGE_MAX) {
    throw new ValidationError(`Message must be ${MESSAGE_MAX} characters or fewer.`);
  }

  return { readerName, email, message };
}

module.exports = { parsePublicCommentInput };
