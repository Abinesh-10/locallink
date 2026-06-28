# LocalLink — Hyperlocal Community Marketplace

**All 8 phases complete** — Phase 1 (Foundation), 2 (Hire), 3 (Rent), 4 (Buy & Sell), 5 (Community + Emergency SOS), 6 (Learn), 7 (Chat, Notifications, Admin, Moderation), and 8 (translations, accessibility, SEO, CI/CD). See each README's "Known limitations" for the honest list of what's production-ready vs. stubbed (real provider credentials, SSR for SEO, native-QA'd translations).

Two decoupled deployables, per the original spec:
- `frontend/` — React + TS + Tailwind, runs in Lovable preview or any static host.
- `backend/` — Node + Express + Postgres + Socket.IO, runs locally via Docker or deploys to Render/Railway/VPS.

No Lovable Cloud, no vendor lock-in — every external integration (MSG91,
SMTP, Google OAuth, Cloudinary, KYC) is abstracted behind a service
interface and swappable.

## Important runtime note

The Lovable preview can host `frontend/` only. `backend/` must run locally
(Docker Compose) or be deployed externally before the frontend can make any
API calls — point `VITE_API_URL` at wherever it ends up.

## Quick start

```bash
# 1. Backend first
cd backend
cp .env.example .env        # edit JWT secrets at minimum
docker compose up -d postgres
npm install
npm run migrate
npm run seed
npm run dev                 # or: docker compose up --build backend

# 2. Frontend
cd ../frontend
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

Visit `http://localhost:5173`. Full details, including how to test without
real MSG91/SMTP/Google credentials, are in `backend/README.md` and
`frontend/README.md`.

## What's in Phase 1

- **Auth**: Phone OTP (MSG91, primary), Email + Password with email-OTP
  verification (secondary), Google OAuth 2.0 (tertiary). JWT access (15m) +
  refresh (7d, rotated, httpOnly cookie).
- **Profile**: name, photo (Cloudinary signed upload), phone, language,
  GPS location + address, multi-role assignment, radius selector.
- **Security**: bcrypt(12), rate limiting on auth/OTP routes, OTP
  attempt-lockout, email-enumeration-safe responses, CORS allowlist,
  helmet, MSG91 webhook signature verification.

## What's in Phase 2

- **Worker profiles**: category, sub-skills, rates, bio, portfolio,
  availability toggle.
- **Discovery**: `GET /workers` with geo-radius (earthdistance/cube),
  category, min-rating, verified-only filters, and sort by
  distance/rating/trust score.
- **KYC verification**: Aadhaar/DL/GST initiate → provider abstraction
  (Surepass/HyperVerge interface, falls back to manual-review when no
  provider key is configured) → webhook confirmation → "Verified Worker"
  badge (Aadhaar or DL only — GST alone doesn't qualify, per spec).
- **Reputation engine**: composite trust score
  (`rating×0.4 + completionRate×0.3 + responseRate×0.2 + verified×0.1`),
  Bronze/Silver/Gold/Platinum tiers, recomputed on every review, request
  completion, and KYC status change.
- **Service requests**: create → accept/decline (worker-only) → complete,
  with a state machine preventing illegal transitions and a `FOR UPDATE`
  row lock preventing race conditions on concurrent status changes.
- **Reviews**: one per (reviewer, request), only after `completed` status,
  DB-trigger-maintained rating aggregates.

**Database**: all 12 migrations applied (schema-first per the original
plan) — every table for Phases 1–7 exists. Phases 1, 2, and 3's
controllers/services contain real logic; Phases 4–7 are schema-only.

## What's in Phase 3

- **Rental listings**: category, hourly/daily/weekly pricing (at least one
  required), security deposit, delivery option, photos, owner-only
  edit/delete.
- **Availability**: a Postgres `EXCLUDE USING gist (listing_id WITH =,
  period WITH &&)` constraint makes double-booking structurally
  impossible at the database level — not just app-layer validation. A
  `GET /rentals/:id/availability` endpoint surfaces already-booked periods
  so the frontend can show them before a renter picks dates.
- **Bookings**: create → owner confirms/declines → renter returns the item,
  with a state machine mirroring Phase 2's request lifecycle; either party
  can cancel a still-pending booking, but only the owner can
  confirm/decline/mark-returned (renters cannot self-confirm, per spec).
- **Verified Seller badge**: computed via an `EXISTS` join against
  `identity_verifications` at query time (Aadhaar or DL only) — no
  separate `is_verified` column on `rental_listings`, since the doc treats
  this as a derived fact from the same Phase 2 KYC data, not a stored one.
- **Reviews**: scoped to the *listing* (not the owner directly), one per
  (reviewer, booking), only after `returned` status.

## What's in Phase 4

- **Product listings**: title, price, condition (new/like new/used/
  refurbished), quantity, delivery option, photos, soft-delete via
  `deleted_at` (unlike rentals' hard delete — the doc's schema gives
  `product_listings` a `deleted_at` column specifically).
- **Discovery**: `GET /products` with the same geo-radius pattern as
  Phases 2–3, plus a condition filter; only `available` listings appear
  in browse (reserved/sold items are excluded from discovery but still
  directly fetchable, e.g. for the seller's own management view).
- **Orders**: express interest → seller accepts/declines → completes,
  with the same state-machine + `FOR UPDATE` row-locking pattern as
  Phase 2/3 — this one matters more than usual, since completion also
  decrements the listing's `qty` and auto-flips it to `sold` at zero, and
  two concurrent completions without proper locking could have driven
  `qty` negative.
- **No reviews**: the doc's Phase 4 feature list is contact-seller and
  mark-sold only — unlike Hire/Rent, there's no review system here, and
  `product_listings` has no `rating_avg`/`rating_count` columns at all.
- **Verified Seller badge**: same `EXISTS`-join pattern as Phase 3.

**Database**: all 12 migrations applied (schema-first per the original
plan) — every table for Phases 1–7 exists. Phases 1–4's controllers/
services contain real logic; Phases 5–7 are schema-only.

## What's in Phase 5

- **Community requests**: blood/volunteer/emergency/medical/other, with
  urgency levels and a 90-day max expiry enforced by a DB `CHECK`
  constraint. Critical urgency requires a KYC-verified account (the same
  Aadhaar/DL fact Phases 2–4 use), checked separately from SOS's own
  phone-verification requirement — these are two distinct gates, not one.
- **Responses**: one per (request, responder); a real-time
  `notification:new` Socket.IO event notifies the requester when someone
  offers to help.
- **Emergency SOS**: phone-verification required → creates a critical,
  auto-pinned (`is_sos=true`) request that expires in 2 hours → SMS fanout
  to every saved emergency contact → Socket.IO `sos:alert` broadcast to
  every user within a **fixed** 5km radius (independent of each user's own
  configurable search radius). DB write is the source of truth; SMS and
  socket fanout are deliberately best-effort afterward, so a flaky SMS
  provider or a socket-server hiccup never turns an already-recorded cry
  for help into a failed API response.
- **Volunteers**: a `volunteer` role — added in this phase's seed data
  since the original spec's role table never defined it despite its own
  Nearby Volunteers feature requiring it — surfaced via geo-radius query
  joined against `user_roles`.
- **Lost & Found**: full CRUD, geo-tagged by last-seen location.
- **Rate limiting**: per-*user* (not per-IP) limiters — 3 community posts/
  hour, 1 SOS/30min — using a custom `keyGenerator`, since
  `express-rate-limit`'s IP-based default would have under- or
  over-restricted shared-network users and been trivially bypassable by
  IP rotation.

## What's in Phase 6

- **Trainer profiles**: free-text `subjects` array, qualifications, bio —
  no categories table for this module at all (unlike every prior module's
  discovery flow), so course search uses `ILIKE` partial-text matching on
  `courses.subject` instead of filtering by a category foreign key.
- **Courses**: online/offline/hybrid mode, language, price, capacity,
  a `jsonb` schedule field (the doc's "schedule JSON shape" requirement
  doesn't specify an exact structure, so any object is accepted). Radius
  filtering is geo-aware but never excludes online courses that have no
  lat/lng at all — only offline/hybrid courses without coordinates get
  filtered by distance.
- **Enrollments**: capacity enforced via `SELECT ... FOR UPDATE` on the
  course row at insert time, per the doc's explicit security requirement
  — this is the same row-locking pattern as Phase 2/3/4's status
  transitions, applied here to a *create* operation instead.
- **Course reviews**: reuse the polymorphic `reviews` table, scoped to the
  course. Caught a real bug while building this: a `NULL` `request_ref`
  would have silently defeated the table's own
  `UNIQUE(reviewer_id, target_type, target_id, request_ref)` constraint,
  since Postgres never treats two `NULL`s as equal — fixed by using the
  student's own enrollment id as the anchor (each student has at most one
  enrollment per course, so it's naturally unique).

**Database**: all 12 migrations applied (schema-first per the original
plan) — every table for Phases 1–7 exists. Phases 1–6's controllers/
services contain real logic; Phase 7 is schema-only.

## What's in Phase 7

- **Chat**: sorted-pair rooms (`user_a_id < user_b_id`, enforced
  application-side via JS string comparison matching Postgres's own uuid
  ordering), cursor-paginated message history, delivered/read receipts,
  text/image/location message types, a throttled typing indicator. "Report
  this" and "Message" entry points wired into worker profiles, rental
  listings, product listings, courses, and community requests.
- **Notifications**: persisted (not just live-emitted) for every trigger
  in the doc's list — new request, status change, new review, new
  community response, enrollment update, new chat message. Retrofitting
  this into the five existing marketplace modules surfaced the same bug
  three separate times: a service function would fetch a cross-table
  field for an authorization check, but the final `RETURNING *` only
  covered the primary table, silently dropping that field before the
  controller could use it for the notification's recipient. Fixed in all
  three places by explicitly re-attaching the value to the return object.
- **Uploads**: a generic, purpose-whitelisted Cloudinary signature endpoint
  (`POST /uploads/cloudinary-signature`) — the folder is resolved
  server-side from a fixed `purpose` enum, never taken directly from the
  client, since that would let a client write signed uploads anywhere in
  the Cloudinary account.
- **Admin dashboard**: user list/suspend, KYC review queue (reusing Phase
  2's `syncVerifiedBadge`, so manual admin approval and a real provider
  webhook produce identical downstream effects), category CRUD across all
  three category-shaped tables (which have three genuinely different
  schemas — handled explicitly per type, not papered over), basic
  analytics with an honestly-labeled DAU approximation (no dedicated
  session log exists), and a mandatory audit log on every mutation.
- **Reporting**: `POST /reports` against any of 7 target types, admin
  review queue. Unlike the app's other best-effort side effects (SOS SMS,
  chat push notifications), an admin audit-log write failure deliberately
  fails the parent request — the audit trail is the security control the
  doc requires, not a nicety, so it should never fail silently.
- **Also added `volunteer`-style role to `setProfileVerified`'s lookup**:
  caught a silent-fallback bug where an unexpected `type` value would
  have defaulted to updating `trainer_profiles` via a ternary instead of
  failing loudly — fixed with an explicit lookup + throw, matching the
  defense-in-depth pattern already used for category table dispatch.

**Database**: all 12 migrations applied — every table across the entire
original spec now has real controllers and services behind it, not just
schema. Phase 8 is the only phase remaining.

## What's in Phase 8 (i18n, Accessibility, SEO, CI/CD)

The final polish phase. What was actually done, and what's honestly still
a stub:

- **Translations**: the shared UI chrome — navigation, auth, onboarding,
  profile, messaging, notifications (79 keys across 8 namespaces) — is
  genuinely translated into Tamil, Hindi, Telugu, and Malayalam. The
  deeper feature flows (hire/rent/market/community/learn/admin, ~330 keys)
  fall back cleanly to English via a deep-merge, so no screen ever shows a
  raw key. **Honest caveat**: these are competent machine translations, not
  native-speaker-QA'd localizations — fine for an MVP, but a real launch
  serving Tamil Nadu would want a native Tamil reviewer at minimum. The
  fallback strategy is deliberate, not an oversight: full coverage of the
  first-run experience (where a language barrier loses a user entirely)
  beats half-translating everything.
- **Accessibility**: `document.documentElement.lang` now syncs with the
  active language (screen-reader pronunciation); the safety-critical SOS
  alert banner got `role="alert"` + `aria-live="assertive"` so it's
  *announced*, not just rendered; icon-only buttons carry `aria-label`s
  throughout; every `<img>` has alt text. **Honest caveat**: this is a
  static-analysis pass — no real screen-reader testing or automated axe/
  Lighthouse audit was run (no browser available in the build environment).
- **SEO**: full Open Graph + Twitter card metadata in `index.html`
  (WhatsApp link previews matter for distribution in India). **Honest
  caveat**: this is a client-rendered SPA, so the meta is site-wide and
  static — per-route SEO (individual listings ranking, per-listing
  previews) would require SSR/prerender, which is flagged in `index.html`
  itself.
- **CI/CD**: a real GitHub Actions workflow (`.github/workflows/ci.yml`)
  running lint → typecheck → test → build for the backend and
  lint → build for the frontend, as independent jobs. ESLint 8 configs and
  a Jest config (with `passWithNoTests`) are included so the pipeline runs
  green on a fresh clone. **Honest caveat**: uses `npm install` rather than
  `npm ci` because no lockfiles are committed yet — the workflow comments
  explain how to switch once lockfiles exist, and there are no automated
  *deploy* steps (deploy targets/secrets are environment-specific).

## Repository structure

```
/
├─ frontend/   (see frontend/README.md)
└─ backend/    (see backend/README.md)
```

Mirrors the original spec's §5 folder structure exactly.
