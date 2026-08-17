import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handleApiError } from "@/lib/api/response";

// Read-only, just enough for the post editor's tag picker to suggest
// existing tags instead of the admin typing blind. Not a Tags admin screen
// — no create/update/delete here (tags are created via the post form, see
// lib/validation/posts.js#resolveTagIds).
export async function GET() {
  try {
    await requireAdmin();
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ tags });
  } catch (err) {
    return handleApiError(err);
  }
}
