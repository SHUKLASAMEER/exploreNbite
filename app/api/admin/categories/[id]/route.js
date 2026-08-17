import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parseCategoryInput } from "@/lib/validation/categories";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid category id.");
  }
  return id;
}

export async function GET(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundError("Category not found.");
    }

    return NextResponse.json({ category });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      throw new NotFoundError("Category not found.");
    }

    const body = await request.json().catch(() => null);
    const data = parseCategoryInput(body, "update");

    // Only check for a slug collision if the slug is actually changing —
    // this is what lets an edit keep the category's own existing slug.
    if (data.slug && data.slug !== existingCategory.slug) {
      const conflict = await prisma.category.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictError(`A category with the slug "${data.slug}" already exists.`);
      }
    }

    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ category });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundError("Category not found.");
    }

    // Posts.categoryId is a required FK with ON DELETE RESTRICT (locked
    // schema decision — not changed here). Check first so the admin gets a
    // clear, actionable message instead of a raw database error.
    const postCount = await prisma.post.count({ where: { categoryId: id } });
    if (postCount > 0) {
      throw new ConflictError(
        `This category is used by ${postCount} post${postCount === 1 ? "" : "s"} and can't be deleted. Reassign or remove ${postCount === 1 ? "that post" : "those posts"} first.`
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
