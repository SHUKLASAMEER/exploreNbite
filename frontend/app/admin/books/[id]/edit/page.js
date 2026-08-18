import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import BookForm from "@/components/admin/BookForm";

export default async function EditBookPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <BookForm mode="edit" bookId={id} />
    </main>
  );
}
