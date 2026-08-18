# Explore N Bite — Backend

Node.js + Express API. All business logic — Prisma/MySQL access, JWT auth,
password hashing, request validation, error handling — lives here. The
`frontend/` app has none of this; it only calls this API over HTTP.

```
src/
  app.js            Express app: helmet, CORS, cookie-parser, JSON body
                     parsing, mounts routes, error handling
  server.js         entrypoint
  config/           env loading, Prisma client singleton
  routes/           Express routers — URL shape only, no logic
  controllers/      req/res translation only, calls into services/
  services/         business logic + Prisma calls, one per content type
  middleware/       requireAdmin (auth guard), centralized error handler
  utils/            errors, JWT/password/cookie helpers, slugify,
                     per-module input validation (utils/validation/)
prisma/
  schema.prisma, migrations/, seed.js
```

## Running

```bash
npm install
cp .env.example .env   # fill in real local values
npm run dev             # node --watch, restarts on file change
```

## Auth & cross-origin cookies

Login sets an httpOnly `admin_session` cookie (JWT). Every `/api/admin/*`
route except `auth/login` and `auth/logout` requires it (enforced by
`requireAdmin` mounted per-router in `routes/index.js` — a new module is
protected automatically just by being registered there).

Frontend and backend are separate origins (different ports in dev). Two
things make the cookie work across that boundary:

- **CORS**: `app.js` sets `cors({ origin: FRONTEND_URL, credentials: true })`
  — an explicit origin (not `*`) is required whenever `credentials: true`
  is used.
- **SameSite**: the cookie is `SameSite=Lax`. A cross-**origin** request
  (different port) is not automatically a cross-**site** request — the
  "site" a `SameSite` cookie cares about is the registrable domain, which
  ignores port. `localhost:3000` and `localhost:4000` share the same site
  ("localhost"), so `Lax` cookies are still attached to fetches between
  them as long as the client sends `credentials: "include"` (see
  `frontend/lib/api.js`). This stops working once frontend and backend are
  on genuinely different domains — revisit this (likely `SameSite=None` +
  `Secure`, which requires HTTPS) before any real deployment.

Server Components in the frontend have no browser to attach cookies for
them, so they forward the incoming request's raw `Cookie` header to this
API themselves (see `frontend/lib/serverApi.js`) rather than duplicating
any verification logic.
