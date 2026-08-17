import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parseCategoryInput } from "@/lib/validation/categories";
import { ConflictError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

export async function GET() {
  try {
    await requireAdmin();

    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const data = parseCategoryInput(body, "create");

    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new ConflictError(`A category with the slug "${data.slug}" already exists.`);
    }

    // No explicit order supplied -> put the new category at the end of the
    // existing list rather than defaulting everything to 0.
    if (data.sortOrder === undefined) {
      const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
      data.sortOrder = (last._max.sortOrder ?? -1) + 1;
    }

    const category = await prisma.category.create({ data });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
