import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AuthorsManager from "@/components/admin/AuthorsManager";

export default async function AdminAuthorsPage() {
  await requireAdminOrRedirect();

  return <AuthorsManager />;
}
