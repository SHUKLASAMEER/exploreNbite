import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { verifyAdminToken } from "@/lib/auth/jwt";
import { getSessionToken } from "@/lib/auth/session";
import PostForm from "@/components/admin/PostForm";

export default async function NewPostPage() {
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

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <PostForm mode="create" />
    </main>
  );
}
