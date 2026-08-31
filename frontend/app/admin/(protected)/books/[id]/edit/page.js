import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import BookForm from "@/components/admin/BookForm";

export default async function EditBookPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return <BookForm mode="edit" bookId={id} />;
}
