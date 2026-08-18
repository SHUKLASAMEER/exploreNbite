import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import MenuItemsManager from "@/components/admin/MenuItemsManager";

export default async function AdminMenuPage() {
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
      <MenuItemsManager />
    </main>
  );
}
