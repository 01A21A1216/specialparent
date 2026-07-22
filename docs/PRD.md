# SpecialParent.in — Product Requirements Document

**Version**: 1.0 (initial PRD, derived from the shipped Phase-1 platform)
**Last updated**: 2026-07-22
**Status**: Living document — this PRD describes what is actually built today and captures the intent behind each decision. Roadmap items are called out explicitly.

---

## 1. Executive summary

SpecialParent.in is a full-stack platform for Indian families of children with special needs (autism, ADHD, learning differences, speech delays, sensory-processing differences, and related conditions). It gives families a single, gentle home for tracking their child's development, coordinating with the professionals in their care circle, running the paperwork that Indian special-needs care demands (IEPs, RPWD-Act documentation, government schemes), and making informed decisions about therapies and interventions.

The platform is built for four principal user types — **parents/caregivers**, **therapists/doctors**, **teachers/special educators/school admins**, and **platform admins** — each with a distinct navigation, workflow, and view of the same underlying data.

Phase 1 shipped: core child profile, therapy tracking, IEP with multi-party approval workflow, school-side dashboard, care-team collaboration (invites + messaging), family document vault, insights, an AI guide, a calming-music player, a wellness directory, an evidence-tiered treatments research library, voice notes with transcription, a PWA install path, and India-specific compliance work (DPDP export/delete, RPWD-Act-aware content). Payments are the only major track deferred to Phase 2.

---

## 2. Problem statement and context

Families of neurodivergent children in India navigate a fragmented care landscape:
- **Records are scattered** across WhatsApp threads, therapist paper files, hospital PDFs, and school notebooks. The parent is the only integrator.
- **The care team doesn't talk to itself.** Therapists, doctors, and special educators rarely share notes; the parent re-explains context every visit.
- **Legal and policy tools are underused.** The Rights of Persons with Disabilities Act 2016 grants meaningful accommodations, but most families don't know what to ask for or how. Schemes like Niramaya and UDID are similarly under-claimed.
- **Wellness and treatment information is a marketing minefield.** Unproven therapies (stem cell for autism, chelation, aggressive biomedical protocols) are actively sold to desperate families at ₹5–15 lakh a course. Families cannot easily tell what has evidence and what does not.
- **Caregiver burnout is invisible.** The parent's own wellbeing is the load-bearing element for the child's outcome and it goes unattended.

SpecialParent.in exists to compress this problem: one place for the records, one care team that can see them, tools calibrated to Indian law and Indian language, and honest editorial standards for anything the platform recommends.

---

## 3. Target users and personas

### 3.1 Primary: Parent / Caregiver (`Role.PARENT`)
A mother or father in urban or semi-urban India, aged 28–48, English-comfortable with some Hindi/regional language use. Their child has an active diagnosis (autism, ADHD, learning disability, cerebral palsy, Down syndrome, speech/language disorder, or a suspected developmental delay under assessment). They already juggle therapy appointments, school communication, government-scheme paperwork, and the emotional weight of caregiving. They pay for the platform for themselves (parent-payer motion). Secondary caregivers (spouse, grandparent, nanny) can be invited without paying separately.

### 3.2 Therapist / Doctor (`Role.THERAPIST`, `Role.DOCTOR`)
An RCI-registered occupational therapist, speech-language pathologist, clinical psychologist, developmental paediatrician, or child psychiatrist. They see 15–40 children on their caseload. They need to log session notes fast, keep families in the loop, and see the child's history when they walk in — mood, behaviour events, IEP goals in progress.

### 3.3 Teacher, Special educator, School admin (`Role.TEACHER`, `Role.SPECIAL_EDUCATOR`, `Role.SCHOOL_ADMIN`)
Someone at the child's school — an inclusive-education coordinator, a resource-room teacher, or a school admin — who needs to see the IEP, sign off on it as a school representative, and stay in touch with the parent and therapy team.

### 3.4 Platform admin (`Role.ADMIN`)
Internal role: moderates community posts, updates the resources CMS and government-scheme directory, adds/edits wellness and treatment-research entries, manages users, and reads the audit trail.

### 3.5 Anonymous visitor
A parent researching whether to sign up. Can read the marketing pages (`/`, `/autism`, `/platform`, `/security`), browse the wellness directory (`/wellness`), browse the treatments research library (`/research`), read published resources (`/resources`), and view government schemes (`/schemes`) — all without an account. Public read routes are deliberate: this content is a public good.

---

## 4. Product principles

These are decision rules, not slogans. They have shaped what the platform includes and excludes.

