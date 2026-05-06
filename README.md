# SpecialParent.in

> A warm, accessible digital home for Indian families, schools, therapists, and NGOs supporting children with special needs.

This is a **Phase 1 MVP** built end-to-end from the SpecialParent.in PRD:
- Full-stack TypeScript: **Next.js 15** (App Router) frontend + **NestJS 10** backend.
- **PostgreSQL** + **Prisma ORM** + **Redis** (cache/throttle).
- **JWT auth** with refresh-token rotation, RBAC, audit logging.
- **AI Guide** powered by OpenAI (gracefully falls back to a local mock if no API key).
- Calm, accessibility-first UI with soft palette, large touch targets, WCAG-aware focus rings.
- One-command Docker startup.

---

## Quick start (recommended — Docker)

```bash
# 1. Clone or unzip the project
cd specialparent

# 2. (Optional) Add your OpenAI key for real AI replies
cp .env.example .env
# edit .env and set OPENAI_API_KEY=sk-…

# 3. Boot everything (Postgres + Redis + API + Web)
docker compose up --build
```

That's it. Wait ~60 seconds for first build and migration, then visit:

| URL | What's there |
|---|---|
| http://localhost:3000 | The web app (landing + login + dashboard) |
| http://localhost:4000/api/docs | Swagger API docs |
| http://localhost:4000/api/health | Backend health check |

### Demo accounts (all use password `Demo1234!`)

- **`parent@specialparent.in`** — Priya Iyer, parent of Aanya (autism, age 6) and Arjun (ADHD, age 9)
- **`therapist@specialparent.in`** — Dr. Ananya Rao, speech therapist (sees their caseload)
- **`teacher@specialparent.in`** — Ms. Lakshmi Menon, special educator at Inclusive Wings School
- **`school@specialparent.in`** — Mr. Vikram Sharma, school admin (sees the school portal)
- **`admin@specialparent.in`** — Platform admin (sees all data)

Each role gets a tailored navigation and dashboard. The parent flow (signup → child profile → milestones, goals, therapy, mood logging, AAC board, AI guide) is the deepest path; therapist, school, and govt portals are credible Phase-1 slices.

---

## Local dev (without Docker)

You'll need **Node 20+**, **PostgreSQL 16+**, and **Redis** installed locally.

### 1. Backend

```bash
cd backend
cp .env.example .env             # then edit DATABASE_URL if needed
npm install
npx prisma migrate dev           # creates schema
npx prisma db seed               # loads demo data
npm run start:dev                # → http://localhost:4000
```

### 2. Frontend (in a second terminal)

```bash
cd web
cp .env.example .env             # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                      # → http://localhost:3000
```

---

## Architecture

```
specialparent/
├── backend/                    # NestJS 10 API
│   ├── src/
│   │   ├── auth/               # JWT + refresh rotation, bcrypt, guards
│   │   ├── users/              # /users/dashboard summary endpoint
│   │   ├── children/           # CRUD with caregiver-scoped access
│   │   ├── milestones/         # 7 development domains
│   │   ├── therapy/            # Sessions + AI summary on save
│   │   ├── appointments/       # Personal calendar
│   │   ├── goals/              # Outcome-focused goals w/ progress
│   │   ├── community/          # Posts + comments
│   │   ├── ai/                 # OpenAI chat (with mock fallback)
│   │   ├── notifications/      # Inbox
│   │   ├── resources/          # Public CMS-lite + govt schemes
│   │   ├── common/             # RBAC guard, audit interceptor, ChildAccess
│   │   ├── prisma/             # PrismaService (global)
│   │   ├── app.module.ts       # Wires it all + throttling
│   │   └── main.ts             # Helmet, CORS, validation, Swagger
│   ├── prisma/
│   │   ├── schema.prisma       # 18 models, 11 enums
│   │   └── seed.ts             # Demo accounts + content
│   └── Dockerfile
├── web/                        # Next.js 15 App Router
│   ├── app/
│   │   ├── page.tsx            # Public landing
│   │   ├── login/, signup/     # Auth flow
│   │   └── (app)/              # Authed shell — wraps the rest
│   │       ├── dashboard/
│   │       ├── children/[id]/  # Profile w/ milestones, goals, sessions, mood
│   │       ├── therapy/
│   │       ├── community/[id]/
│   │       ├── resources/[slug]/
│   │       ├── schemes/
│   │       └── ai/             # Chat UI
│   ├── components/             # AppShell, AuthProvider, AuthLayout
│   ├── lib/                    # api.ts (token rotation), utils
│   └── Dockerfile
├── docker-compose.yml          # Postgres + Redis + backend + web
└── README.md
```

