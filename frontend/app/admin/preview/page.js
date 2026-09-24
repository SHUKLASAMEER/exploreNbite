import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import PublicThemeShell from "@/components/public/PublicThemeShell";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PostPreview from "@/components/admin/PostPreview";

// Admin-only post preview — deliberately OUTSIDE app/admin/(protected) so it
// renders without the admin shell chrome, and OUTSIDE app/(site) so it isn't
// a public route and gets no public Header/Footer. Auth is enforced the same
// way every other admin page does it (requireAdminOrRedirect → backend
// session check → /admin/login on failure).
//
// The preview content itself comes from the editor's live form state via
// localStorage (see components/admin/PostPreview.js); this route never reads
// or exposes any unpublished post from the database.
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPostPreviewPage() {
  await requireAdminOrRedirect();

  return (
    <PublicThemeShell>
      <TwoColumnLayout sidebar={<Sidebar layout="home" />}>
        <PostPreview />
      </TwoColumnLayout>
    </PublicThemeShell>
  );
}
