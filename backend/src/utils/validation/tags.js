const { ValidationError } = require("../errors");
const { slugify } = require("../slugify");
const { parseTagName } = require("./posts");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Tag
// model: name VarChar(80), slug VarChar(100)).
const NAME_MAX = 80;
const SLUG_MAX = 100;

// Normalises + validates admin Tag-manager input.
//
//   mode "create": `name` is required. The slug is the explicit `slug` if
//     given (normalised), otherwise derived from the name.
//
//   mode "update": every field is optional. The returned `slugMode` tells
//     the service how to treat the slug so a plain rename never disturbs it:
//       - "keep"     — no `slug` key in the body: leave the existing slug.
//       - "derive"   — `slug` present but blank: regenerate from the name.
//       - "explicit" — `slug` present and non-blank: use `slug` (validated).
//
// Name normalisation (trim, collapse internal whitespace, 80-char cap,
// slug-able check) is delegated to parseTagName so the manager, the
// post-editor "create tag" endpoint and post-save tag resolution all apply
// the exact same rules.
function parseTagInput(body, mode) {
  const input = body && typeof body === "object" ? body : {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);
  const result = {};

  if (mode === "create" || has("name")) {
    const parsed = parseTagName(typeof input.name === "string" ? input.name : "");
    if (!parsed) {
      throw new ValidationError("A tag name with at least one letter or number is required.");
    }
    result.name = parsed.name;
    result._derivedSlug = parsed.slug;
  }

  if (has("slug")) {
    const raw = typeof input.slug === "string" ? input.slug.trim() : "";
    if (raw === "") {
      result.slugMode = "derive";
    } else {
      const slug = slugify(raw);
      if (!slug) {
        throw new ValidationError("Slug must contain at least one letter or number.");
      }
      if (slug.length > SLUG_MAX) {
        throw new ValidationError(`Slug must be ${SLUG_MAX} characters or fewer.`);
      }
      result.slugMode = "explicit";
      result.slug = slug;
    }
  } else {
    result.slugMode = "keep";
  }

  if (mode === "create") {
    // create always resolves to a concrete slug: explicit, or derived.
    result.slug = result.slugMode === "explicit" ? result.slug : result._derivedSlug;
    if (result.slug.length > SLUG_MAX) {
      throw new ValidationError(`Slug must be ${SLUG_MAX} characters or fewer.`);
    }
  }

  delete result._derivedSlug;
  return result;
}

// Guard used by the service when it derives a slug from a (possibly just
// renamed) tag name — keeps the same length rule as an explicit slug.
function assertSlugLength(slug) {
  if (!slug) {
    throw new ValidationError("Could not derive a valid slug from the tag name — set one manually.");
  }
  if (slug.length > SLUG_MAX) {
    throw new ValidationError(`Slug must be ${SLUG_MAX} characters or fewer.`);
  }
  return slug;
}

module.exports = { parseTagInput, assertSlugLength, NAME_MAX, SLUG_MAX };
