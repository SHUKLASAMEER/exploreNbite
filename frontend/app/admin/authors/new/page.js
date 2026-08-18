import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AuthorForm from "@/components/admin/AuthorForm";

export default async function NewAuthorPage() {
  await requireAdminOrRedirect();

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <AuthorForm mode="create" />
    </main>
  );
}
