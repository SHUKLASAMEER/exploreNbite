import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import TagsManager from "@/components/admin/TagsManager";

export default async function AdminTagsPage() {
  await requireAdminOrRedirect();

  return <TagsManager />;
}
