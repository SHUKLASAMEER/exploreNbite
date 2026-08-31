import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import PageForm from "@/components/admin/PageForm";

export default async function NewPagePage() {
  await requireAdminOrRedirect();

  return <PageForm mode="create" />;
}
