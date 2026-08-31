import { requireAdminOrRedirect } from "@/lib/requireAdminOrRedirect";
import AdminShell from "@/components/admin/ui/AdminShell";

// Wraps every protected /admin/** route (everything except /admin/login,
// which lives outside this route group so it never gets sidebar/topbar
// chrome). requireAdminOrRedirect() is the same server-side check every
// admin page already performs individually — calling it here too just
// gets us the admin's name/email for the Topbar; it's not a second auth
// mechanism.
export default async function ProtectedAdminLayout({ children }) {
  const admin = await requireAdminOrRedirect();

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
