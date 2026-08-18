import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parseBookInput, parseBuyLinks } from "@/lib/validation/books";
import { handleApiError } from "@/lib/api/response";

function toPublicBookListItem(book) {
  const { _count, ...rest } = book;
  return { ...rest, buyLinkCount: _count.buyLinks };
}

export async function GET() {
  try {
    await requireAdmin();

    // Books has no dedicated ordering field of its own (unlike Category's
    // sortOrder or Page's menuPosition) — newest-first is the predictable,
    // stable default, same as Posts.
    const books = await prisma.book.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        publishedYear: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { buyLinks: true } },
        // description and full buyLinks intentionally excluded — the admin
        // list only needs a count, not the full rows
      },
    });

    return NextResponse.json({ books: books.map(toPublicBookListItem) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const data = parseBookInput(body, "create");
    const buyLinks = parseBuyLinks(body?.buyLinks) ?? [];

    const book = await prisma.book.create({
      data: {
        ...data,
        buyLinks: { create: buyLinks },
      },
      include: { buyLinks: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ book }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
