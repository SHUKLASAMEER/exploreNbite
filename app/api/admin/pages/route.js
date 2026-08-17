import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parsePageInput, resolveMenuPosition } from "@/lib/validation/pages";
import { ConflictError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

export async function GET() {
  try {
    await requireAdmin();

    const pages = await prisma.page.findMany({
      orderBy: [{ menuPosition: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        showInMenu: true,
        menuPosition: true,
        createdAt: true,
        updatedAt: true,
        // content intentionally excluded — not needed for a list view
      },
    });

    return NextResponse.json({ pages });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const data = parsePageInput(body, "create");

    const existingSlug = await prisma.page.findUnique({ where: { slug: data.slug } });
    if (existingSlug) {
      throw new ConflictError(`A page with the slug "${data.slug}" already exists.`);
    }

    data.menuPosition = await resolveMenuPosition(prisma, {
      showInMenu: data.showInMenu,
      menuPosition: data.menuPosition,
    });

    const page = await prisma.page.create({ data });
    return NextResponse.json({ page }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
