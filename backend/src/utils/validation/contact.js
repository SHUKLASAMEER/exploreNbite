const { ValidationError } = require("../errors");

// Column limits mirror prisma/schema.prisma (ContactMessage) so a bad
// submission is rejected before the database would reject it.
const NAME_MAX = 120;
const EMAIL_MAX = 190;
const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;

const TOPICS = ["contact", "work_with_me"];

function isValidEmail(value) {
  // Same lightweight check used across the project (comments, subscribers).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Validates a public enquiry submission into a clean
 * { topic, name, email, subject, message } object. Only these keys are ever
 * read off the body — `handled`, `id`, `createdAt`, etc. are ignored, so a
 * public request can't set the admin "handled" flag or any other field.
 * The honeypot field is stripped earlier by utils/antiSpam.js.
 */
function parseContactMessageInput(body) {
  const input = body && typeof body === "object" ? body : {};

  const topic = TOPICS.includes(input.topic) ? input.topic : "contact";

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw new ValidationError("Name is required.");
  if (name.length > NAME_MAX) throw new ValidationError(`Name must be ${NAME_MAX} characters or fewer.`);

  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (!email) throw new ValidationError("Email is required.");
  if (email.length > EMAIL_MAX) throw new ValidationError(`Email must be ${EMAIL_MAX} characters or fewer.`);
  if (!isValidEmail(email)) throw new ValidationError("Email must be a valid email address.");

  let subject = typeof input.subject === "string" ? input.subject.trim() : "";
  if (subject.length > SUBJECT_MAX) throw new ValidationError(`Subject must be ${SUBJECT_MAX} characters or fewer.`);
  subject = subject || null;

  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message) throw new ValidationError("Message is required.");
  if (message.length > MESSAGE_MAX) throw new ValidationError(`Message must be ${MESSAGE_MAX} characters or fewer.`);

  return { topic, name, email, subject, message };
}

module.exports = { parseContactMessageInput, TOPICS };
