# Arogya — Chronic Disease Management Platform

A production-grade multi-role web platform for continuous chronic disease management in India.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Zustand, TanStack Query v5, Recharts, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Auth**: JWT with refresh token rotation, RBAC (PATIENT / DOCTOR / ADMIN)
- **AI**: Google Gemini API (clinical decision support)
- **Offline**: IndexedDB via `idb` for offline vitals sync

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- A Google Gemini API key (optional — AI features degrade gracefully without it)

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd arogya/web
npm install          # installs root workspace deps
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and JWT_SECRET / JWT_REFRESH_SECRET
```

### 3. Database setup

```bash
cd server
npx prisma migrate dev --name init   # creates tables
npx prisma db seed                   # seeds demo data
```

### 4. Run development servers

```bash
# From project root
npm run dev
# → API server starts on http://localhost:3001
# → React client starts on http://localhost:5173
```

## Demo credentials (after seeding)

| Role    | Email                        | Password   |
|---------|------------------------------|------------|
| Patient | ravi.kumar@example.com       | Patient@123|
| Patient | sunita.patil@example.com     | Patient@123|
| Patient | amit.desai@example.com       | Patient@123|
| Patient | meena.joshi@example.com      | Patient@123|
| Patient | sanjay.more@example.com      | Patient@123|
| Doctor  | dr.sharma@arogya.health      | Doctor@123 |
| Admin   | admin@arogya.health          | Admin@123  |

## Project Structure

```
web/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Shared UI + layout components
│       ├── pages/           # Route-level pages (patient/, doctor/, admin/)
│       ├── hooks/           # Custom React hooks
│       ├── stores/          # Zustand stores (auth, sync)
│       ├── lib/             # API client, utils, offline queue
│       └── types/           # Shared TypeScript types
├── server/                  # Express API (TypeScript)
│   ├── src/
│   │   ├── routes/          # Express route handlers
│   │   ├── controllers/     # Request validation + delegation
│   │   ├── services/        # Business logic layer
│   │   ├── middleware/       # Auth, RBAC, error handler, rate limiter
│   │   └── lib/             # Prisma singleton, JWT utils, mailer, AI client
│   └── prisma/
│       ├── schema.prisma    # Full database schema
│       └── seed.ts          # Demo data seed script
└── shared/                  # Shared types (future)
```

## Key API Endpoints

| Method | Path                         | Auth       | Description                    |
|--------|------------------------------|------------|--------------------------------|
| POST   | /api/auth/register           | Public     | Patient self-registration      |
| POST   | /api/auth/login              | Public     | Get access + refresh tokens    |
| POST   | /api/auth/refresh            | Public     | Rotate refresh token           |
| GET    | /api/profile/me              | Any role   | Current user's profile         |
| POST   | /api/vitals                  | PATIENT    | Log single vital reading       |
| POST   | /api/vitals/batch            | PATIENT    | Sync offline queue             |
| GET    | /api/vitals/:patientId       | DOCTOR     | Patient's vitals (doctor view) |
| POST   | /api/ai/analyze-vitals       | DOCTOR     | AI vitals anomaly analysis     |
| POST   | /api/ai/soap-draft           | DOCTOR     | Generate SOAP note draft       |
| POST   | /api/ai/drug-interaction     | DOCTOR     | Check drug interactions        |
| GET    | /api/admin/stats             | ADMIN      | Platform statistics            |

## Offline Vitals Sync

Patient vitals are saved to IndexedDB immediately (optimistic UI). A sync status indicator
in the header shows pending count. Click "Sync" or wait for background sync on reconnect.
The batch endpoint (`POST /api/vitals/batch`) handles deduplication via `localId`.

## AI Features

All AI features require `GEMINI_API_KEY` in `.env`. Without it, AI endpoints return 503.
Get a free key at [aistudio.google.com](https://aistudio.google.com). The model used is
`gemini-2.5-flash`. AI-generated content (SOAP drafts, analysis) is always marked as draft —
doctors must review and confirm before saving to patient records.
