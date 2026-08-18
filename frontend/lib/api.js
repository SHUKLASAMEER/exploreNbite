// Base URL of the separate Express API (backend/). This file intentionally
// contains zero business logic — no auth, no validation, no DB access, all
// of which now live exclusively in backend/. It's just the shared "where
// is the API and how do I call it with credentials" plumbing every client
// component needs.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// credentials: "include" is required for a cross-origin fetch to send/receive
// the backend's session cookie — same-origin fetches don't need this, but
// frontend and backend are now different origins (different ports).
export function apiFetch(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, { ...options, credentials: "include" });
}
