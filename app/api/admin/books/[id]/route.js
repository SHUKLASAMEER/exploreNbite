import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parseBookInput, parseBuyLinks } from "@/lib/validation/books";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

const BOOK_INCLUDE = { buyLinks: { orderBy: { sortOrder: "asc" } } };

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid book id.");
  }
  return id;
}

export async function GET(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const book = await prisma.book.findUnique({ where: { id }, include: BOOK_INCLUDE });
    if (!book) {
      throw new NotFoundError("Book not found.");
    }

    return NextResponse.json({ book });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const existingBook = await prisma.book.findUnique({ where: { id } });
    if (!existingBook) {
      throw new NotFoundError("Book not found.");
    }

    const body = await request.json().catch(() => null);
    const data = parseBookInput(body, "update");

    const hasBuyLinks = Object.prototype.hasOwnProperty.call(body ?? {}, "buyLinks");
    const buyLinks = hasBuyLinks ? parseBuyLinks(body.buyLinks) : undefined;

    const operations = [prisma.book.update({ where: { id }, data })];
    if (hasBuyLinks) {
      // Delete-then-recreate — the same pattern already used for the
      // Post <-> Tag sync (app/api/admin/posts/[id]/route.js): guarantees
      // no stale BookBuyLink rows survive an edit. Nothing else references
      // book_buy_links.id, so reissuing fresh rows for the whole submitted
      // set has no downside beyond the row ids themselves changing — the
      // actual link data (platform/url/order) is fully preserved.
      operations.push(prisma.bookBuyLink.deleteMany({ where: { bookId: id } }));
      for (const link of buyLinks) {
        operations.push(prisma.bookBuyLink.create({ data: { bookId: id, ...link } }));
      }
    }
    await prisma.$transaction(operations);

    const book = await prisma.book.findUnique({ where: { id }, include: BOOK_INCLUDE });
    return NextResponse.json({ book });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundError("Book not found.");
    }

    // BookBuyLink.bookId is `onDelete: Cascade` in the schema — deleting
    // the book removes its own buy links automatically, no orphans, no
    // separate cleanup needed here. No other table references books.id.
    await prisma.book.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
