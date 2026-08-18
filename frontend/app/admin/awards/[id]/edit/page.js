import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AwardForm from "@/components/admin/AwardForm";

export default async function EditAwardPage({ params }) {
  await requireAdminOrRedirect();
  const { id } = await params;

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <AwardForm mode="edit" awardId={id} />
    </main>
  );
}
