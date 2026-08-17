import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { verifyAdminToken } from "@/lib/auth/jwt";
import { getSessionToken } from "@/lib/auth/session";
import LogoutButton from "@/components/admin/LogoutButton";

// Authentication verification page only — not the final dashboard (no
// sidebar/cards/CMS navigation yet). Re-checks the session itself rather
// than trusting proxy.js alone, per Next.js's own guidance.
export default async function AdminHomePage() {
  const token = await getSessionToken();
  const payload = token ? verifyAdminToken(token) : null;

  if (!payload?.adminId) {
    redirect("/admin/login");
  }

  const admin = await prisma.admin.findUnique({
    where: { id: payload.adminId },
    select: { id: true, name: true, email: true },
  });

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h1>Admin Dashboard</h1>
      <p>
        Signed in as <strong>{admin.email}</strong>
      </p>
      <div>
        <LogoutButton />
      </div>
    </main>
  );
}
