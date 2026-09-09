const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Award
// model) so a validation error surfaces before the database would reject
// it.
const TITLE_MAX = 200;
const IMAGE_URL_MAX = 500;
const SOURCE_LINK_MAX = 500;

// Keep in sync with enum AwardBadgeSlot in prisma/schema.prisma. The public
// sidebar selects its badges by this value (see Sidebar.js) instead of
// matching award titles / links.
const BADGE_SLOTS = ["none", "award_photo", "tripoto", "indiblogger"];

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

function parseAwardInput(body, mode) {
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

  if (has("imageUrl")) {
    // Lightweight treatment (trim + max length only) — same as
    // Post.featuredImageUrl / Book.coverImageUrl. sourceLink below gets the
    // stricter check since it's a real outbound link, not just an image.
    const url = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
    if (url.length > IMAGE_URL_MAX) {
      throw new ValidationError(`Image URL must be ${IMAGE_URL_MAX} characters or fewer.`);
    }
    result.imageUrl = url || null;
  }

  if (has("sourceLink")) {
    const raw = typeof input.sourceLink === "string" ? input.sourceLink.trim() : "";
    if (!raw) {
      result.sourceLink = null;
    } else {
      if (raw.length > SOURCE_LINK_MAX) {
        throw new ValidationError(`Source link must be ${SOURCE_LINK_MAX} characters or fewer.`);
      }
      if (!isValidUrl(raw)) {
        throw new ValidationError("Source link must be a valid URL.");
      }
      result.sourceLink = raw;
    }
  }

  if (has("badgeSlot")) {
    const raw = typeof input.badgeSlot === "string" ? input.badgeSlot.trim() : "";
    const slot = raw || "none";
    if (!BADGE_SLOTS.includes(slot)) {
      throw new ValidationError(`Badge slot must be one of: ${BADGE_SLOTS.join(", ")}.`);
    }
    result.badgeSlot = slot;
  }

  if (has("dateReceived")) {
    // Award.dateReceived is `@db.Date` (date only, no time component).
    const raw = input.dateReceived;
    if (raw === null || raw === "") {
      result.dateReceived = null;
    } else {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        throw new ValidationError("Date received is invalid.");
      }
      result.dateReceived = date;
    }
  }

  return result;
}

// award_photo / tripoto / indiblogger are single-occupant sidebar slots;
// `none` is unrestricted. MySQL can't express a partial unique index, so the
// service enforces this (see award.service.js).
const EXCLUSIVE_BADGE_SLOTS = ["award_photo", "tripoto", "indiblogger"];

module.exports = { parseAwardInput, EXCLUSIVE_BADGE_SLOTS };
