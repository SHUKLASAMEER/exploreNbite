import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import MediaUploadForm from "@/components/admin/MediaUploadForm";

export default async function NewMediaPage() {
  await requireAdminOrRedirect();

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <MediaUploadForm />
    </main>
  );
}
