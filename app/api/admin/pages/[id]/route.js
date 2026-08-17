import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parsePageInput, resolveMenuPosition } from "@/lib/validation/pages";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid page id.");
  }
  return id;
}

export async function GET(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundError("Page not found.");
    }

    return NextResponse.json({ page });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const existingPage = await prisma.page.findUnique({ where: { id } });
    if (!existingPage) {
      throw new NotFoundError("Page not found.");
    }

    const body = await request.json().catch(() => null);
    const data = parsePageInput(body, "update");

    // Only check for a slug collision if the slug is actually changing —
    // this is what lets an edit keep the page's own existing slug.
    if (data.slug && data.slug !== existingPage.slug) {
      const conflict = await prisma.page.findFirst({ where: { slug: data.slug, NOT: { id } } });
      if (conflict) {
        throw new ConflictError(`A page with the slug "${data.slug}" already exists.`);
      }
    }

    const touchesMenu = Object.prototype.hasOwnProperty.call(data, "showInMenu") ||
      Object.prototype.hasOwnProperty.call(data, "menuPosition");
    if (touchesMenu) {
      const effectiveShowInMenu = Object.prototype.hasOwnProperty.call(data, "showInMenu")
        ? data.showInMenu
        : existingPage.showInMenu;
      const effectiveMenuPosition = Object.prototype.hasOwnProperty.call(data, "menuPosition")
        ? data.menuPosition
        : existingPage.menuPosition;

      data.menuPosition = await resolveMenuPosition(prisma, {
        showInMenu: effectiveShowInMenu,
        menuPosition: effectiveMenuPosition,
        excludeId: id,
      });
    }

    const page = await prisma.page.update({ where: { id }, data });
    return NextResponse.json({ page });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundError("Page not found.");
    }

    // MenuItem.pageId is `onDelete: Cascade` in the schema (prisma/schema.prisma,
    // a locked Phase 1.5 decision — not changed here): deleting a page
    // correctly removes only the menu item(s) that specifically pointed to
    // IT, since a menu entry can't meaningfully survive its target's
    // deletion. No other pages, posts, categories, authors, tags, or
    // unrelated menu items are touched.
    await prisma.page.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
