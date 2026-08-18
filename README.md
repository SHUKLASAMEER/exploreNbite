# Explore N Bite

Two separate applications:

```
explorenbite/
├── frontend/   Next.js (App Router, JavaScript). UI only — pages,
│               components, and frontend-specific utilities. No database
│               access, auth verification, or validation lives here; it
│               talks to backend/ over HTTP.
│
├── backend/    Node.js + Express (JavaScript) API. All business logic:
│               Prisma/MySQL, JWT auth, bcrypt, request validation, error
│               handling. Owns prisma/ (schema + migrations + seed).
│
└── README.md
```

## Running locally

Two terminals, both apps run independently:

```bash
cd backend && npm install && npm run dev     # http://localhost:4000
cd frontend && npm install && npm run dev    # http://localhost:3000
```

Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` →
`frontend/.env.local` first and fill in real local values (see each file's
comments). Never commit the real `.env`/`.env.local` files.

The frontend calls the backend via `NEXT_PUBLIC_API_URL` (see
`frontend/lib/api.js`); the backend allows that origin via CORS (see
`backend/.env`'s `FRONTEND_URL`). Both must point at each other correctly
or admin login/API calls will fail with a CORS or connection error.

## Database

Prisma schema, migrations, and the dev seed script live in
`backend/prisma/`. Run Prisma commands from `backend/`:

```bash
cd backend
npx prisma migrate status
npx prisma generate
npm run seed
```

## Status

Admin CMS modules implemented so far: Authentication, Categories, Posts,
Pages, Books, Awards/Mentions. Public website, Comments, Subscribers, and
Media/Cloudinary upload are not built yet.
