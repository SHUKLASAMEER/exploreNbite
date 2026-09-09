// Base URL of the separate Express API (backend/). This file intentionally
// contains zero business logic — no auth, no validation, no DB access, all
// of which now live exclusively in backend/. It's just the shared "where
// is the API and how do I call it with credentials" plumbing every client
// component needs.
//
// In a production build the variable MUST be set to a real origin — falling
// back to (or pointing at) localhost there means every client fetch
// (comments, subscribe, contact, all admin forms, uploads) silently fails
// for real visitors. The localhost default is kept only for local dev.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
if (process.env.NODE_ENV === "production") {
  if (!rawApiUrl) {
    // Hard fail: a production build with no API origin is unusable.
    throw new Error("NEXT_PUBLIC_API_URL is required in production.");
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(rawApiUrl)) {
    // Warn, don't throw: `next build` always sets NODE_ENV=production, so a
    // developer verifying the build locally (with a localhost .env.local)
    // must not be blocked. A real deployment that ships this is screaming in
    // its build logs — and the backend separately refuses to start with a
    // localhost FRONTEND_URL.
    console.warn(
      "⚠  NEXT_PUBLIC_API_URL points at localhost in a production build — real visitors' requests will fail. Set it to the API's public origin before deploying."
    );
  }
}

// The localhost fallback is written so it is dead-code-eliminated from a
// production bundle: `process.env.NODE_ENV` is inlined at build time, so in a
// production build this is just `rawApiUrl ?? ""` and the literal below never
// reaches the client bundle. (Production also throws above if rawApiUrl is
// missing, so `""` is never actually reached.)
export const API_BASE_URL =
  rawApiUrl ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");

// credentials: "include" is required for a cross-origin fetch to send/receive
// the backend's session cookie — same-origin fetches don't need this, but
// frontend and backend are now different origins (different ports).
export function apiFetch(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, { ...options, credentials: "include" });
}
