import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import CommentsManager from "@/components/admin/CommentsManager";

export default async function AdminCommentsPage() {
  await requireAdminOrRedirect();

  return <CommentsManager />;
}
