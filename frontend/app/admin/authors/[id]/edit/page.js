import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AuthorForm from "@/components/admin/AuthorForm";

export default async function EditAuthorPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <AuthorForm mode="edit" authorId={id} />
    </main>
  );
}
