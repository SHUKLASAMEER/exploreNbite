import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import BookForm from "@/components/admin/BookForm";

export default async function NewBookPage() {
  await requireAdminOrRedirect();

  return <BookForm mode="create" />;
}
