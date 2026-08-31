import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import MediaUploadForm from "@/components/admin/MediaUploadForm";

export default async function NewMediaPage() {
  await requireAdminOrRedirect();

  return <MediaUploadForm />;
}
