import { ValidationError, ConflictError } from "@/lib/api/errors";
import { slugify } from "@/lib/validation/categories";

export { slugify };

// Matches the Prisma schema's column limits (prisma/schema.prisma, Page
// model) so a validation error surfaces before the database would reject
// it.
const TITLE_MAX = 200;
const SLUG_MAX = 220;
const MENU_POSITION_MIN = 0;
const MENU_POSITION_MAX = 100000;

/**
 * Parses + validates page input from a request body into a Prisma-ready
 * scalar `data` object. Does NOT touch slug uniqueness or menu-position
 * conflicts (those need a DB round trip — see resolveMenuPosition below —
 * same split used by lib/validation/categories.js and lib/validation/posts.js).
 *
 * mode "create": title and content are required (slug auto-generated from
 *   title if not supplied; showInMenu defaults to false).
 * mode "update": every field is optional; only fields actually present in
 *   the body are validated and included in the result, so an edit that
 *   doesn't touch the slug keeps the page's own existing slug.
 */
export function parsePageInput(body, mode) {
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

  if (mode === "create" || has("content")) {
    const content = typeof input.content === "string" ? input.content.trim() : "";
    if (!content) {
      throw new ValidationError("Content is required.");
    }
    result.content = content;
  }

  if (has("showInMenu")) {
    if (typeof input.showInMenu !== "boolean") {
      throw new ValidationError("showInMenu must be true or false.");
    }
    result.showInMenu = input.showInMenu;
  } else if (mode === "create") {
    result.showInMenu = false;
  }

  if (has("menuPosition")) {
    const raw = input.menuPosition;
    if (raw === null || raw === "") {
      result.menuPosition = null;
    } else {
      const position = Number(raw);
      if (!Number.isInteger(position)) {
        throw new ValidationError("Menu position must be a whole number.");
      }
      if (position < MENU_POSITION_MIN || position > MENU_POSITION_MAX) {
        throw new ValidationError(`Menu position must be between ${MENU_POSITION_MIN} and ${MENU_POSITION_MAX}.`);
      }
      result.menuPosition = position;
    }
  }

  return result;
}

/**
 * Resolves the final menuPosition for a page given its (possibly just-
 * changed) showInMenu/menuPosition values:
 *  - Not shown in menu: menuPosition is optional and passed through as-is
 *    (no auto-assign, no uniqueness check — an invisible page's position
 *    doesn't affect the actual menu).
 *  - Shown in menu, no position given: auto-assigned to the end (matches
 *    the same "put it last" pattern used for Category.sortOrder).
 *  - Shown in menu, position given: the schema has no unique constraint on
 *    menuPosition, so two visible pages could otherwise silently collide.
 *    This is the "reject duplicate position" choice from the two options in
 *    the Phase 2E brief (simpler than auto-renumbering every other page,
 *    and — unlike Categories' bulk reorder — there's no dedicated reorder
 *    endpoint in this phase to fall back on) — throws ConflictError if
 *    another *visible* page already holds that exact position.
 */
export async function resolveMenuPosition(prisma, { showInMenu, menuPosition, excludeId }) {
  if (!showInMenu) {
    return menuPosition;
  }

  const excludeClause = excludeId ? { NOT: { id: excludeId } } : {};

  if (menuPosition === null || menuPosition === undefined) {
    const last = await prisma.page.aggregate({
      where: { showInMenu: true, ...excludeClause },
      _max: { menuPosition: true },
    });
    return (last._max.menuPosition ?? -1) + 1;
  }

  const positionTaken = await prisma.page.findFirst({
    where: { showInMenu: true, menuPosition, ...excludeClause },
  });
  if (positionTaken) {
    throw new ConflictError(
      `Menu position ${menuPosition} is already used by "${positionTaken.title}". Choose a different position.`
    );
  }
  return menuPosition;
}
