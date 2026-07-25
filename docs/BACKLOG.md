# SpecialParents.in — Backlog

**Last updated**: 2026-07-25
**Companion to**: [PRD.md](./PRD.md)

This is the live backlog: what's been requested but not built, what's been
built but partial, and the debt that came out of code review. Items are
kept short — link out to the PRD or a code file when you want the full
context. Rough sizes are XS (< 1 h) → S (< 4 h) → M (< 1 d) → L (multi-day).

---

## 1. Validation — what shipped this session

Each row is a user ask from this session, its shipped commit, and a check
on whether the delivered state matches the intent.

| # | Ask | Commit | Delivered state | Match? |
|---|---|---|---|---|
| 1 | Wellness family directory (yoga, music, art, counselling, training) | `b3e92f7` | 15 curated offerings, 8 categories, 3 filter rows, public directory + admin CRUD | ✓ |
| 2 | Treatments research library — allopathic + Ayurveda + homeopathy + stem cell etc., evidence-tiered, admin-reviewed | `b3e92f7` | 20 entries across 7 systems, 5 evidence tiers, warning styling on NOT_RECOMMENDED / EXPERIMENTAL, India regulatory context per entry | ✓ |
| 3 | Nemechek Protocol added | `b3e92f7` (seed extension) | LIMITED-tier entry, honest framing, India context on cost | ✓ |
| 4 | Sign-in flash fix (Sign in briefly appearing before Dashboard) | `b3e92f7` | `loading` flag gates CTAs, skeleton pill holds slot; verified no flash for either signed-in or anonymous path | ✓ |
| 5 | Detailed PRD | `b3e92f7` | [docs/PRD.md](./PRD.md), 14 sections, ~5000 words, styled HTML artifact published | ✓ |
| 6 | Therapist onboarding + admin verification + public directory + parent invite | `5088457` | 4 surfaces (self-serve, admin queue + detail, public directory + detail), invite endpoint reuses ChildInvite flow, primary-caregiver gated | ✓ |
| 7 | Onboarding wizard (guided instead of long form) + admin detail-view with checklist | `5088457` (polish) | 5-step wizard with progress chips + readiness gate; admin detail page with 4-item reviewer checklist and per-credential launchers | ✓ |
| 8 | Certification levels INTERN / RBT / BCaBA / BCBA | `878c76a` | Optional enum on TherapistProfile, chip picker in wizard + long-form editor, ABA-LEVEL filter row, coloured chip on cards and headers | ✓ |
| 9 | Languages displayed as English / Hindi / Tamil while DB keeps EN / HI / TA | `ac199d1` | Shared `web/lib/languages.ts`, all 5 therapist surfaces updated, DB payload unchanged (verified) | ✓ |
| 10 | Signup: "Parent" label → "Parents / Family" | (in `e77a711` follow-up) | Label updated, DB `Role.PARENT` value unchanged | ✓ |
| 11 | Rebrand SpecialParent.in → SpecialParents.in | `e77a711` | 31 files, single-C plural-S spelling, demo emails migrated, tab title + landing hint + login = 200 confirmed. Infrastructure identifiers (npm, Docker, DB name) intentionally left | ✓ |
| 12 | Gmail SMTP for verification emails | (compose change only, `1a8e614` follow-up) | `docker-compose.yml` wires SMTP_URL + MAIL_FROM through to backend; `.env` set by user; log shows `SMTP transporter ready`; `/forgot-password` returned 200 with 2s roundtrip (real SMTP handshake) | ✓ |
| 13 | Deploy on Docker | (multiple `docker compose build && up -d` cycles) | All 5 commits deployed to running containers; browser verification each time | ✓ |
| 14 | Simplification pass on recent code | `ec479c2` | 4-agent review; 4 new shared modules; 14 files touched; net −11 LOC despite extractions | ✓ |
| 15 | DB dashboard for platform admin | `1a8e614` | Adminer sidecar behind `admin-tools` compose profile, bound to `127.0.0.1:8080`, one-shot pre-fill URL documented | ✓ |
| 16 | Validate requirements + keep backlog | This document | Living backlog document at docs/BACKLOG.md | ✓ |

**Not delivered / regressions**: none identified.

---

## 2. Explicitly deferred (user asked, we scoped down)

Items where the user asked for something and we shipped a narrower version
by design. Listed so the fuller version isn't lost.

### 2.1 Therapist certificate file uploads · S
The backend `TherapistCertification` model has `fileName` + `filePath`
columns; the frontend never actually uploads a file. The user or admin
just adds a credential URL right now. Hooking the existing
`StorageService` (already used by reports + documents + voice notes) into
a file input on the wizard's Credentials step is a small follow-up.

