# Components

Shared React components (public site UI, admin-reusable UI) go here per the
component inventory in the Phase 1.5 Decision & Architecture Lock Report,
Section 12.

`admin/` holds the CMS manager/form components built in Phases 2B–2G
(Categories, Posts, Pages, Books, Awards). They call the separate Express
API in `backend/` via `lib/api.js`'s `apiFetch()` — no business logic,
validation, or data access lives in this app; see `backend/README.md`.

`public/` holds the public-site UI built in Phase 3 Part 1 (Header, Footer)
— rendered by `app/(site)/layout.js`, kept separate from `admin/` and never
imported by it. These are Server Components that fetch Settings/Menu data
via `lib/publicApi.js` (GET `/api/settings`, GET `/api/menu` — the public,
unauthenticated counterparts of the `/admin/settings` and `/admin/menu`
routes the admin/ components above use); interactive pieces (the mobile
menu toggle) are split into a `*Client.js` Client Component sibling.

`Logo.js` is shared by both: the single source of truth for the Explore N
Bite logo image (`app/icon.jpeg`, which also doubles as the browser favicon
via Next's `icon` file convention).
