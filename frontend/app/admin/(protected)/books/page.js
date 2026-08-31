import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import BooksManager from "@/components/admin/BooksManager";

export default async function AdminBooksPage() {
  await requireAdminOrRedirect();

  return <BooksManager />;
}
