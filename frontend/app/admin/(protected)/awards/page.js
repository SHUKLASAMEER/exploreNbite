import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AwardsManager from "@/components/admin/AwardsManager";

export default async function AdminAwardsPage() {
  await requireAdminOrRedirect();

  return <AwardsManager />;
}