1. **Editorial honesty over engagement.** The treatments library labels experimental and not-recommended therapies as such. Wellness listings are a directory, not a booking funnel with commission incentives. We do not tell parents what to do; we surface what the evidence says and route the decision back to their treating team.
2. **India-first.** Regulatory context (CDSCO for drugs, ICMR for clinical protocols, AYUSH for traditional systems, RPWD Act for entitlements, DPDP Act for data protection) is present in the content and the code. Prices are in rupees. Languages are Indian. Schools follow Indian boards.
3. **The child's care team is many people.** Every feature is designed to be shared: caregivers can be invited, IEPs need multi-party sign-off, therapists see the mood history the parent logged, school admins do not automatically get access to children at their school without an invite.
4. **Assume caregivers are exhausted.** No dark patterns, no upsells during grief-adjacent moments, no shame framing, no fake urgency. The empty states, error messages, and prompts are all written to be received on a bad day.
5. **Data is the family's, not ours.** Full DPDP-compliant export and account deletion are shipped, not future-work. Redaction is in the logger. Voice audio is access-controlled per-record.
6. **What breaks is our problem to see.** Structured logging, correlation IDs surfaced to the user on any 5xx, Sentry on both sides, health checks with dependency probes, nightly Postgres backups. Ops is not deferred.
7. **Ship the safety net before the feature.** Before a page can be observable, it needs an empty state, an error state, and a loading state. Before an endpoint can be authenticated, it needs access checks in the service layer, not just the guard.

### Explicit non-goals
- **We do not diagnose.** No screener promises a diagnosis; the AI guide explicitly refuses.
- **We do not book therapies with commissions.** The wellness directory is contact-info; the parent pays the provider directly.
- **We do not sell unproven cures.** The treatments library reports what the evidence shows for stem cell therapy, chelation, homeopathy for core symptoms, and similar; we will not carry advertising for them.
- **We are not a telehealth product yet.** No video calling in Phase 1. Messages are async text only.
- **We are not a school-management system.** School admins get a caregiver-scoped view — they see the children they've been invited to, not every child at their school.

---

## 5. Product surface — features by journey

Everything below is shipped and running (see §12 for the roadmap). Route notes refer to the Next.js App Router structure under `web/app/`.

### 5.1 Onboarding
- **Signup** (`/signup`) — email, password, full name, role (defaults to PARENT). Creates the account, sends a verification email if `SMTP_URL` is configured, and drops the user on `/dashboard`.
- **Email verification** — an unverified banner sits above every authenticated page (`AppShell`) with a Resend button; the banner disappears when verified.
- **Password recovery** — `/forgot-password` always returns 200 to prevent account enumeration; token lands via email; `/reset-password?token=…` completes the flow. Tokens are SHA-256 hashed in the DB and single-use.
- **Care-team invite acceptance** — `/invite/[token]` is the entry point for a spouse, grandparent, nanny, or therapist who was invited to a child. Public lookup (name, role, expiry) → authenticated accept.

### 5.2 Parent home
- **Dashboard** (`/dashboard`) — role-aware summary: children, next appointments and sessions, recent mood pattern, unread notifications, AI recommendation tile. Backed by a single aggregated `/api/users/dashboard` endpoint that returns everything the shell needs in one call.
- **Children list** (`/children`) — roster of the parent's children, each with quick access to the profile.

### 5.3 Child profile
`/children/[id]` opens a tabbed profile with:
- **Basics** — diagnoses, allergies, medications, sensory triggers, calming strategies, hobbies, communication type. Every field is optional and every field is used elsewhere in the platform (e.g., the Emergency page reads allergies + medications + emergency contact).
- **Milestones** — logged by domain (COMMUNICATION, SOCIAL, EMOTIONAL, MOTOR, COGNITIVE, DAILY_LIVING, SENSORY). Status lifecycle includes `REGRESSED`, which is deliberate: regression is real and needs to be visible in the record, not silently overwritten.
- **Moods** — daily 5-point mood with optional note. Supports voice-note capture (see §5.11). Whisper transcription pre-fills the note when it succeeds; audio always saves, transcription is best-effort.
- **Behaviour events** — free-form log of triggers, meltdowns, sleep issues, food refusals, routine disruptions. Fields include severity, duration in minutes, trigger, and what helped.
- **Reports** — clinical uploads (diagnostic assessments, medical letters). Signed download URLs when using Cloudinary.
- **Siblings** — symmetric sibling links via a shared `SiblingGroup`. Adding a link on either child creates the bidirectional relationship.
- **Care team** — the caregivers and therapists with access, plus the invite creation form.

