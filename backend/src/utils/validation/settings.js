const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Settings
// model) so a validation error surfaces before the database would reject
// it.
const SITE_TITLE_MAX = 150;
const TAGLINE_MAX = 200;
const LOGO_URL_MAX = 500;
const IMAGE_URL_MAX = 500;
const SOCIAL_URL_MAX = 300;
const CONTACT_EMAIL_MAX = 190;
const FOOTER_TEXT_MAX = 300;
const META_DESCRIPTION_MAX = 300;

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

// An image URL may be an uploaded-media URL (http/https) or a root-relative
// path like "/uploads/logo.png" — never javascript:/data:/other schemes.
// Same rule shape as utils/validation/menuItems.js's custom-URL check, so the
// public site only ever renders a safe <img src> / CSS background url().
function isValidLogoUrl(value) {
  if (/^\/(?!\/)/.test(value)) {
    return !/\s/.test(value);
  }
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isValidEmail(value) {
  // Same lightweight-but-real check already used in
  // utils/validation/subscribers.js and utils/validation/comments.js.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseOptionalText(raw, label, max, has, result, key) {
  if (!has(key)) return;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > max) {
    throw new ValidationError(`${label} must be ${max} characters or fewer.`);
  }
  result[key] = value || null;
}

function parseOptionalImageUrl(raw, label, has, result, key) {
  if (!has(key)) return;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > IMAGE_URL_MAX) {
    throw new ValidationError(`${label} must be ${IMAGE_URL_MAX} characters or fewer.`);
  }
  if (value && !isValidLogoUrl(value)) {
    throw new ValidationError(
      `${label} must be a full http(s):// URL or a root-relative path (e.g. /uploads/hero.jpg).`
    );
  }
  result[key] = value || null;
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

  // Optional plain-text fields — empty clears them (the public site falls
  // back to a bundled default), a value is length-capped to match the schema.
  parseOptionalText(input.tagline, "Tagline", TAGLINE_MAX, has, result, "tagline");
  parseOptionalText(input.metaDescription, "Meta description", META_DESCRIPTION_MAX, has, result, "metaDescription");

  // Optional image URL fields — same safe-URL rule as the logo (http(s) or
  // root-relative path), rendered as a CSS background / <meta og:image>.
  parseOptionalImageUrl(input.heroImageUrl, "Hero image URL", has, result, "heroImageUrl");
  parseOptionalImageUrl(input.defaultOgImageUrl, "Default OG image URL", has, result, "defaultOgImageUrl");

  if (has("logoUrl")) {
    const url = typeof input.logoUrl === "string" ? input.logoUrl.trim() : "";
    if (url.length > LOGO_URL_MAX) {
      throw new ValidationError(`Logo URL must be ${LOGO_URL_MAX} characters or fewer.`);
    }
    // Empty is fine (header falls back to the bundled logo asset); a
    // non-empty value must be a safe http(s) URL or root-relative path,
    // since the public header renders it as an <img src>.
    if (url && !isValidLogoUrl(url)) {
      throw new ValidationError(
        "Logo URL must be a full http(s):// URL or a root-relative path (e.g. /uploads/logo.png)."
      );
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
