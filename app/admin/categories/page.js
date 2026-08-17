import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { verifyAdminToken } from "@/lib/auth/jwt";
import { getSessionToken } from "@/lib/auth/session";
import CategoriesManager from "@/components/admin/CategoriesManager";

// Same auth-guard pattern as app/admin/page.js: proxy.js already protects
// /admin/:path*, this re-checks independently (defense in depth).
export default async function AdminCategoriesPage() {
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
    <main
      style={{
        padding: "2rem",
        maxWidth: "960px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <p>
        <a href="/admin">← Admin</a>
      </p>
      <CategoriesManager />
    </main>
  );
}
