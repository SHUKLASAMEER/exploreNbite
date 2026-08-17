import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

// Next.js 16 renamed middleware.js -> proxy.js (same capabilities, clearer
// name; middleware.js is deprecated). Proxy defaults to the Node.js runtime
// in this version, so the jsonwebtoken-based verifyAdminToken() below runs
// here without any Edge-runtime restrictions.
//
// Auth strategy for /api/admin/*: every route under here is protected by
// default *except* the two paths explicitly listed below. New admin API
// routes therefore inherit protection automatically just by living under
// /api/admin/ — nothing extra to remember per route. Each protected route
// handler (see app/api/admin/auth/me/route.js) still re-checks the session
// itself; Proxy is the first line of defense, not the only one, per
// Next.js's own guidance against relying on Proxy alone.

const PUBLIC_ADMIN_API_PATHS = new Set(["/api/admin/auth/login", "/api/admin/auth/logout"]);

function isAdminPagePath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = isAdminPagePath(pathname) && pathname !== "/admin/login";
  const isProtectedApi = isAdminApiPath(pathname) && !PUBLIC_ADMIN_API_PATHS.has(pathname);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? verifyAdminToken(token) : null;

  if (!payload?.adminId) {
    if (isProtectedApi) {
      return NextResponse.json(
        { error: { message: "Authentication required.", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
