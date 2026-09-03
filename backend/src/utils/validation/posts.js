const { ValidationError } = require("../errors");
const { slugify } = require("../slugify");

// Matches the Prisma schema's column limits (prisma/schema.prisma, Post and
// Tag models) so a validation error surfaces before the database would
// reject it.
const TITLE_MAX = 200;
const SLUG_MAX = 220;
const FEATURED_IMAGE_MAX = 500;
const SHORT_DESCRIPTION_MAX = 300;
const TAG_NAME_MAX = 80;

const VALID_STATUSES = ["draft", "published"];

/**
 * Parses + validates post input from a request body into a Prisma-ready
 * scalar `data` object. Does NOT touch category/author existence or slug
 * uniqueness (those need a DB round trip and belong in the service layer)
 * and does NOT touch tags (see resolveTagIds below).
 */
function parsePostInput(body, mode) {
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

  if (mode === "create" || has("slug")) {
    const explicitSlug = typeof input.slug === "string" ? input.slug.trim() : "";
    const slug = slugify(explicitSlug || result.title);
    if (!slug) {
      throw new ValidationError("Could not derive a valid slug — please provide one manually.");
    }
    if (slug.length > SLUG_MAX) {
      throw new ValidationError(`Slug must be ${SLUG_MAX} characters or fewer.`);
    }
    result.slug = slug;
  }

  if (mode === "create" || has("categoryId")) {
    const categoryId = Number(input.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new ValidationError("A valid category is required.");
    }
    result.categoryId = categoryId;
  }

  if (mode === "create" || has("authorId")) {
    const authorId = Number(input.authorId);
    if (!Number.isInteger(authorId) || authorId <= 0) {
      throw new ValidationError("A valid author is required.");
    }
    result.authorId = authorId;
  }

  if (mode === "create" || has("content")) {
    const content = typeof input.content === "string" ? input.content.trim() : "";
    if (!content) {
      throw new ValidationError("Content is required.");
    }
    result.content = content;
  }

  if (has("featuredImageUrl")) {
    const url = typeof input.featuredImageUrl === "string" ? input.featuredImageUrl.trim() : "";
    if (url.length > FEATURED_IMAGE_MAX) {
      throw new ValidationError(`Featured image URL must be ${FEATURED_IMAGE_MAX} characters or fewer.`);
    }
    result.featuredImageUrl = url || null;
  }

  if (has("shortDescription")) {
    const description = typeof input.shortDescription === "string" ? input.shortDescription.trim() : "";
    if (description.length > SHORT_DESCRIPTION_MAX) {
      throw new ValidationError(`Short description must be ${SHORT_DESCRIPTION_MAX} characters or fewer.`);
    }
    result.shortDescription = description || null;
  }

  if (mode === "create" || has("status")) {
    const status = has("status") ? input.status : "draft";
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(", ")}.`);
    }
    result.status = status;
  }

  if (has("allowComments")) {
    if (typeof input.allowComments !== "boolean") {
      throw new ValidationError("allowComments must be true or false.");
    }
    result.allowComments = input.allowComments;
  } else if (mode === "create") {
    result.allowComments = true;
  }

  if (has("sticky")) {
    if (typeof input.sticky !== "boolean") {
      throw new ValidationError("sticky must be true or false.");
    }
    result.sticky = input.sticky;
  } else if (mode === "create") {
    result.sticky = false;
  }

  if (has("publishDate")) {
    const raw = input.publishDate;
    if (raw === null || raw === "") {
      result.publishDate = new Date();
    } else {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        throw new ValidationError("Publish date is invalid.");
      }
      result.publishDate = date;
    }
  } else if (mode === "create") {
    result.publishDate = new Date();
  }

  return result;
}

/**
 * Normalizes a single raw tag name into `{ name, slug }`, or returns null if
 * it's empty / slug-less after cleaning. Throws ValidationError for a
 * non-string or an over-long name. Shared by resolveTagIds (post save) and
 * the standalone tag-create endpoint (tag.service.create) so both apply the
 * exact same rules — trim, collapse internal whitespace, slug by the shared
 * slugify(), 80-char cap.
 */
function parseTagName(value) {
  if (typeof value !== "string") {
    throw new ValidationError("Each tag must be a text value.");
  }
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return null;
  if (name.length > TAG_NAME_MAX) {
    throw new ValidationError(`Tag names must be ${TAG_NAME_MAX} characters or fewer.`);
  }
  const slug = slugify(name);
  if (!slug) return null;
  return { name, slug };
}

/**
 * Takes the raw `tags` field from a request body — an array of tag name
 * strings, e.g. ["Travel", "gujarat"] — and resolves it to an array of tag
 * ids, creating any tag that doesn't exist yet. Existing tags are matched
 * by slug (not raw name) so "Travel" and "travel" resolve to the same tag
 * instead of creating a near-duplicate. Never renames an existing tag just
 * because it was resubmitted with different casing.
 */
async function resolveTagIds(prisma, rawTags) {
  if (rawTags === undefined) return undefined;
  if (!Array.isArray(rawTags)) {
    throw new ValidationError("Tags must be an array of tag names.");
  }

  const seenSlugs = new Set();
  const cleaned = [];
  for (const value of rawTags) {
    const parsed = parseTagName(value);
    if (!parsed || seenSlugs.has(parsed.slug)) continue;
    seenSlugs.add(parsed.slug);
    cleaned.push(parsed);
  }

  const tagIds = [];
  for (const { name, slug } of cleaned) {
    // Atomic find-or-create keyed on the unique slug column — this is what
    // guarantees no duplicate tags, even under concurrent requests.
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    tagIds.push(tag.id);
  }
  return tagIds;
}

/**
 * Takes the raw `categoryIds` field from a request body — an array of
 * *additional* category ids a post also belongs to, beyond its required
 * primary `categoryId` (see the post_categories schema note) — and resolves
 * it to a deduped array of ids, verifying each one actually exists. Unlike
 * resolveTagIds this never creates anything; categories are a fixed, flat
 * list managed on their own admin screen.
 */
async function resolveCategoryIds(prisma, rawCategoryIds, primaryCategoryId) {
  if (rawCategoryIds === undefined) return undefined;
  if (!Array.isArray(rawCategoryIds)) {
    throw new ValidationError("categoryIds must be an array of category ids.");
  }

  const ids = [];
  const seen = new Set();
  for (const value of rawCategoryIds) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Each additional category id must be a positive integer.");
    }
    // The primary category is already implied — skip it here so it's never
    // duplicated into post_categories alongside categoryId.
    if (id === primaryCategoryId || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  if (ids.length > 0) {
    const found = await prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (found.length !== ids.length) {
      throw new ValidationError("One or more additional categories do not exist.");
    }
  }

  return ids;
}

module.exports = { parsePostInput, parseTagName, resolveTagIds, resolveCategoryIds, VALID_STATUSES };