### 5.4 Therapy
- **Sessions** (`/therapy`) — list for both parents (their child's sessions) and therapists (their authored sessions). Therapists write session notes; the platform generates an AI summary when a session is marked complete, and the summary is editable.
- **IEP goal linking** — each session carries `iepGoalIds[]` (a loose FK-free array) so a therapist can tag which IEP goals were addressed. The IEP goal detail then surfaces the linked sessions as evidence of progress.
- **Appointments** (`/appointments`) — general calendar (therapy, doctor, school meeting, assessment) with reminder timestamps.
- **Voice notes on sessions** — same MediaRecorder + Whisper flow as moods.

### 5.5 IEP (Individualized Education Program)
The IEP is the load-bearing artifact of Indian special-needs care. It documents a child's current level of performance, annual goals, accommodations, and related services. The platform ships the full lifecycle:
- **Draft** (`/ieps` list, edit) — parent, therapist, or special educator drafts the IEP.
- **Submit for review** — moves state to `PENDING_REVIEW`; approval slots for the care team appear.
- **Multi-party approval** — signatures collected from the care team. Rule (`backend/src/iep/iep.module.ts:485-500`): at least one PARENT signature and one professional signature (THERAPIST / SPECIAL_EDUCATOR / DOCTOR / SCHOOL_ADMIN) automatically transitions the IEP to `ACTIVE`. The role at the time of signing is snapshotted on the approval row — later role changes do not invalidate a past signature.
- **Retract / revoke approval** — either author or approver can back out before activation.
- **Carryover** — when a new IEP is created, individual goals from the previous IEP can be carried over; the new goal keeps a `carriedOverFromId` back-reference so the history is preserved.
- **Reviews** — meeting log with participant names; the IEP is expected to be revisited quarterly.
- **Printable snapshot** (`/ieps/[id]/print`) — clean, non-navigation view designed for A4 printing, since Indian schools still often want a paper file.

### 5.6 School surface
Teachers, special educators, and school admins see a different top-level navigation:
- **Students & IEPs** (`/school`) — roster of the children they caregiver, grouped by school. Each child shows the count of active and pending IEPs; a personal signature inbox pulls out any IEPs awaiting the current user's signature.
- **The access rule is preserved.** A SCHOOL_ADMIN does not automatically see every child at their school — they see the children they have been invited to (via `Caregiver` link). This is deliberate: joining a school does not grant clinical data access; being invited to a child does.

### 5.7 Care-team collaboration
- **Care-team invites** — the parent can invite a spouse, grandparent, therapist, or special educator to a specific child. Token-based, expiring, revocable. Expected role and relationship label are set when the invite is created; the token is single-use.
- **Messages** (`/messages`) — 1:1 async text threads scoped to a shared child. Unread count badge in the sidebar polls every 30 seconds. Threads are participant-locked in the service layer (`assertMember`).
- **Notifications** (`/notifications`) — in-app inbox with kind-tagged rows and optional deep links.

### 5.8 Insights
`/insights` — aggregated analytics per child: mood buckets, session attendance, milestone velocity, behavior kind breakdown, average goal progress, and delta vs the previous window. Backed by `/api/insights/children/:childId`. The intent is patterns, not judgment — the delta is presented alongside plain-English framing.

### 5.9 Family document vault
`/documents` — a place for the paperwork that Indian families accumulate: UDID card, disability certificate, Niramaya insurance, medical reports, school reports, IEP snapshots, identity documents. Each row can carry an `expiresAt` date to power renewal reminders. Storage is Cloudinary in prod (signed URLs, 5-minute expiry) and local disk in dev.

### 5.10 Content surfaces
- **Resources** (`/resources`, `/resources/[slug]`) — markdown-authored educational content (early signs of autism, home therapy activities, RPWD Act rights, sensory activities, sleep strategies, therapy-type explainers). Curated by admins; multiple languages allowed via the `Language` enum.
- **Government schemes** (`/schemes`) — Niramaya, UDID, national scholarships. State filtering built in.
- **Wellness directory** (`/wellness`) — curated yoga, music, art, painting, parent counselling, parent training, and meditation offerings. 15 entries at launch spanning all categories and all audiences (child, parent, family). Filter chips for category, audience, format (online / in-person / hybrid). Cards show provider, description, cost hint, schedule, languages, and a direct contact link — the parent transacts with the provider, not with us.
- **Treatments research library** (`/research`) — the platform's most editorially-loaded surface. 20 entries across seven treatment systems (allopathic, Ayurveda, homeopathy, nutritional, biomedical, cellular, mind-body). Every entry carries an evidence tier from `STANDARD_OF_CARE` down to `NOT_RECOMMENDED`. Entries include: what the treatment is, what the research shows, safety considerations, India regulatory context (CDSCO, ICMR, AYUSH), and references to primary sources. Warning-tier entries (Experimental, Not recommended) get coloured borders and coral emphasis so a skimming parent cannot miss them. Covered honestly: stem cell therapy, exosome therapy, chelation, HBOT, Nemechek Protocol, homeopathy for core symptoms, heavy-metal safety alert for OTC Ayurvedic products.

### 5.11 Voice notes
Attached to both mood entries and therapy sessions. Recorded via browser `MediaRecorder` with a codec fallback chain (Opus WebM → MP4 → OGG), a 3-minute hard cap, and cleanup on component unmount. Uploaded via multipart form with the duration in seconds. Server calls OpenAI Whisper when `OPENAI_API_KEY` is set; transcription is fail-open (audio always saves). Access is enforced at record load: the requester must be the owner or a caregiver of the linked child. Streaming honours the storage backend — local disk streams the file, Cloudinary redirects to a signed URL.

### 5.12 AI Guide
`/ai` — chat with a conversational assistant grounded in the child's profile. `/api/ai/chat` accepts a message and returns a response; message history is persisted per user. `/api/ai/recommendations?childId=` produces a short list of context-aware suggestions used in the dashboard tile. The AI never diagnoses; it recommends professional consultation for anything clinical.

### 5.13 Communication support
- **AAC** (`/aac`) — a picture-based augmentative-and-alternative-communication board for non-speaking or minimally-speaking children.
- **AAC fullscreen** (`/aac/fullscreen`) — same board without the app chrome, exposed as a PWA shortcut so the child can go straight to it from the home screen.

### 5.14 Emergency
`/emergency` — quick-access page with the child's allergies, medications, sensory triggers, calming strategies, and emergency contact. Designed to be handed to a first responder or a caretaker on a hard day. Exposed as a PWA shortcut so it's one tap from the phone home screen.

### 5.15 Daily routine
Per-child visual schedule with time-of-day cards, day-of-week masking, emoji icons, and category tags. Preset templates ship: school day, weekend, therapy day, toddler basics. A calming music library (20 tracks, all synthesised via the Web Audio API — no external streaming, no licensing, no ads, no autoplay-next-video into unrelated content) is embedded for use during transitions.

### 5.16 Community
`/community`, `/community/[id]` — parent-forum with categories (general, success story, question, resource, regional). Comments, pinned posts, admin moderation. Deliberately understated to keep the platform's centre of gravity on care coordination rather than social media.

### 5.17 Privacy and account controls
`/profile` — account settings, password change.
Under the hood:
- **DPDP export** (`/api/privacy/export`) — the user's complete data footprint as JSON: profile, caregiver links, moods/behavior/session notes authored, community posts, AI history, notifications, audit trail. Child clinical data is included only when the requester is the primary caregiver.
- **DPDP account deletion** (`DELETE /api/privacy/account`) — password re-entry and the spoken phrase `"delete my account"` required. Auth cookies cleared. This is destructive; the confirmation friction is intentional.

### 5.18 Admin surfaces
- `/admin` — overview stats.
- `/admin/users` — role and active-status management. Self-demote and self-deactivate are blocked.
- `/admin/moderation` — community post moderation (view + delete).
- `/admin/cms` — resources and schemes editor.

Wellness and Treatments entries are admin-editable via `POST/PATCH/DELETE /api/wellness/:id` and `POST/PATCH/DELETE /api/research/:id` (both ADMIN-only). A dedicated CMS surface for these is on the roadmap; today they seed idempotently from `wellness.seed.ts` and `research.seed.ts` and can be edited over the API.

---

## 6. Data model

Postgres via Prisma 5. Every model uses cuid IDs. Full schema at `backend/prisma/schema.prisma`. Notable design choices below.

### 6.1 Entities grouped by concern
- **Auth**: `User`, `RefreshToken`, `AuthToken`, `TherapistProfile`.
- **Children and care team**: `Child`, `Caregiver`, `ChildInvite`, `SiblingGroup`, `School`.
- **Development tracking**: `Milestone`, `MoodEntry`, `BehaviorEvent`, `Goal`.
- **Therapy and calendar**: `TherapySession`, `Appointment`.
- **IEP**: `Iep`, `IepGoal`, `IepReview`, `IepApproval`.
- **Community and AI**: `CommunityPost`, `CommunityComment`, `AiMessage`.
- **Messaging**: `MessageThread`, `Message`.
- **Content**: `Resource`, `GovernmentScheme`, `WellnessOffering`, `TreatmentResearch`.
- **Routine and wellness**: `RoutineStep`.
- **Documents and privacy**: `DiagnosticReport`, `FamilyDocument`, `VoiceNote`.
- **Ops**: `Notification`, `AuditLog`.

### 6.2 Load-bearing enums
- `Role` — 7 roles (`PARENT`, `THERAPIST`, `DOCTOR`, `TEACHER`, `SPECIAL_EDUCATOR`, `SCHOOL_ADMIN`, `ADMIN`).
- `Language` — 9 Indian languages (EN, HI, TE, TA, KN, ML, BN, MR, GU). Stored on `User.preferredLanguage`, `Resource.language`, `GovernmentScheme.language`. Reserved for i18n rollout.
- `EvidenceLevel` — 5 tiers on `TreatmentResearch`. This is the field the treatments UI reads to decide chip colour, border weight, and text emphasis.
- `IepStatus` — `DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `ARCHIVED`. The state machine is enforced in the service layer.

### 6.3 Deliberate design decisions
- **`Milestone.status` includes `REGRESSED`.** Regression is a real, documented pattern in autism and needs to be legible in the record.
- **`IepGoal.carriedOverFromId` is self-referential.** New year's IEP goals can point back to their predecessor for progress lineage.
- **`TherapySession.iepGoalIds` is a loose `String[]`, not a join table.** The linkage is advisory (a session touched these goals) rather than structural; a lightweight array keeps the write path simple.
- **`MessageThread` uses lexicographic participant ordering + a unique index.** Two users have exactly one thread between them per child scope; the ordering rule prevents duplicate threads from race conditions.
- **`Caregiver` has a `isPrimary` boolean, not a role.** The primary caregiver is the one whose account is treated as authoritative for privacy exports and destructive actions.
- **`AuthToken` unifies password-reset and email-verification.** Same table, `type` enum, same SHA-256 hashing rule, same single-use `usedAt` sentinel.

---

## 7. Roles and access control

### 7.1 Guard layers
1. **Global `ThrottlerGuard`** — 120 req/min default, 30/min for AI endpoints, 10/min for auth. Per-endpoint tighter throttles on signup, forgot-password.
2. **`JwtAuthGuard`** — extracts the JWT from the `sp_access` httpOnly cookie or the `Authorization: Bearer` header (fallback for Swagger and curl). Standard NestJS Passport-JWT strategy.
3. **`AdminGuard`** — role === `ADMIN` check, layered on top of `JwtAuthGuard` for admin controllers.
4. **Service-layer access checks** — the single most important layer. `ChildAccess.assertCaregiver(userId, role, childId)` is called from every service that reads or writes child-scoped data. Rule: `ADMIN` bypasses; otherwise there must be a `Caregiver` row for that user and child. `THERAPIST` role gets access via any `TherapySession` they lead — the therapist does not need a caregiver row.

### 7.2 Access matrix (summary)
| Resource | Parent | Therapist | School admin | Platform admin |
|---|---|---|---|---|
| Own child profile | Full | Read (if session or invited) | Read (if invited) | Full |
| Child of another family | None | Read (if invited) | Read (if invited) | Full |
| IEP for a child | Read/write (draft), sign as parent | Read/write, sign as professional | Read/write, sign as professional | Full |
| Wellness / Treatments library | Read | Read | Read | Full CRUD |
| Community | Read/post/comment | Read/post/comment | Read/post/comment | Delete any post/comment |
| Own account | Full including export/delete | Full including export/delete | Full including export/delete | Full |
| Other users' accounts | None | None | None | Role + active management |
| Audit log | None | None | None | Read |

### 7.3 Authentication
- **JWT access + refresh tokens**. Access 15 min, refresh 7 days (both configurable).
- **httpOnly cookies** — `sp_access`, `sp_refresh`. `sameSite: 'lax'`, `secure` in production, `path: /api`. The frontend cannot read them; XSS cannot exfiltrate them.
- **Refresh rotation** on every `/auth/refresh` call. Logout revokes the current refresh token; changing password revokes all other sessions.
- **Password hashing** with bcrypt.

---

## 8. Technical architecture

### 8.1 Stack
- **Frontend**: Next.js 15 (App Router) + React 19 RC + TypeScript. `output: 'standalone'` for lean Docker images. SWR for data fetching. Tailwind CSS with a small custom palette (sage/coral/cream/mist).
- **Backend**: NestJS 10 + TypeScript. Passport-JWT for auth. class-validator for DTOs. Prisma 5 for ORM. Swagger via `@nestjs/swagger` at `/api/docs` (non-prod only).
- **Database**: PostgreSQL 16.
- **Cache**: Redis 7 (session store, rate-limit counters, misc caching via `RedisCacheService`).
- **File storage**: Cloudinary (feature-flagged) with a local-disk fallback for dev. Both go through a common `StorageService`.
- **AI**: OpenAI-compatible LLM API for chat + recommendations; Whisper for transcription. Feature-flagged on `OPENAI_API_KEY` — nothing crashes without it.
- **Observability**: Sentry (backend + frontend, both feature-flagged); pino structured logs with redaction of secrets; correlation IDs surfaced to the client on 5xx.
- **Container runtime**: Docker + docker-compose. Prod overlay in `docker-compose.prod.yml` with strict required-env, no host port publishing for DB/Redis, log rotation, and a nightly Postgres backup sidecar.

### 8.2 App bootstrap (backend/src/main.ts)
Order matters and is documented in code: `initSentry()` before Nest so early errors are captured → `NestFactory.create({ bufferLogs })` → `useLogger(PinoLogger)` → `helmet` with a strict CSP → `cookieParser` → CORS with `credentials: true` → global `/api` prefix → global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` → Swagger (dev only) → listen.

### 8.3 Cross-cutting concerns
- **Global exception filter** — maps HttpException, Prisma known errors (P2002 → 409, P2025 → 404, P2003 → 400), Prisma validation errors → 400, everything else → generic 500 with a `correlationId` echoed to the client. The ID appears in logs so a user report grep-s directly to the trace.
- **Audit interceptor** — writes an `AuditLog` row on every mutating request (action, entityType, entityId, JSON metadata, IP). Used for compliance and for admin visibility.
- **Rate limiting** — `ThrottlerGuard` global, three named buckets: `default` (120/min), `ai` (30/min), `auth` (10/min).
- **Logging redaction** — pino redacts `req.headers.authorization`, `req.headers.cookie`, all password fields, refresh tokens, and any `passwordHash` / `tokenHash` that slips into a log payload.

### 8.4 Data flow patterns
- **Auth**: browser → Next.js API route → NestJS `/api/auth/login` → sets `sp_access` + `sp_refresh` httpOnly cookies → subsequent XHR from the SPA sends cookies with `credentials: 'include'` → passport-jwt reads cookie or bearer.
- **Child-scoped read**: SPA calls `/api/children/:id` → JwtAuthGuard → controller passes `user.id, user.role, childId` to service → service calls `ChildAccess.assertCaregiver` → Prisma query returns explicit `select`-listed fields (allowlist so a schema drift never leaks new fields).
- **Voice note upload**: MediaRecorder blob → `FormData` POST → `FileInterceptor` in Nest → `StorageService.upload` (disk or Cloudinary) → fire-and-forget Whisper transcription that patches the row when it lands.

### 8.5 Frontend architecture
- **Route groups**: `/` (marketing + auth) and `/(app)` (authenticated shell with sidebar navigation).
- **AppShell** — sidebar navigation, role-aware nav items, unread-message badge polling, unverified-email banner, mobile hamburger. Same shell for parent/therapist/school-admin/admin, different `NAV_*` array per role.
- **Auth provider** — React context (`useAuth`), reads `/api/auth/me` on mount, exposes `login/signup/logout/refresh`. `loading` flag gates initial-render CTAs to avoid flicker.
- **API state pattern** — `ApiState` wrapper standardises loading/empty/error/retry across pages; every data-driven page uses it.
- **SWR** — data fetching with credentials, standard revalidation.

### 8.6 Deployment
Two-file compose (`docker-compose.yml` + `docker-compose.prod.yml` overlay):
- **Dev**: hardcoded dev credentials, ports exposed, `prisma db push --accept-data-loss` on boot, dev seed runs.
- **Prod**: `${VAR:?required}` guards refuse to start without every secret. DB/Redis not exposed to host. `prisma migrate deploy` (no data-loss flag, no seed). JSON-file log rotation. Nightly Postgres backup sidecar writing gzipped pg_dump to `./ops/backup` with configurable retention (default 30 days).

### 8.7 CI (`.github/workflows/ci.yml`)
- **backend** job — real Postgres service container, `npm ci`, prisma generate + db push, tsc noEmit, jest.
- **web** job — `npm ci --legacy-peer-deps` (React 19 RC + Next 15 peer-dep mismatch is a known upstream issue), tsc noEmit, next build.
- **docker** job — main-branch only, builds both images with buildx + GHA cache. No push (intentional; wire to a registry when a real deploy target exists).
- Concurrency group cancels in-flight runs on rebase.

---

## 9. Non-functional requirements

### 9.1 Security
- All secrets validated at boot (class-validator schema on `process.env`). Startup fails if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is under 32 chars or matches the known dev placeholder.
- Helmet with strict CSP in production: `default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, HSTS 180d preload.
- httpOnly cookies for JWTs; CSRF surface reduced by same-site: lax.
- SQL injection: Prisma parameterises everything.
- XSS: React auto-escapes; no `dangerouslySetInnerHTML` in user-facing flows.
- Rate limiting on auth endpoints to slow credential stuffing.
- Password reset and email verification tokens SHA-256 hashed at rest, single-use.
- File uploads scoped by MIME allowlist and size cap.

### 9.2 Privacy and DPDP compliance
- **Data portability**: `GET /api/privacy/export` returns the user's full data footprint as JSON.
- **Right to erasure**: `DELETE /api/privacy/account` with password + typed confirmation.
- **Purpose limitation**: only necessary fields are collected; every child-clinical field is optional.
- **Logging redaction**: no password, cookie, or authorization header ever hits logs.
- **Voice audio access control**: streaming endpoint checks owner-or-linked-child-caregiver before returning the blob.
- **Sentry `beforeSend`**: cookies and auth headers stripped from every event on both backend and frontend.

### 9.3 RPWD-Act awareness
- Resource content explains the RPWD Act 2016 rights and disability certificate flow.
- Government scheme directory carries Niramaya, UDID, and scholarship programs.
- IEP module is designed around the accommodations and services vocabulary that RPWD-Act-compliant schools should be following.

### 9.4 Medical content standards
- Every entry in the treatments research library carries an evidence tier and primary-source references.
- Not-recommended and Experimental tiers are visually distinct — coloured borders, warning icons, coral text emphasis.
- India regulatory context (CDSCO for drugs, ICMR for clinical protocols, AYUSH for traditional systems) is stated per entry when relevant.
- The AI guide is prompted to recommend professional consultation for anything clinical and to refuse diagnostic requests.
- The wellness directory is contact-info, not booking-with-commission.

### 9.5 Accessibility
- Semantic HTML, ARIA labels on icon buttons, focus rings on interactive elements.
- Colour palette avoids red/green-only signals (evidence-tier chips include emoji and text).
- Voice notes and AAC surface complement text-first flows for non-verbal or minimally-verbal users.
- Emergency and AAC-fullscreen are one-tap PWA shortcuts from the phone home screen.
- Areas for improvement (roadmap): screen-reader-verified traversal, high-contrast theme, RTL support if Urdu is added, complete text scaling audit at 200%.

### 9.6 Performance
- Next.js standalone output for lean container images.
- SWR revalidation avoids repeated identical queries within a short window.
- Prisma queries use explicit `select` allowlists to avoid over-fetching.
- Dashboard is one aggregated endpoint, not N per-widget calls.
- Pagination on list endpoints (children, community posts, messages, audit).

### 9.7 Reliability and observability
- `GET /api/health` — parallel DB + Redis probe; 503 when DB is down so load balancers can pull the pod.
- Structured JSON logs in prod; correlation IDs on every request; 5xx surfaces the ID to the client so a user report grep-s directly to the trace.
- Sentry on both sides, feature-flagged; source-map upload wired for the web bundle.
- Nightly Postgres backup with configurable retention; documented restore procedure.
- Log rotation limits so a runaway process cannot fill the disk.

### 9.8 Internationalisation
- Language enum shipped and stored on user profile, resources, and schemes.
- Frontend i18n framework not yet wired — text is currently English-first. Adding next-intl and translation loading is a Phase 2 track once the platform's word list stabilises.

---

## 10. Compliance summary

| Regulation | How the platform addresses it |
|---|---|
| **DPDP Act 2023 (India)** | Full data export, right-to-erasure with confirmation friction, purpose-limited data collection, logging redaction, per-record access checks on voice audio and clinical data. |
| **RPWD Act 2016** | Educational content covering rights and processes; IEP module built around the accommodations vocabulary; government scheme directory. |
| **AYUSH Ministry** | Ayurveda and homeopathy content stays within AYUSH-recognised terminology; safety alerts about heavy-metal contamination in unlicensed products cite peer-reviewed sources. |
| **CDSCO drug regulation** | Every allopathic entry states CDSCO approval status (or lack of it) for the indication. |
| **ICMR stem cell guidelines** | Stem cell and exosome therapy entries explicitly state ICMR National Guidelines status and instruct parents to demand a CTRI (Clinical Trials Registry India) registration number from any clinic offering these therapies. |
| **India IT Rules on intermediary content** | Community posts have admin moderation and audit-logged deletion. |

---

## 11. Success metrics

Definitions for a v1 launch review. All metrics are 30-day rolling unless noted.

### 11.1 Adoption
- **Signups completed** — account created + email verified.
- **Care-team expansion rate** — average number of caregivers per active child (target: > 2, i.e., the primary parent brings in at least one other person).
- **Weekly active parents** — parents who logged in and performed at least one write action (mood, milestone, session note read, message, document upload).

### 11.2 Engagement depth
- **Records per active child per week** — mood entries + behavior events + milestones + sessions.
- **IEP completion funnel** — % of children with a `DRAFT` IEP that progress to `ACTIVE` within 60 days.
- **Voice-note attach rate** — % of mood entries and session notes that include audio (indicator of ergonomic friction being low enough).

### 11.3 Care coordination
- **Messages per active child per week**.
- **Cross-role approvals** — % of active IEPs that carry signatures from ≥ 2 role types (a proxy for the platform actually being the coordination point, not just a parent notebook).

### 11.4 Trust and safety
- **Time to first support response** on any 5xx-flagged issue (correlation ID makes this measurable).
- **DPDP data export completions** — a metric we want to be small in absolute terms but flawless in success rate. Any export failure is a P0.
- **Treatments library engagement on warning-tier entries** — proxy for the editorial framing landing (people are reading the not-recommended entries, not just the standard-of-care ones).

### 11.5 Content freshness
- **Wellness directory entries with a valid contact link** — target 100%. Broken links here directly waste a parent's time.
- **Resources published in > 1 language** — target for Phase 2 as i18n rolls out.

---

## 12. Roadmap and known gaps

### 12.1 Phase 2 (planned)
1. **Payments and subscriptions (Razorpay for India)** — the only pre-existing pending item. Model: parent-payer, unlimited invited caregivers per child on the same subscription; sliding scale for regional access.
2. **Admin CMS surfaces for wellness and treatments** — today both are edited over the API; a dedicated `/admin/wellness` and `/admin/research` page will lower the friction for editorial updates.
3. **Frontend i18n rollout** — Hindi first, then Tamil, Telugu, Kannada. Content strategy has to be sorted before the technical wiring.
4. **Review-due notifications** — quarterly IEP review reminders, document expiry reminders (`FamilyDocument.expiresAt` is already populated). Needs a scheduler decision (cron in Docker vs. a job runner).
5. **Screen-reader accessibility audit** — full traversal with NVDA and VoiceOver; fix findings.
6. **Frontend unit and E2E tests** — Vitest for components, Playwright for the critical flows (signup, invite acceptance, IEP approval).

### 12.2 Phase 3 (deferred)
7. **Teletherapy / video calling** — requires infrastructure and compliance decisions (data residency for video, retention for recordings). Not before the async messaging surface has real traction.
8. **UDID API integration** — direct pull of the child's disability certificate from the national UDID system. Blocked on API access and government partnership.
9. **ML predictive insights** — early-warning signals on regression risk from mood + behavior + attendance patterns. Blocked on having enough longitudinal data to train responsibly.
10. **Predictive scheduling assistant** — appointment conflict detection, travel-time-aware suggestions.

### 12.3 Explicit non-goals (see also §4)
- Anything that requires selling a specific therapy or treatment.
- Anything that replaces a licensed clinician's judgement.
- Anything that positions the platform as a diagnostic tool.
- Recording video or continuous audio of the child.
- Sharing data with advertisers or brokers under any framing.

### 12.4 Known technical debt
- Frontend has no automated test coverage. Backend has focused Jest specs on critical services (auth, child-access, IEP, insights, messages, privacy, siblings, exception filter, env validation) — nine files. Both directions have room.
- Prisma is on 5.22; upstream is 7.9. Upgrade planned once Prisma 7 is a full release and the migration path is documented.
- Docker Desktop on Windows occasionally locks `query_engine-windows.dll.node` during `prisma generate` while the dev backend is running — a known ergonomic wart, workaround documented.
- The `web/messages/` directory exists but is empty (placeholder for i18n).
- No automated seed for a demo child (deliberate — parents create their own, but demo walkthroughs could benefit from an optional seeded child).

---

## 13. Glossary

- **AAC** — Augmentative and Alternative Communication. Picture boards, speech-generating devices, sign — used with children who are non-speaking or minimally speaking.
- **ABA** — Applied Behaviour Analysis. Modern practice is assent-based and neurodiversity-affirming; older compliance-driven ABA is contested and the platform's content reflects that nuance.
- **AYUSH** — Ministry of Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homoeopathy. Regulator for traditional Indian medicine systems.
- **BAMS** — Bachelor of Ayurvedic Medicine and Surgery. The recognised Ayurvedic practitioner qualification.
- **BHMS** — Bachelor of Homeopathic Medicine and Surgery. The recognised Homeopathic practitioner qualification.
- **CDSCO** — Central Drugs Standard Control Organisation. India's drug regulator.
- **CTRI** — Clinical Trials Registry, India. Registration is required for any clinical trial in India.
- **DPDP** — Digital Personal Data Protection Act 2023. India's data-protection law.
- **ICMR** — Indian Council of Medical Research. Sets national research guidelines including for stem cell research.
- **IEP** — Individualized Education Program. A living document describing a child's current performance, goals, accommodations, and services.
- **JASPER, ESDM** — Naturalistic developmental behavioural interventions with published evidence bases for autism.
- **Niramaya** — Health insurance scheme for persons with intellectual disabilities administered by the National Trust.
- **RCI** — Rehabilitation Council of India. Certifies special educators, SLPs, clinical psychologists, and rehabilitation professionals.
- **RPWD Act** — Rights of Persons with Disabilities Act 2016. Establishes 21 recognised disabilities and the entitlements attached.
- **SIBO** — Small-Intestinal Bacterial Overgrowth. The hypothesis behind the Nemechek Protocol; not established as an autism mechanism in mainstream research.
- **SLP** — Speech-Language Pathologist. Also called a speech therapist.
- **UDID** — Unique Disability ID. National card that consolidates disability certification and scheme access.

---

## 14. Change log

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-07-22 | Initial PRD covering the shipped Phase-1 platform. |
