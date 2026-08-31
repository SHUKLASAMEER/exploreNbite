import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import PageForm from "@/components/admin/PageForm";

export default async function EditPagePage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return <PageForm mode="edit" pageId={id} />;
}
