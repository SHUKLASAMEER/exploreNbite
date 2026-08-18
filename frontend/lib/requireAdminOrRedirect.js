import { redirect } from "next/navigation";
import { serverApiFetch } from "./serverApi";

// Every /admin/** Server Component page calls this instead of duplicating
// the check inline. This is NOT auth verification itself — no JWT
// decoding, no secret, no DB lookup happens here. It just asks the backend
// (the only place that logic lives, see backend/src/middleware/requireAdmin.js)
// and redirects to /admin/login if the answer is no.
export async function requireAdminOrRedirect() {
  const res = await serverApiFetch("/api/admin/auth/me");
  if (!res.ok) {
    redirect("/admin/login");
  }
  const data = await res.json().catch(() => null);
  return data?.admin ?? null;
}
