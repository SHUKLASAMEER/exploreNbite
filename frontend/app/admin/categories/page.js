import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import CategoriesManager from "@/components/admin/CategoriesManager";

export default async function AdminCategoriesPage() {
  await requireAdminOrRedirect();

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
