const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limit (prisma/schema.prisma, Media
// model).
const ALT_TEXT_MAX = 255;

// The only editable metadata on this model is altText — fileUrl/fileName
// reflect the actual on-disk file and are never client-editable (renaming
// them here wouldn't rename the real file, which would desync the record
// from reality). File validation itself (MIME type, size) happens in
// middleware/upload.js, at the point where the raw upload is available.
function parseMediaUpdateInput(body) {
  const input = body && typeof body === "object" ? body : {};
  const result = {};

  if (Object.prototype.hasOwnProperty.call(input, "altText")) {
    const altText = typeof input.altText === "string" ? input.altText.trim() : "";
    if (altText.length > ALT_TEXT_MAX) {
      throw new ValidationError(`Alt text must be ${ALT_TEXT_MAX} characters or fewer.`);
    }
    result.altText = altText || null;
  }

  return result;
}

module.exports = { parseMediaUpdateInput };
