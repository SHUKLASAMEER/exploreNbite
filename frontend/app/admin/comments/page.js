import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import CommentsManager from "@/components/admin/CommentsManager";

export default async function AdminCommentsPage() {
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
      <CommentsManager />
    </main>
  );
}
