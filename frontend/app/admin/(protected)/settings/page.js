import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import SettingsManager from "@/components/admin/SettingsManager";

export default async function AdminSettingsPage() {
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
      <SettingsManager />
    </main>
  );
}
