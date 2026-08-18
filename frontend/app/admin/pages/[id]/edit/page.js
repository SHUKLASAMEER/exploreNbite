import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import PageForm from "@/components/admin/PageForm";

export default async function EditPagePage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <PageForm mode="edit" pageId={id} />
    </main>
  );
}
