import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AuthorForm from "@/components/admin/AuthorForm";

export default async function NewAuthorPage() {
  await requireAdminOrRedirect();

  return <AuthorForm mode="create" />;
}
