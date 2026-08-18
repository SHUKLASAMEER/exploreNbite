import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AwardsManager from "@/components/admin/AwardsManager";

export default async function AdminAwardsPage() {
  await requireAdminOrRedirect();

  return (
    <main
      style={{
        padding: "2rem",
        maxWidth: "1100px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <p>
        <a href="/admin">← Admin</a>
      </p>
      <AwardsManager />
    </main>
  );
}
