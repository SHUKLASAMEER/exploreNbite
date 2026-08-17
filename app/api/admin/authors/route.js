import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handleApiError } from "@/lib/api/response";

// Read-only, just enough for the post editor's author picker. Not an
// Authors admin screen — no create/update/delete here, out of scope for
// Phase 2D (Posts CMS only).
export async function GET() {
  try {
    await requireAdmin();
    const authors = await prisma.author.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return NextResponse.json({ authors });
  } catch (err) {
    return handleApiError(err);
  }
}
