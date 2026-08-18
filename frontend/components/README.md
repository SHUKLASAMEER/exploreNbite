# Components

Shared React components (public site UI, admin-reusable UI) go here per the
component inventory in the Phase 1.5 Decision & Architecture Lock Report,
Section 12.

`admin/` holds the CMS manager/form components built in Phases 2B–2G
(Categories, Posts, Pages, Books, Awards). They call the separate Express
API in `backend/` via `lib/api.js`'s `apiFetch()` — no business logic,
validation, or data access lives in this app; see `backend/README.md`.

No public site UI has been built yet.
