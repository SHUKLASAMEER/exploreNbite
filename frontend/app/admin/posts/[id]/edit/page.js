import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import PostForm from "@/components/admin/PostForm";

export default async function EditPostPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <PostForm mode="edit" postId={id} />
    </main>
  );
}
