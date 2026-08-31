import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import PagesManager from "@/components/admin/PagesManager";

export default async function AdminPagesPage() {
  await requireAdminOrRedirect();

  return <PagesManager />;
}
