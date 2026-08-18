const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Book and
// BookBuyLink models) so a validation error surfaces before the database
// would reject it.
const TITLE_MAX = 200;
const COVER_IMAGE_URL_MAX = 500;
// Book.description is `@db.Text` (not `@db.LongText` like Post.content) —
// a plain field, not one sized for full rich-text articles.
const DESCRIPTION_MAX = 5000;
const PLATFORM_NAME_MAX = 80;
const BUY_LINK_URL_MAX = 500;
// MySQL's YEAR(4) column (Book.publishedYear @db.Year) only ever stores
// 1901–2155 — the database's own real constraint, not an arbitrary
// app-level cutoff.
const MIN_YEAR = 1901;
const MAX_YEAR = 2155;

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

function parseBookInput(body, mode) {
  const input = body && typeof body === "object" ? body : {};
  const result = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (mode === "create" || has("title")) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) {
      throw new ValidationError("Title is required.");
    }
    if (title.length > TITLE_MAX) {
      throw new ValidationError(`Title must be ${TITLE_MAX} characters or fewer.`);
    }
    result.title = title;
  }

  if (mode === "create" || has("description")) {
    const description = typeof input.description === "string" ? input.description.trim() : "";
    if (!description) {
      throw new ValidationError("Description is required.");
    }
    if (description.length > DESCRIPTION_MAX) {
      throw new ValidationError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
    }
    result.description = description;
  }

  if (has("coverImageUrl")) {
    // Lightweight treatment (trim + max length, no strict parsing) — same
    // precedent as Post.featuredImageUrl. The stricter "must actually parse
    // as a URL" check is reserved for buy links below.
    const url = typeof input.coverImageUrl === "string" ? input.coverImageUrl.trim() : "";
    if (url.length > COVER_IMAGE_URL_MAX) {
      throw new ValidationError(`Cover image URL must be ${COVER_IMAGE_URL_MAX} characters or fewer.`);
    }
    result.coverImageUrl = url || null;
  }

  if (has("publishedYear")) {
    const raw = input.publishedYear;
    if (raw === null || raw === "") {
      result.publishedYear = null;
    } else {
      const year = Number(raw);
      if (!Number.isInteger(year)) {
        throw new ValidationError("Published year must be a whole number.");
      }
      if (year < MIN_YEAR || year > MAX_YEAR) {
        throw new ValidationError(`Published year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
      }
      result.publishedYear = year;
    }
  }

  return result;
}

/**
 * Validates + normalizes the `buyLinks` array from a request body into a
 * clean list of { platformName, url, sortOrder } ready to persist. Returns
 * undefined if `buyLinks` wasn't present in the body at all.
 */
function parseBuyLinks(rawBuyLinks) {
  if (rawBuyLinks === undefined) return undefined;
  if (!Array.isArray(rawBuyLinks)) {
    throw new ValidationError("Buy links must be an array.");
  }

  return rawBuyLinks.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new ValidationError(`Buy link at position ${index + 1} is malformed.`);
    }

    const platformName = typeof raw.platformName === "string" ? raw.platformName.trim() : "";
    if (!platformName) {
      throw new ValidationError(`Buy link at position ${index + 1} is missing a platform name.`);
    }
    if (platformName.length > PLATFORM_NAME_MAX) {
      throw new ValidationError(`Platform name must be ${PLATFORM_NAME_MAX} characters or fewer.`);
    }

    const url = typeof raw.url === "string" ? raw.url.trim() : "";
    if (!url) {
      throw new ValidationError(`Buy link "${platformName}" is missing a URL.`);
    }
    if (url.length > BUY_LINK_URL_MAX) {
      throw new ValidationError(`Buy link URL must be ${BUY_LINK_URL_MAX} characters or fewer.`);
    }
    if (!isValidUrl(url)) {
      throw new ValidationError(`Buy link "${platformName}" has an invalid URL.`);
    }

    const sortOrder = raw.sortOrder === undefined || raw.sortOrder === null ? index : Number(raw.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw new ValidationError(`Buy link "${platformName}" has an invalid order value.`);
    }

    return { platformName, url, sortOrder };
  });
}

module.exports = { parseBookInput, parseBuyLinks };
