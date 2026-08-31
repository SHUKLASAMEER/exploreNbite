import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AwardForm from "@/components/admin/AwardForm";

export default async function NewAwardPage() {
  await requireAdminOrRedirect();

  return <AwardForm mode="create" />;
}
