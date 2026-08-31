import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import SubscribersManager from "@/components/admin/SubscribersManager";

export default async function AdminSubscribersPage() {
  await requireAdminOrRedirect();

  return <SubscribersManager />;
}