### 2.2 Per-invite data scope for therapist care-team invites · M
Currently, when a parent invites a therapist, the therapist gets **full
caregiver access** to the child (same as any other caregiver). The user
asked for "parent has control of end-to-end kids operations" — the
current state honours that at the invite/revoke level, but a per-invite
scope (mood-only, therapy-only, full) would let a parent grant a
consulting doctor read-only access to sleep data without exposing IEPs.
Requires a `Caregiver.scope` enum + access-check plumbing at every
child-scoped read.

### 2.3 Booking calendar / slot picker for therapists · L
Availability is a free-text field today (`"Mon–Fri 5–8pm; Sat 10–2"`).
The user asked for "availability" and we shipped the minimum. A real
booking calendar (slot definition, session length, buffer between
sessions, cancellation window) is a substantial feature and belongs in
its own iteration.

### 2.4 LinkedIn OAuth verification · M
Admin currently eyeballs the LinkedIn URL and compares to the therapist's
credentials. OAuth verification (therapist logs in with LinkedIn during
onboarding, we get their profile + employment history programmatically)
would tighten the trust surface but requires a LinkedIn Developer App +
handling their approval process for the required scopes.

### 2.5 In-app read/write DB dashboard · L
User picked the Adminer sidecar over a bespoke in-app DB browser. If a
proper in-app admin data browser is wanted later (audit-logged writes,
per-table permissions, typed forms), that lives in its own feature.

### 2.6 Full rebrand of infrastructure identifiers · S
Rebrand deliberately skipped npm package names (`specialparent-backend`,
`specialparent-web`), Docker container names, Postgres DB/user/password,
git repo URL, and on-disk directory. A future rename would need a
downtime window (rename DB, update DATABASE_URL, recreate containers).

---

## 3. Tech debt from the simplify review (not applied this pass)

The 4-agent /simplify review of the recent diff (see commit `ec479c2`)
surfaced findings we intentionally skipped because they change intended
behaviour or need a broader design decision. Kept here so the debt is
visible.

### 3.1 POST → PATCH semantics on `/therapist-profile` · S
The onboarding wizard currently re-sends every field it doesn't own on
every step's save (so a save on step 2 doesn't wipe step 3's data). The
right altitude fix is a PATCH-semantic backend that updates only fields
present in the incoming DTO. Would delete ~120 lines of "preserve fields
from later steps" plumbing across the wizard.

### 3.2 Client-side filter of a single fetch on public directories · S
`/therapists`, `/wellness`, `/research` currently re-fetch on every
filter-chip click via SWR. For corpora this small (dozens of rows) a
single fetch + client-side filter would be simpler and snappier. Change
in behaviour: filter interactions become instantaneous, but stale-cache
semantics differ subtly.

### 3.3 Shared `BRAND` constant · XS
Brand string `SpecialParents.in` inlined in ~38 files (marketing pages,
email subjects, PRD, etc.). A `web/lib/brand.ts` + `backend/src/common/brand.ts`
would make the next rebrand touch two files instead of thirty.

### 3.4 `NAV_COMMON` role-derived nav table · S
`web/components/app-shell.tsx` has 4 parallel `NAV_PARENT` / `NAV_THERAPIST`
/ `NAV_SCHOOL` / `NAV_ADMIN` arrays with heavy overlap. A role-tagged
common table would prevent drift (`/notifications` is currently missing
from NAV_ADMIN and NAV_SCHOOL — a data-driven table would have caught
that).

### 3.5 `_count` on adminList over full includes · XS
`GET /admin/therapists` currently pulls every `TherapistEducation` and
`TherapistCertification` row for every profile in the queue. Fine at
current scale (dozens), over-fetches at hundreds. Requires small UI
adjustment on the queue card to show `Education: 3 · Certs: 2` counts
instead of inline rows.

### 3.6 State-machine helper for VerificationStatus transitions · XS
The DRAFT → PENDING_REVIEW → VERIFIED / REJECTED / SUSPENDED transitions
are enforced ad-hoc across 5 methods in `TherapistDirectoryService`. A
tiny `transition(from, event) → to` helper would land future statuses
(e.g., admin-triggered "PENDING_REVIEW → DRAFT for revisions") in one
place.

### 3.7 `InvitesService.assertPrimaryOrAdmin` still has an inline copy · XS
`common/child-access.ts` gained `assertPrimaryCaregiver` for the therapist
directory to call. `InvitesService` still has the identical inline
version. Trivial to unify.

### 3.8 Validate `TherapistProfile.languages` against LANGUAGE_CODES · XS
Backend DTO currently accepts any 6-char string. A typo in one client
silently pollutes the DB. Add `@IsIn(LANGUAGE_CODES)` or promote to the
Prisma `Language` enum.

