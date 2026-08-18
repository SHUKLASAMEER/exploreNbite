const { ValidationError, ConflictError } = require("../errors");
const { slugify } = require("../slugify");

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
 * conflicts (those need a DB round trip — see resolveMenuPosition below).
 */
function parsePageInput(body, mode) {
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
 * changed) showInMenu/menuPosition values — see the original Next.js
 * lib/validation/pages.js for the full rationale (unchanged here):
 *  - Not shown in menu: menuPosition passed through as-is.
 *  - Shown in menu, no position given: auto-assigned to the end.
 *  - Shown in menu, position given: rejected with ConflictError if another
 *    visible page already holds that exact position.
 */
async function resolveMenuPosition(prisma, { showInMenu, menuPosition, excludeId }) {
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

module.exports = { parsePageInput, resolveMenuPosition };
