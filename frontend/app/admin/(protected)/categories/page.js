import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import CategoriesManager from "@/components/admin/CategoriesManager";

export default async function AdminCategoriesPage() {
  await requireAdminOrRedirect();

  return <CategoriesManager />;
}
