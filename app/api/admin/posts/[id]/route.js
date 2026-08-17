import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parsePostInput, resolveTagIds } from "@/lib/validation/posts";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";

const POST_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, name: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
};

function toPublicPost(post) {
  return { ...post, tags: post.tags.map((postTag) => postTag.tag) };
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid post id.");
  }
  return id;
}

export async function GET(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const post = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
    if (!post) {
      throw new NotFoundError("Post not found.");
    }

    return NextResponse.json({ post: toPublicPost(post) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      throw new NotFoundError("Post not found.");
    }

    const body = await request.json().catch(() => null);
    const data = parsePostInput(body, "update");

    if (data.categoryId !== undefined) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) {
        throw new ValidationError("Selected category does not exist.");
      }
    }

    if (data.authorId !== undefined) {
      const author = await prisma.author.findUnique({ where: { id: data.authorId } });
      if (!author) {
        throw new ValidationError("Selected author does not exist.");
      }
    }

    if (data.slug && data.slug !== existingPost.slug) {
      const conflict = await prisma.post.findFirst({ where: { slug: data.slug, NOT: { id } } });
      if (conflict) {
        throw new ConflictError(`A post with the slug "${data.slug}" already exists.`);
      }
    }

    const hasTags = Object.prototype.hasOwnProperty.call(body ?? {}, "tags");
    const tagIds = hasTags ? await resolveTagIds(prisma, body.tags) : undefined;

    const operations = [prisma.post.update({ where: { id }, data })];
    if (hasTags) {
      // Delete-then-recreate keeps this simple and guarantees no stale
      // PostTag rows survive a tag change, at the cost of reassigning
      // fresh join rows even for tags that didn't actually change — a
      // reasonable trade for a low-volume single-admin CMS.
      operations.push(prisma.postTag.deleteMany({ where: { postId: id } }));
      for (const tagId of tagIds) {
        operations.push(prisma.postTag.create({ data: { postId: id, tagId } }));
      }
    }
    await prisma.$transaction(operations);

    const post = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
    return NextResponse.json({ post: toPublicPost(post) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseId(rawId);

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundError("Post not found.");
    }

    // PostTag.postId and Comment.postId are both `onDelete: Cascade` in the
    // schema (prisma/schema.prisma) — deleting the post cascades to both
    // automatically, no orphaned rows, no separate cleanup needed here.
    // Category/Author/Tag rows are never touched.
    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
