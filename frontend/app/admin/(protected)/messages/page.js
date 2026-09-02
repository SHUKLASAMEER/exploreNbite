import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import MessagesManager from "@/components/admin/MessagesManager";

export default async function AdminMessagesPage() {
  await requireAdminOrRedirect();

  return <MessagesManager />;
}
