import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AwardForm from "@/components/admin/AwardForm";

export default async function NewAwardPage() {
  await requireAdminOrRedirect();

  return (
    <main style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <AwardForm mode="create" />
    </main>
  );
}
