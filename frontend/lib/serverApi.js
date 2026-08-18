import { headers } from "next/headers";
import { API_BASE_URL } from "./api";

// Server Components render on the server, so there's no browser to
// automatically attach the session cookie the way apiFetch()'s
// credentials: "include" relies on for client components. This forwards
// the incoming request's raw Cookie header verbatim to the backend, so the
// backend's own session verification (the only place that logic lives —
// see backend/src/middleware/requireAdmin.js) runs exactly as it would for
// a browser-originated request. No cookie name, JWT, or verification logic
// is read or duplicated here — just a pass-through header.
export async function serverApiFetch(path, options = {}) {
  const headerList = await headers();
  const cookie = headerList.get("cookie") ?? "";
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...(options.headers ?? {}), cookie },
    cache: "no-store",
  });
}
