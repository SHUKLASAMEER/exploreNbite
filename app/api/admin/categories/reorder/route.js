import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ValidationError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

// Body shape: { order: [3, 1, 2, 4] } — category ids in the desired
// top-to-bottom order. sortOrder is assigned from array position, so
// there's no separate "sortOrder" number for a client to get wrong.
export async function PATCH(request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const order = Array.isArray(body?.order) ? body.order : null;

    if (!order || order.length === 0) {
      throw new ValidationError('Provide an "order" array of category ids in the desired order.');
    }

    const ids = order.map((value) => Number(value));
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new ValidationError("Every id in the order array must be a positive integer.");
    }

    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new ValidationError("The order array contains duplicate category ids.");
    }

    const existingCategories = await prisma.category.findMany({ select: { id: true } });
    const existingIds = new Set(existingCategories.map((c) => c.id));

    const isCompleteMatch =
      existingIds.size === uniqueIds.size && [...existingIds].every((id) => uniqueIds.has(id));
    if (!isCompleteMatch) {
      throw new ValidationError("The order array must include every existing category exactly once.");
    }

    await prisma.$transaction(
      ids.map((id, index) => prisma.category.update({ where: { id }, data: { sortOrder: index } }))
    );

    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}
