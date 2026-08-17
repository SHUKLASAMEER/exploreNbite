import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { verifyAdminToken } from "@/lib/auth/jwt";
import { getSessionToken } from "@/lib/auth/session";
import PostForm from "@/components/admin/PostForm";

export default async function EditPostPage({ params }) {
  const token = await getSessionToken();
  const payload = token ? verifyAdminToken(token) : null;

  if (!payload?.adminId) {
    redirect("/admin/login");
  }

  const admin = await prisma.admin.findUnique({
    where: { id: payload.adminId },
    select: { id: true },
  });

  if (!admin) {
    redirect("/admin/login");
  }

  const { id } = await params;

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <PostForm mode="edit" postId={id} />
    </main>
  );
}
