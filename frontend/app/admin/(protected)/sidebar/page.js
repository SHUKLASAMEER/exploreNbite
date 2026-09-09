import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import SidebarManager from "@/components/admin/SidebarManager";

export default async function AdminSidebarPage() {
  await requireAdminOrRedirect();

  return <SidebarManager />;
}
