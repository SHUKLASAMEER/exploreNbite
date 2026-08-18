import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import CommentDetail from "@/components/admin/CommentDetail";

export default async function AdminCommentDetailPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <CommentDetail commentId={id} />
    </main>
  );
}
