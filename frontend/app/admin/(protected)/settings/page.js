import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import SettingsManager from "@/components/admin/SettingsManager";

export default async function AdminSettingsPage() {
  await requireAdminOrRedirect();

  return <SettingsManager />;
}
