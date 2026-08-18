const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Author
// model) so a validation error surfaces before the database would reject
// it.
const NAME_MAX = 120;
// Author.bio is `@db.Text` — not sized for full articles, but not a short
// field either. Same app-level cap already used for Book.description.
const BIO_MAX = 5000;
const PHOTO_URL_MAX = 500;
const SOCIAL_URL_MAX = 300;

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

function parseSocialUrl(raw, label, has, result, key) {
  if (!has(key)) return;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    result[key] = null;
    return;
  }
  if (value.length > SOCIAL_URL_MAX) {
    throw new ValidationError(`${label} must be ${SOCIAL_URL_MAX} characters or fewer.`);
  }
  if (!isValidUrl(value)) {
    throw new ValidationError(`${label} must be a valid URL.`);
  }
  result[key] = value;
}

/**
 * Parses + validates author input from a request body.
 * mode "create": name is required; everything else optional.
 * mode "update": every field is optional, but whichever fields ARE present
 *   are validated the same way as on create.
 */
function parseAuthorInput(body, mode) {
  const input = body && typeof body === "object" ? body : {};
  const result = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (mode === "create" || has("name")) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) {
      throw new ValidationError("Name is required.");
    }
    if (name.length > NAME_MAX) {
      throw new ValidationError(`Name must be ${NAME_MAX} characters or fewer.`);
    }
    result.name = name;
  }

  if (has("bio")) {
    const bio = typeof input.bio === "string" ? input.bio.trim() : "";
    if (bio.length > BIO_MAX) {
      throw new ValidationError(`Bio must be ${BIO_MAX} characters or fewer.`);
    }
    result.bio = bio || null;
  }

  if (has("photoUrl")) {
    // Lightweight treatment (trim + max length, no strict parsing) — same
    // precedent as Book.coverImageUrl / Post.featuredImageUrl.
    const url = typeof input.photoUrl === "string" ? input.photoUrl.trim() : "";
    if (url.length > PHOTO_URL_MAX) {
      throw new ValidationError(`Photo URL must be ${PHOTO_URL_MAX} characters or fewer.`);
    }
    result.photoUrl = url || null;
  }

  // Real outbound links, not just image sources — same stricter check as
  // Award.sourceLink / Book buy link URLs.
  parseSocialUrl(input.facebookUrl, "Facebook URL", has, result, "facebookUrl");
  parseSocialUrl(input.twitterUrl, "Twitter URL", has, result, "twitterUrl");
  parseSocialUrl(input.instagramUrl, "Instagram URL", has, result, "instagramUrl");

  return result;
}

module.exports = { parseAuthorInput };
