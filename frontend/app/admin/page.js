import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import LogoutButton from "@/components/admin/LogoutButton";

// Authentication verification page only — not the final dashboard.
export default async function AdminHomePage() {
  const admin = await requireAdminOrRedirect();

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
