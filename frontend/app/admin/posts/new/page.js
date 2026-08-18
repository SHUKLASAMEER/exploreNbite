import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import PostForm from "@/components/admin/PostForm";

export default async function NewPostPage() {
  await requireAdminOrRedirect();

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <PostForm mode="create" />
    </main>
  );
}
