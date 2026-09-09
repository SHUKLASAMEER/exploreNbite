# Explore N Bite — Production Deployment

This document covers what must be configured before running the API with
`NODE_ENV=production`. The server **fails fast at startup** (throws from
`src/config/env.js`) if a required production setting is missing or unsafe —
so a bad config never reaches serving traffic.

---

## 1. Required environment variables (production)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ always | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | ✅ always | ≥ 32 chars in production (enforced). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | ✅ | `production` |
| `FRONTEND_URL` | ✅ in prod | Exact public origin(s) of the Next.js site, comma-separated for apex + www. Must not be localhost. Used as the CORS allow-list — never wildcarded. |
| `PORT` | optional | default `4000` |
| `JWT_EXPIRES_IN` | optional | default `7d` |

### Cookies (session)

The `admin_session` cookie is **always `httpOnly`**. `SameSite` / `Secure` /
`Domain` are env-driven:

| Deployment topology | `COOKIE_SAMESITE` | `COOKIE_SECURE` | `COOKIE_DOMAIN` |
|---|---|---|---|
| Frontend + API on the **same registrable domain** (e.g. `explorenbite.com` + `api.explorenbite.com`) | `lax` (default) | `true` (default in prod) | `.explorenbite.com` |
| Frontend + API on **different domains** (cross-site) | `none` | `true` (**required**) | — |

`COOKIE_SECURE=false` is **rejected** in production. `COOKIE_SAMESITE=none`
without `COOKIE_SECURE=true` is rejected. HTTPS is required either way.

### Admin dev bypass

`ADMIN_DEV_BYPASS` — leave **unset** in production. It only ever activates
when `NODE_ENV=development`; a production start with it set to a truthy value
throws. There is no way to enable the no-login bypass in production.

---

## 2. Email (contact / work-with-me notifications)

Enquiries are **always saved to the database**. Email is a best-effort
notification on top — a delivery failure never fails the HTTP request, and
the API reports `emailed: true/false` honestly.

To enable delivery, set a generic SMTP transport (any provider that speaks
SMTP — no vendor SDK is used):

| Variable | Notes |
|---|---|
| `SMTP_HOST` | e.g. `smtp.sendgrid.net`, `email-smtp.eu-west-1.amazonaws.com`, `smtp.postmarkapp.com` |
| `SMTP_PORT` | `587` (STARTTLS, default) or `465` (implicit TLS) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587. Unset = derived from port. |
| `SMTP_USER` | optional — omit for IP-allow-listed relays |
| `SMTP_PASS` | optional — the API never logs this |
| `SMTP_FROM` | the `From:` address (e.g. `Explore N Bite <no-reply@explorenbite.com>`). Must be a domain/identity your provider has verified, or mail will be rejected/spam-foldered. |

If `SMTP_HOST` **or** `SMTP_FROM` is missing, delivery is disabled and the
old honest behaviour remains. Setting `SMTP_HOST` without `SMTP_FROM` is
rejected at startup.

The recipient is `Settings.contactEmail` (managed in the admin, not an env
var).

**Subscribers:** the newsletter form only stores addresses. There is no
campaign/broadcast system and the UI does not claim one — nothing to
configure here.

---

## 3. Media storage

Uploaded images are written to `backend/uploads/` on local disk and served
at `/uploads/*`. Container/PaaS filesystems are usually **ephemeral** — a
redeploy or restart would lose every uploaded image while the `Media` DB
rows keep pointing at gone files.

Pick **one** strategy; production won't start without one:

**A. Persistent mounted volume** (simplest)
- Mount durable storage at `backend/uploads` (Docker volume, Kubernetes PVC,
  Fly.io volume, Render disk, …).
- Set `MEDIA_STORAGE_ACK=persistent-volume` to confirm you've done this.
- Leave `ASSET_BASE_URL` unset — URLs stay root-relative and the frontend
  proxies `/uploads/*` to the API (`frontend/next.config.js`).

**B. Object storage / CDN**
- Put a bucket + CDN (S3+CloudFront, R2, Bucket, …) in front of the same
  files, or sync `backend/uploads` to it.
- Set `ASSET_BASE_URL=https://cdn.explorenbite.com` — new uploads are stored
  as absolute URLs against that origin. Existing root-relative URLs keep
  working through the frontend proxy.

Existing files and `Media` rows are **not migrated** by this app. If you move
to object storage, copy the current `backend/uploads/` contents into the
bucket once (the filenames are stable).

The `CLOUDINARY_*` vars in `.env.example` are an unused placeholder — there
is no Cloudinary integration.

---

## 4. Rate limiting

In-memory, per process. Limits (env-tunable, defaults shown):

| | Window | Max / IP | Env override |
|---|---|---|---|
| Login | 15 min | 10 | `RATE_LIMIT_LOGIN_MAX` |
| Public writes (contact, subscribe, comment) | 10 min | 20 | `RATE_LIMIT_PUBLIC_WRITE_MAX` |

Responses carry `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset`
and, on a 429, `Retry-After`.

⚠ **Single instance only.** Each process keeps its own counters. Before
running more than one backend instance behind a load balancer, move this to
a shared store (Redis) — otherwise a client gets N× the limit. Until then,
run one instance or use per-IP sticky routing.

---

## 5. Reverse proxy / TLS

- Terminate HTTPS at the proxy/load balancer.
- `trust proxy` is **not** enabled app-wide (deliberate — it's what keeps the
  admin dev bypass's Host check meaningful). The rate limiter already reads
  the left-most `X-Forwarded-For` entry for the client IP. If you need
  `req.ip` / `req.protocol` to reflect the proxy elsewhere, enable
  `app.set("trust proxy", 1)` in `src/app.js` **and** re-audit
  `middleware/requireAdmin.js`.
- Forward the `Cookie` and `Origin` headers unchanged.

---

## 6. Go-live checklist

- [ ] `DATABASE_URL` points at the production DB; `npx prisma migrate deploy` run.
- [ ] `JWT_SECRET` is a fresh ≥32-char random value (not the dev one).
- [ ] `NODE_ENV=production`, `FRONTEND_URL` = real HTTPS origin(s).
- [ ] `ADMIN_DEV_BYPASS` unset. Confirm: `GET /api/admin/auth/me` with no cookie → `401`.
- [ ] Cookie flags match topology (see §1). `COOKIE_SECURE=true`.
- [ ] A real admin exists (`prisma/seed.js` with a strong `SEED_ADMIN_PASSWORD`, or create manually). The dev seed admin is not usable without its password.
- [ ] Media: either `MEDIA_STORAGE_ACK=persistent-volume` + a mounted volume, or `ASSET_BASE_URL` + object storage.
- [ ] Email: `SMTP_*` set and the `From` identity verified with the provider — or accept `emailed:false` and rely on the admin Messages inbox.
- [ ] Frontend build has `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_SITE_URL` set to real HTTPS origins (the frontend build fails otherwise).
- [ ] `npm audit` reviewed (see the audit note in the hardening report).
- [ ] One backend instance, or Redis-backed rate limiting in place.
