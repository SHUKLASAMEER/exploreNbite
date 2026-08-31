import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import CommentDetail from "@/components/admin/CommentDetail";

export default async function AdminCommentDetailPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return <CommentDetail commentId={id} />;
}
