const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limits (prisma/schema.prisma, MenuItem
// model) so a validation error surfaces before the database would reject
// it. Existence of pageId/categoryId in their own tables is NOT checked
// here — this module only validates shape; the DB round-trip lives in
// menuItem.service.js, same split used everywhere else (e.g. category slug
// uniqueness is checked in category.service.js, not categories.js).
const LABEL_MAX = 80;
const CUSTOM_URL_MAX = 500;
const LINK_TYPES = ["page", "category", "custom_url"];

function normalizeSortOrder(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return undefined;
  }
  const num = Number(rawValue);
  if (!Number.isInteger(num)) {
    throw new ValidationError("Order must be a whole number.");
  }
  if (num < 0 || num > 100000) {
    throw new ValidationError("Order must be between 0 and 100000.");
  }
  return num;
}

function isValidUrl(value) {
  // Accept either a fully-qualified URL (external link) OR a root-relative
  // in-site path like "/books" (an internal destination that has no Page or
  // Category row to point a page/category menu item at). A root-relative
  // value keeps the nav working regardless of the deployed domain, so no
  // "http://localhost:3000/…" ever gets persisted here.
  if (/^\/(?!\/)/.test(value)) {
    return !/\s/.test(value);
  }
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host && /^https?:$/.test(parsed.protocol));
  } catch {
    return false;
  }
}

function normalizeRefId(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;
  const id = Number(rawValue);
  if (!Number.isInteger(id) || id <= 0) return NaN; // signals "present but invalid"
  return id;
}

/**
 * Parses + validates menu item input from a request body.
 *
 * mode "create": label and linkType (plus the one matching target field)
 *   are required.
 * mode "update": label/sortOrder may be changed independently. Changing the
 *   *link target* (linkType, pageId, categoryId, customUrl) is only allowed
 *   as a complete, self-consistent group — if any target field is present,
 *   linkType must be present too, and is re-validated the same way as on
 *   create. This avoids ever landing on a half-updated, ambiguous target
 *   (e.g. a row with both a pageId and a categoryId).
 */
function parseMenuItemInput(body, mode) {
  const input = body && typeof body === "object" ? body : {};
  const result = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (mode === "create" || has("label")) {
    const label = typeof input.label === "string" ? input.label.trim() : "";
    if (!label) {
      throw new ValidationError("Label is required.");
    }
    if (label.length > LABEL_MAX) {
      throw new ValidationError(`Label must be ${LABEL_MAX} characters or fewer.`);
    }
    result.label = label;
  }

  const touchesTarget = has("linkType") || has("pageId") || has("categoryId") || has("customUrl");

  if (mode === "create" || touchesTarget) {
    if (!has("linkType")) {
      throw new ValidationError(
        "linkType is required when setting or changing a menu item's link target."
      );
    }

    const linkType = input.linkType;
    if (!LINK_TYPES.includes(linkType)) {
      throw new ValidationError(`Link type must be one of: ${LINK_TYPES.join(", ")}.`);
    }

    const pageId = normalizeRefId(input.pageId);
    const categoryId = normalizeRefId(input.categoryId);
    const customUrlRaw = typeof input.customUrl === "string" ? input.customUrl.trim() : "";

    if (pageId !== null && Number.isNaN(pageId)) {
      throw new ValidationError("pageId must be a positive integer.");
    }
    if (categoryId !== null && Number.isNaN(categoryId)) {
      throw new ValidationError("categoryId must be a positive integer.");
    }

    if (linkType === "page") {
      if (pageId === null) {
        throw new ValidationError("Select a page for a page link.");
      }
      if (categoryId !== null || customUrlRaw) {
        throw new ValidationError("A page link can't also specify a category or custom URL.");
      }
      result.linkType = "page";
      result.pageId = pageId;
      result.categoryId = null;
      result.customUrl = null;
    } else if (linkType === "category") {
      if (categoryId === null) {
        throw new ValidationError("Select a category for a category link.");
      }
      if (pageId !== null || customUrlRaw) {
        throw new ValidationError("A category link can't also specify a page or custom URL.");
      }
      result.linkType = "category";
      result.categoryId = categoryId;
      result.pageId = null;
      result.customUrl = null;
    } else {
      if (!customUrlRaw) {
        throw new ValidationError("Enter a URL for a custom URL link.");
      }
      if (customUrlRaw.length > CUSTOM_URL_MAX) {
        throw new ValidationError(`Custom URL must be ${CUSTOM_URL_MAX} characters or fewer.`);
      }
      if (!isValidUrl(customUrlRaw)) {
        throw new ValidationError(
          "Custom URL must be a full https:// URL (e.g. https://example.com/page) or a root-relative path (e.g. /books)."
        );
      }
      if (pageId !== null || categoryId !== null) {
        throw new ValidationError("A custom URL link can't also specify a page or category.");
      }
      result.linkType = "custom_url";
      result.customUrl = customUrlRaw;
      result.pageId = null;
      result.categoryId = null;
    }
  }

  if (has("sortOrder") || has("order")) {
    const sortOrder = normalizeSortOrder(input.sortOrder ?? input.order);
    if (sortOrder !== undefined) {
      result.sortOrder = sortOrder;
    }
  }

  return result;
}

module.exports = { parseMenuItemInput, LINK_TYPES };
