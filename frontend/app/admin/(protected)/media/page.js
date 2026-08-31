import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import MediaManager from "@/components/admin/MediaManager";

export default async function AdminMediaPage() {
  await requireAdminOrRedirect();

  return <MediaManager />;
}
