import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parsePostInput, resolveTagIds, VALID_STATUSES } from "@/lib/validation/posts";
import { ConflictError, ValidationError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query params are all optional and forgiving — an out-of-range page/limit
// or an unrecognized status just falls back to a sane default rather than
// failing the whole list request, unlike write endpoints where bad input
// is a hard 400.
function clampInt(raw, fallback, min, max) {
  // Number(null) === 0 and Number("") === 0, both of which pass
  // Number.isInteger() — without this check an omitted query param would
  // silently clamp to `min` instead of using `fallback`.
  if (raw === null || raw === undefined || raw === "") return fallback;
  const num = Number(raw);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function toPublicPost(post) {
  return { ...post, tags: post.tags.map((postTag) => postTag.tag) };
}

export async function GET(request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = clampInt(searchParams.get("page"), 1, 1, 1_000_000);
    const limit = clampInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const search = searchParams.get("search")?.trim();
    const categoryId = Number(searchParams.get("category"));
    const status = searchParams.get("status");

    const where = {};
    if (search) {
      // MySQL's default collation (utf8mb4_*_ci) is case-insensitive, so a
      // plain `contains` is enough — Prisma's `mode: "insensitive"` option
      // isn't supported on the MySQL connector.
      where.title = { contains: search };
    }
    if (searchParams.get("category") && Number.isInteger(categoryId) && categoryId > 0) {
      where.categoryId = categoryId;
    }
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: [{ publishDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishDate: true,
          featuredImageUrl: true,
          shortDescription: true,
          allowComments: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true, slug: true } },
          author: { select: { id: true, name: true } },
          tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        },
        // content intentionally excluded — not needed for a list view
      }),
    ]);

    return NextResponse.json({
      data: posts.map(toPublicPost),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const data = parsePostInput(body, "create");

    const [category, author, existingSlug] = await Promise.all([
      prisma.category.findUnique({ where: { id: data.categoryId } }),
      prisma.author.findUnique({ where: { id: data.authorId } }),
      prisma.post.findUnique({ where: { slug: data.slug } }),
    ]);

    if (!category) {
      throw new ValidationError("Selected category does not exist.");
    }
    if (!author) {
      throw new ValidationError("Selected author does not exist.");
    }
    if (existingSlug) {
      throw new ConflictError(`A post with the slug "${data.slug}" already exists.`);
    }

    const tagIds = (await resolveTagIds(prisma, body?.tags)) ?? [];

    const post = await prisma.post.create({
      data: {
        ...data,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    });

    return NextResponse.json({ post: toPublicPost(post) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
