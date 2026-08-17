# Auth foundation

What exists now (Phase 2A.1 — architecture migration):

- `jwt.js` — `signAdminToken(payload)` / `verifyAdminToken(token)`, generic JWT helpers built on `JWT_SECRET`.
- `password.js` — `hashPassword(plain)` / `comparePassword(plain, hash)`, bcrypt helpers.

Neither is wired to a route yet. No login UI, no admin API, no session cookie
handling exists as of this phase.

## Planned strategy (Phase 2B)

- `POST /app/api/admin/auth/login/route.js` verifies email + password via
  `comparePassword`, then issues a JWT via `signAdminToken` and sets it as an
  httpOnly, secure, `SameSite=Lax` cookie (e.g. `admin_session`).
- A root-level `middleware.js` (Next.js Middleware) matches `/admin/:path*`
  and `/api/admin/:path*`, reads that cookie, calls `verifyAdminToken`, and
  either lets the request through, redirects to `/admin/login` (page routes),
  or returns a 401 JSON response (API routes) when the token is missing or
  invalid.
- Individual `app/api/admin/**/route.js` handlers can additionally re-check
  the token themselves (defense in depth) using the same `verifyAdminToken`
  helper — no separate auth logic needs to be written per route.

This file documents the plan; the middleware and login route themselves are
Phase 2B work, not part of this migration.
