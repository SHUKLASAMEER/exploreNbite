import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

// Always succeeds, even if the cookie is already missing/expired/invalid —
// clearing a cookie that isn't there is a no-op, not an error. Reachable
// without a valid session on purpose (see proxy.js), so a client with a
// stale/expired token can still reliably clear it.
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
