const { ValidationError } = require("../errors");
const { slugify } = require("../slugify");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Category
// model) so a validation error surfaces before the database would reject
// it.
const NAME_MAX = 100;
const SLUG_MAX = 120;
const DESCRIPTION_MAX = 500;

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

/**
 * Parses + validates category input from a request body.
 * mode "create": name and slug are required (slug auto-generated from name
 *   if not supplied); description/order are optional.
 * mode "update": every field is optional, but whichever fields ARE present
 *   are validated the same way as on create.
 */
function parseCategoryInput(body, mode) {
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

  if (mode === "create" || has("slug")) {
    const explicitSlug = typeof input.slug === "string" ? input.slug.trim() : "";
    const slug = slugify(explicitSlug || result.name);
    if (!slug) {
      throw new ValidationError("Could not derive a valid slug — please provide one manually.");
    }
    if (slug.length > SLUG_MAX) {
      throw new ValidationError(`Slug must be ${SLUG_MAX} characters or fewer.`);
    }
    result.slug = slug;
  }

  if (mode === "create" || has("description")) {
    const description = typeof input.description === "string" ? input.description.trim() : "";
    if (description.length > DESCRIPTION_MAX) {
      throw new ValidationError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
    }
    result.description = description || null;
  }

  if (has("sortOrder") || has("order")) {
    const sortOrder = normalizeSortOrder(input.sortOrder ?? input.order);
    if (sortOrder !== undefined) {
      result.sortOrder = sortOrder;
    }
  }

  return result;
}

module.exports = { parseCategoryInput };
