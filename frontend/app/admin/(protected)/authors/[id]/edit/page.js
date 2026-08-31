import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AuthorForm from "@/components/admin/AuthorForm";

export default async function EditAuthorPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return <AuthorForm mode="edit" authorId={id} />;
}
