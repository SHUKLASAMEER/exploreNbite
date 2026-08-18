import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import PageForm from "@/components/admin/PageForm";

export default async function NewPagePage() {
  await requireAdminOrRedirect();

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <PageForm mode="create" />
    </main>
  );
}
