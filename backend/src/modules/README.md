# Modules

Each feature module (posts, categories, tags, pages, books, awards, comments,
subscribers, authors, menu, media, settings, auth) gets its own folder here,
following the `health` module's shape:

```
modules/<name>/
  <name>.routes.ts       Express router
  <name>.controller.ts   parses req, calls service, shapes response
  <name>.service.ts      business logic
  <name>.validation.ts   request body schema validation
```

Only `health/` is implemented as of Phase 2A. Feature modules are added in
Phase 2B/2C per the Phase 1.5 Decision & Architecture Lock Report.