### What's wired vs. what's scaffolded

| Module | Backend | Frontend | Notes |
|---|---|---|---|
| Auth (JWT + refresh) | ✅ | ✅ | Token rotation, bcrypt, RBAC guards |
| Parent dashboard | ✅ | ✅ | Aggregates 5 widgets in one round-trip |
| Children CRUD | ✅ | ✅ | Caregiver-scoped, primary-only delete |
| Milestones (7 domains) | ✅ | ✅ | Status + auto-timestamp on achieve |
| Therapy sessions | ✅ | ✅ | AI summary auto-generated on note save |
| Goals w/ progress | ✅ | ✅ | Range-slider UI |
| Mood tracking | ✅ (read) | ✅ | Write endpoint left for next sprint |
| Appointments | ✅ | — | API-only (UI pending) |
| Community (posts + comments) | ✅ | ✅ | |
| AI Guide | ✅ | ✅ | OpenAI w/ India-aware system prompt + mock fallback |
| Resources (CMS-lite) | ✅ | ✅ | Markdown-ish render |
| Government schemes | ✅ | ✅ | UDID, Niramaya, Samarth seeded |
| Notifications | ✅ | — | Counted in dashboard, list endpoint live |
| Audit log | ✅ | n/a | Auto on every mutating request |
| Health check | ✅ | n/a | DB ping |

---

## Beyond MVP — what the PRD covers but this build does NOT

The PRD is a multi-year vision. The following modules are **scaffolded in the schema** so they can be added cleanly, but not yet implemented:

- School portal + IEP management (PRD §4 Module 4)
- AAC communication boards (PRD §6 Module 6) — schema supports `communicationType` field
- Teletherapy / video calls (Module 8) — needs WebRTC stack (e.g., LiveKit, Daily.co)
- React Native mobile app (PRD §7 / §21)
- Multi-language UI (Hindi/Tamil/Telugu/etc.) — `Language` enum is in the schema; needs i18n catalogs
- Government workflow integrations (UDID, DigiLocker)
- Payments / subscriptions (PRD §16) — Razorpay / Stripe
- Predictive analytics dashboards (PRD §10 AI Analytics)

Each is a real engineering effort — typically 2–6 weeks per module for a small team.

---

## Security & compliance posture

What's already done:
- Passwords hashed with **bcrypt** (12 rounds)
- **JWT access + refresh** with one-time-use rotation, hashed at rest, IP/UA captured
- **Helmet** security headers, **CORS** allow-list, **rate limiting** (120/min, 30/min for AI)
- **Audit log** on every mutating request
- **Role-based access** (Parent / Therapist / Teacher / SchoolAdmin / Admin)
- Caregiver-scoped data: a parent only ever sees children they're linked to
- Therapists only see children they have an active session with
- Validation pipe with `forbidNonWhitelisted` to block parameter pollution

What's still pending for prod:
- Move tokens from `localStorage` to **httpOnly cookies**
- **Email verification** + password reset flow
- **MFA** (TOTP)
- **DPDP Act** consent records (consent log model is sketched but not wired)
- Field-level encryption for medications / diagnoses
- WAF + DDoS at the edge

---

## Useful commands

```bash
# Backend
cd backend
npm run start:dev           # dev with watch
npm run build               # production build
npx prisma studio           # GUI for Postgres
npx prisma migrate dev      # create new migration after schema edit
npm run prisma:seed         # reload demo data

# Web
cd web
npm run dev                 # dev
npm run build && npm start  # production
```

```bash
# Docker
docker compose up --build         # full stack
docker compose down -v            # tear down + delete volumes
docker compose logs -f backend    # tail backend logs
docker compose exec postgres psql -U specialparent  # psql shell
```

---

## License

This is a starting point built from the SpecialParent.in PRD. Use it freely for your project.
