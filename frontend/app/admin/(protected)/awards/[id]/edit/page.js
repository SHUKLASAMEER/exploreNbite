import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AwardForm from "@/components/admin/AwardForm";

export default async function EditAwardPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return <AwardForm mode="edit" awardId={id} />;
}