### 3.9 Api layer: empty-body 200 → null coercion · XS
`web/lib/api.ts` was patched to treat empty response bodies as `null`
because Nest returns nothing when a controller returns `null`. Deeper
fix: a Nest interceptor that JSON-serialises `null` returns, or make
controllers return `undefined` / an explicit `{}` when nothing exists.
Client-side patch is the bandaid; server-side is the depth.

---

## 4. From PRD §12 (unchanged priorities)

### 4.1 Phase 2 (planned)
- **#26** Payments + subscriptions (Razorpay for India) — Only pre-existing
  numbered task still pending. Parent-payer model; unlimited invited
  caregivers per child; sliding-scale for regional access.
- **Admin CMS surfaces for wellness and treatments** — Today both are
  editable over the API; dedicated `/admin/wellness` and `/admin/research`
  pages would lower editorial friction. · M
- **Frontend i18n rollout** — Hindi first, then Tamil, Telugu, Kannada. The
  `Language` enum ships already; content-side work is the blocker. · L
- **Review-due notifications** — Quarterly IEP review reminders + document
  expiry reminders (`FamilyDocument.expiresAt` is already populated). Needs
  a scheduler decision (cron in Docker vs. a job runner). · M
- **Screen-reader accessibility audit** — Full traversal with NVDA and
  VoiceOver; fix findings. · M
- **Frontend unit and E2E tests** — Vitest for components, Playwright for
  critical flows (signup, invite acceptance, IEP approval, therapist
  verification). · L

### 4.2 Phase 3 (deferred)
- Teletherapy / video calling · L
- UDID API integration (needs government partnership) · L
- ML predictive insights (regression risk from mood + behaviour + attendance) · L
- Predictive scheduling assistant · L

### 4.3 Non-goals (see also PRD §4)
- Anything that requires selling a specific therapy
- Anything that replaces a licensed clinician's judgement
- Anything that positions the platform as a diagnostic tool
- Recording video or continuous audio of the child
- Sharing data with advertisers or brokers under any framing

---

## 5. Ops + platform housekeeping (freshly-visible)

### 5.1 Push local commits to GitHub · XS
Local `main` is 7 commits ahead of `origin/main`. Nothing has been pushed
this session — waiting on explicit `git push` per the safety rule.

### 5.2 Adminer prod-safety hardening · S
Adminer works locally behind the `admin-tools` profile. If it ever needs
to reach production, it belongs behind an OIDC auth proxy (Traefik +
Authentik, or Cloudflare Access). Do not open port 8080 on a public host
as-is.

### 5.3 SMTP: transactional-email deliverability · S
Gmail SMTP works for a dev sender. For production email deliverability
(especially to Gmail recipients), migrate to SendGrid / Postmark / SES
with SPF + DKIM + DMARC configured on the `specialparents.in` domain.
Blocked on the domain being owned + DNS controlled.

### 5.4 Backend tests for the new therapist directory paths · M
The last 5 commits added zero test coverage. Critical write paths to
add specs for: `upsertOwnProfile` (materialChange demotion), `submitForReview`
(minimum-content guards), `adminVerify/Reject/Suspend` (notification
emission), `inviteTherapist` (primary-caregiver guard + duplicate refusal).

### 5.5 Prisma 5.22 → 7.x upgrade · S
Prisma is on 5.22; upstream is 7.9. Upgrade planned once Prisma 7 is a
stable release and the migration path is documented for the existing
`skipDuplicates` + `db push` patterns.

### 5.6 Windows: `query_engine-windows.dll.node` file lock during regen · XS
Documented ergonomic wart: on Windows, if the dev backend is running when
`prisma generate` fires, the DLL is locked and generate fails. Workaround
is `taskkill /IM node.exe /F` first. Would be worth documenting in the
README under a "Windows dev quirks" section.

### 5.7 Optional demo child in seed · XS
`prisma/seed.ts` deliberately creates no children (parents add their
own). For screencasts / demo videos, an optional seeded child would
speed up walkthroughs. Gate behind an env flag so a real signup doesn't
land in a seeded row.

---

## 6. Housekeeping — what this backlog is not

- Not a JIRA. Items here are triggers for a real conversation before
  work starts.
- Not a promise. Anything in §2–§5 might get deprioritised, split, or
  dropped as the product's shape evolves.
- Not exhaustive. New backlog items appear when the code review /
  user asks reveal them; old ones move to shipped when they land in
  a commit.

To add an item: append to the appropriate section with title, size
estimate (XS/S/M/L), one-line context, and rationale for why it isn't
already shipped.

To retire an item: move it into §1 with a commit hash and ship note.
