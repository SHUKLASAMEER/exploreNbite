const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Settings
// model) so a validation error surfaces before the database would reject
// it.
const SITE_TITLE_MAX = 150;
const LOGO_URL_MAX = 500;
const SOCIAL_URL_MAX = 300;
const CONTACT_EMAIL_MAX = 190;
const FOOTER_TEXT_MAX = 300;

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

function isValidEmail(value) {
  // Same lightweight-but-real check already used in
  // utils/validation/subscribers.js and utils/validation/comments.js.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
 * Settings is a singleton (id always 1, no create/delete) — every field is
 * always optional here since an update may only touch some of them, but
 * siteTitle/contactEmail are still validated as non-empty whenever they ARE
 * present, since the schema itself defines them as required (non-nullable)
 * columns.
 */
function parseSettingsInput(body) {
  const input = body && typeof body === "object" ? body : {};
  const result = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (has("siteTitle")) {
    const siteTitle = typeof input.siteTitle === "string" ? input.siteTitle.trim() : "";
    if (!siteTitle) {
      throw new ValidationError("Site title is required.");
    }
    if (siteTitle.length > SITE_TITLE_MAX) {
      throw new ValidationError(`Site title must be ${SITE_TITLE_MAX} characters or fewer.`);
    }
    result.siteTitle = siteTitle;
  }

  if (has("logoUrl")) {
    // Lightweight treatment (trim + max length) — same precedent as every
    // other image URL field (Book.coverImageUrl, Author.photoUrl, ...).
    const url = typeof input.logoUrl === "string" ? input.logoUrl.trim() : "";
    if (url.length > LOGO_URL_MAX) {
      throw new ValidationError(`Logo URL must be ${LOGO_URL_MAX} characters or fewer.`);
    }
    result.logoUrl = url || null;
  }

  parseSocialUrl(input.socialFacebook, "Facebook URL", has, result, "socialFacebook");
  parseSocialUrl(input.socialTwitter, "Twitter URL", has, result, "socialTwitter");
  parseSocialUrl(input.socialInstagram, "Instagram URL", has, result, "socialInstagram");

  if (has("contactEmail")) {
    const contactEmail = typeof input.contactEmail === "string" ? input.contactEmail.trim().toLowerCase() : "";
    if (!contactEmail) {
      throw new ValidationError("Contact email is required.");
    }
    if (contactEmail.length > CONTACT_EMAIL_MAX) {
      throw new ValidationError(`Contact email must be ${CONTACT_EMAIL_MAX} characters or fewer.`);
    }
    if (!isValidEmail(contactEmail)) {
      throw new ValidationError("Contact email must be a valid email address.");
    }
    result.contactEmail = contactEmail;
  }

  if (has("footerText")) {
    const footerText = typeof input.footerText === "string" ? input.footerText.trim() : "";
    if (footerText.length > FOOTER_TEXT_MAX) {
      throw new ValidationError(`Footer text must be ${FOOTER_TEXT_MAX} characters or fewer.`);
    }
    result.footerText = footerText || null;
  }

  return result;
}

module.exports = { parseSettingsInput };
