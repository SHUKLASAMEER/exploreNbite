import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import BooksManager from "@/components/admin/BooksManager";

export default async function AdminBooksPage() {
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
      <BooksManager />
    </main>
  );
}
