const { ValidationError } = require("../errors");

// Matches the Prisma schema's column limits (prisma/schema.prisma,
// PostRevision model — deliberately the same limits as Post itself).
const TITLE_MAX = 200;
const SLUG_MAX = 220;
const SHORT_DESCRIPTION_MAX = 300;
const FEATURED_IMAGE_MAX = 500;
const MAX_TAGS = 100; // generous — a real post never carries anywhere near this many

/**
 * Parses an AUTOSAVE payload — the editor's current, possibly-mid-edit form
 * state. Deliberately lenient (never throws for "empty" content): this is a
 * draft workspace snapshot, not a publishable post, so it must not fail an
 * autosave just because the admin briefly cleared the title while retyping
 * it. Values are still type-checked and length-capped to the same limits as
 * a real Post/PostRevision row, so a malformed or oversized field is
 * truncated rather than corrupting the snapshot or erroring the request.
 *
 * A real ValidationError is only thrown for structurally wrong input (not
 * an object, ids that aren't numbers, tags that aren't strings) — the kind
 * of thing that indicates a broken client, not normal mid-edit state.
 */
function parseAutosaveInput(body) {
  const input = body && typeof body === "object" ? body : {};

  const str = (value, max) => {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") {
      throw new ValidationError("Post fields must be text values.");
    }
    return value.slice(0, max);
  };

  const nullableId = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Ids must be positive integers.");
    }
    return id;
  };

  if (input.categoryIds !== undefined && input.categoryIds !== null && !Array.isArray(input.categoryIds)) {
    throw new ValidationError("categoryIds must be an array.");
  }
  const categoryIds = Array.isArray(input.categoryIds)
    ? input.categoryIds.map((v) => nullableId(v)).filter((v) => v !== null)
    : [];

  if (input.tags !== undefined && input.tags !== null && !Array.isArray(input.tags)) {
    throw new ValidationError("Tags must be an array of tag names.");
  }
  const tagNames = Array.isArray(input.tags)
    ? input.tags
        .map((v) => {
          if (typeof v !== "string") {
            throw new ValidationError("Tags must be an array of tag names.");
          }
          return v.trim();
        })
        .filter(Boolean)
        .slice(0, MAX_TAGS)
    : [];

  return {
    title: str(input.title, TITLE_MAX),
    slug: str(input.slug, SLUG_MAX),
    shortDescription: str(input.shortDescription, SHORT_DESCRIPTION_MAX) || null,
    content: typeof input.content === "string" ? input.content : "",
    featuredImageUrl: str(input.featuredImageUrl, FEATURED_IMAGE_MAX) || null,
    categoryId: nullableId(input.categoryId),
    authorId: nullableId(input.authorId),
    categoryIds,
    tagNames,
  };
}

// Order-independent, case-insensitive-for-tags equality between two
// snapshot shapes (both already normalised by parseAutosaveInput /
// snapshotFromPost). Simple deterministic field comparison — no hashing —
// used to skip creating a revision when nothing meaningful changed.
function snapshotsEqual(a, b) {
  if (!a || !b) return false;
  const norm = (s) =>
    JSON.stringify({
      title: s.title ?? "",
      slug: s.slug ?? "",
      shortDescription: s.shortDescription ?? null,
      content: s.content ?? "",
      featuredImageUrl: s.featuredImageUrl ?? null,
      categoryId: s.categoryId ?? null,
      authorId: s.authorId ?? null,
      categoryIds: [...(s.categoryIds ?? [])].sort((x, y) => x - y),
      tagNames: [...(s.tagNames ?? [])].map((t) => t.toLowerCase()).sort(),
    });
  return norm(a) === norm(b);
}

module.exports = { parseAutosaveInput, snapshotsEqual };
