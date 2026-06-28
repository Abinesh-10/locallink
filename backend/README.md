# LocalLink Backend — Phase 1 through Phase 8 (all phases complete)

Node + Express + TypeScript + Postgres + Socket.IO.

**Phase 1 (Foundation)**: auth (Phone OTP, Email+Password, Google OAuth 2.0),
profile, multi-role, geo, language.

**Phase 2 (Hire a Person)**: worker profiles, KYC verification
(Aadhaar/DL/GST), reputation/trust-score engine, service requests, reviews.

**Phase 3 (Rent an Item)**: rental listings, availability, bookings with
DB-enforced no-double-booking, "Verified Seller" badge (reuses Phase 2's
KYC), reviews.

**Phase 4 (Buy & Sell)**: product listings (soft-delete), browse + radius,
orders with an accept/decline/complete lifecycle, automatic qty
decrement/sold status on completion, "Verified Seller" badge (same KYC
join as Phase 3). No review system — the doc's Phase 4 scope is contact +
mark-sold only.

**Phase 5 (Community Help + Emergency SOS)**: non-commercial help requests
(blood/volunteer/emergency/medical/other), lost & found, and a real-time
SOS feature combining a Socket.IO broadcast to everyone within 5km, SMS to
saved emergency contacts, and strict per-user rate limiting (3 posts/hour,
1 SOS/30min). First phase to actually use the Socket.IO server that's been
initialized-but-idle since Phase 1. Also adds a `volunteer` role that the
original spec's role table never defined but its Nearby Volunteers feature
requires.

**Phase 6 (Learn Skills)**: trainer profiles (free-text subjects, no
categories table — unlike every other module's discovery flow), courses
(online/offline/hybrid, free-text subject search via `ILIKE`), enrollments
with server-side capacity enforcement via `SELECT ... FOR UPDATE` on the
course row, and course reviews reusing the polymorphic `reviews` table.

**Phase 7 (Real-time Chat, Notifications, Admin, Moderation)** — both
passes complete:

- *Pass 1*: real-time 1:1 chat (sorted-pair rooms enforcing the doc's
  `user_a_id < user_b_id` invariant, cursor-paginated message history,
  delivered/read receipts, image/location messages, a throttled typing
  indicator), a persisted notifications system (the doc's full trigger
  list — new request, status change, new review, new community response,
  enrollment update, new chat message — now actually writes to the
  `notifications` table, not just a live Socket.IO emit), and a generic
  Cloudinary upload-signature endpoint replacing Phase 1's hardcoded
  profile-photo-only one.
- *Pass 2*: admin dashboard (user list/suspend, KYC review queue reusing
  Phase 2's `syncVerifiedBadge` so admin approval and a real provider
  webhook produce identical downstream effects, category CRUD across all
  three category-shaped tables, basic analytics) and a generic reporting
  system (`POST /reports` works against any of 7 target types). Every
  admin mutation writes an `admin_actions` audit row — and unlike the
  app's other best-effort side effects (SOS SMS, chat notifications), an
  audit-log write failure here deliberately fails the parent request,
  since the audit trail itself is the security control the doc requires,
  not a nicety.

While retrofitting notification triggers into hire/rent/market/learn's
existing controllers, found and fixed the same bug independently in three
different modules: a service function would fetch a cross-table field
(e.g. a rental's `owner_id`, joined from `rental_listings`) for an
authorization check, but the function's final `RETURNING *` only covered
the primary table (`rental_bookings`), silently dropping that field from
what the controller received. Worth knowing as a pattern if extending any
of these modules further: whenever a join-fetched value is needed
downstream of a write, it has to be explicitly re-attached to the return
value, not assumed to survive the final `RETURNING *`.

All 12 schema-first migrations are applied and now have real
controllers/services behind every one of them. Phase 8 (real
translations, accessibility, CI/CD) is the only remaining phase.

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (recommended), OR a local Postgres 16 instance

## Quick start (Docker — recommended)

```bash
cd backend
cp .env.example .env
# Edit .env: at minimum, set real JWT secrets. MSG91/SMTP/Google/Cloudinary
# keys are optional for local testing — see "Running without third-party keys" below.

docker compose up -d postgres   # start Postgres only first
npm install                     # install deps locally so you can run migrate/seed from host
npm run migrate                 # applies all 12 migrations
npm run seed                    # seeds roles, sample categories, admin user

docker compose up --build backend   # builds and starts the API container
```

API will be live at `http://localhost:4000/api/v1`. Health check: `GET http://localhost:4000/health`.

## Quick start (without Docker)

```bash
cd backend
cp .env.example .env
# Point DATABASE_URL at your own local Postgres instance.
# Ensure the DB has the pgcrypto, citext, cube, earthdistance, btree_gist
# extensions available (most managed Postgres providers allow these; on a
# self-hosted instance you may need to run as a superuser once).

npm install
npm run migrate
npm run seed
npm run dev      # starts with nodemon, auto-restarts on src/ changes
```

## Running without third-party keys

Every external integration (MSG91, SMTP, Google OAuth, Cloudinary, KYC) is
guarded so the server boots and most flows work without real credentials:

- **Phone OTP**: if `MSG91_AUTH_KEY` is unset, the OTP is logged to the
  console instead of sent via SMS (`[DEV MODE] OTP for +91...: 483920`).
  Use that logged code to complete `verify-otp`.
- **Email OTP**: same dev-mode logging behavior if SMTP is unset.
- **Google OAuth**: requires real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
  to function at all — there's no meaningful dev-mode mock for an OAuth
  handshake. Phone OTP or Email+Password are the easiest flows to test
  without setting this up.
- **Cloudinary**: `POST /users/me/photo` returns a 503 with a clear message
  if unconfigured. Photo upload via signed Cloudinary upload is otherwise
  untouched — the frontend just won't be able to request a signature yet.

## Testing the auth flows manually

```bash
# Phone OTP signup/login
curl -X POST http://localhost:4000/api/v1/auth/phone/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "purpose": "login"}'
# Check server logs for the OTP if MSG91 isn't configured.

curl -X POST http://localhost:4000/api/v1/auth/phone/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "483920", "purpose": "login", "fullName": "Test User"}'
# Returns { accessToken, user, roles } and sets an httpOnly refresh cookie.

# Email + Password signup
curl -X POST http://localhost:4000/api/v1/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "Passw0rd!", "fullName": "Test User"}'
# Check server logs for the verification OTP if SMTP isn't configured.

curl -X POST http://localhost:4000/api/v1/auth/email/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "otp": "483920"}'
```

## Admin login

After `npm run seed`, a default admin exists:
- Email: `admin@locallink.app` (override with `SEED_ADMIN_EMAIL`)
- Password: `ChangeMe123!` (override with `SEED_ADMIN_PASSWORD`)

**Change this password immediately in any non-local environment.**

## Testing Phase 2 (Hire a Person)

```bash
# 1. Become a worker (use an access token from one of the auth flows above)
curl -X POST http://localhost:4000/api/v1/worker-profile \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"categoryId": "<a service_categories.id from your seed data>", "hourlyRate": 250, "bio": "10 years experience"}'

# 2. Search nearby workers (as a different logged-in user, or anonymously)
curl "http://localhost:4000/api/v1/workers?lat=13.08&lng=80.27&radius=10&sort=rating"

# 3. Request service (as the customer)
curl -X POST http://localhost:4000/api/v1/service-requests \
  -H "Content-Type: application/json" -H "Authorization: Bearer <customer_token>" \
  -d '{"workerId": "<worker user id>", "description": "Fix a ceiling fan"}'

# 4. Accept and complete (as the worker)
curl -X PATCH http://localhost:4000/api/v1/service-requests/<id>/status \
  -H "Content-Type: application/json" -H "Authorization: Bearer <worker_token>" \
  -d '{"status": "accepted"}'
# ... then again with {"status": "completed"}

# 5. Leave a review (as the customer, only after status=completed)
curl -X POST http://localhost:4000/api/v1/reviews \
  -H "Content-Type: application/json" -H "Authorization: Bearer <customer_token>" \
  -d '{"workerId": "<worker user id>", "requestId": "<id>", "rating": 5, "comment": "Great work"}'
```

### KYC verification without real provider credentials

`KYC_API_KEY`/`KYC_API_BASE_URL` are unset by default, so
`POST /verifications/initiate` falls back to a manual-review state
(`status: 'pending'`, a locally-generated `provider_ref`) rather than
calling Surepass/HyperVerge — matching the doc's own MVP scope ("manual
admin review acceptable at launch"). To simulate a provider confirming the
verification, call the webhook directly with the shared secret:

```bash
curl -X POST http://localhost:4000/api/v1/verifications/webhook/surepass \
  -H "Content-Type: application/json" -H "x-webhook-signature: <your KYC_WEBHOOK_SECRET>" \
  -d '{"provider_ref": "<the providerRef returned by initiate>", "status": "verified"}'
```

This flips the verification to `verified`, sets the worker's `is_verified`
badge, and recomputes their `trust_score` — the same code path a real
provider's webhook would trigger.

## Testing Phase 3 (Rent an Item)

```bash
# 1. List an item (as the owner)
curl -X POST http://localhost:4000/api/v1/rentals \
  -H "Content-Type: application/json" -H "Authorization: Bearer <owner_token>" \
  -d '{"categoryId": "<a rental_categories.id from your seed data>", "title": "Bosch Drill Machine", "dailyRate": 150, "deposit": 500}'

# 2. Browse nearby rentals (as anyone)
curl "http://localhost:4000/api/v1/rentals?lat=13.08&lng=80.27&radius=10"

# 3. Check availability before booking
curl http://localhost:4000/api/v1/rentals/<listing id>/availability \
  -H "Authorization: Bearer <renter_token>"

# 4. Book it (as the renter)
curl -X POST http://localhost:4000/api/v1/rental-bookings \
  -H "Content-Type: application/json" -H "Authorization: Bearer <renter_token>" \
  -d '{"listingId": "<listing id>", "startDate": "2026-07-01T10:00:00Z", "endDate": "2026-07-02T10:00:00Z"}'

# 5. Try booking an overlapping period as a *different* renter — expect a 409 booking_conflict
curl -X POST http://localhost:4000/api/v1/rental-bookings \
  -H "Content-Type: application/json" -H "Authorization: Bearer <other_renter_token>" \
  -d '{"listingId": "<listing id>", "startDate": "2026-07-01T18:00:00Z", "endDate": "2026-07-03T10:00:00Z"}'

# 6. Confirm and mark returned (as the owner)
curl -X PATCH http://localhost:4000/api/v1/rental-bookings/<booking id>/status \
  -H "Content-Type: application/json" -H "Authorization: Bearer <owner_token>" \
  -d '{"status": "confirmed"}'
# ... then again with {"status": "returned"}

# 7. Leave a review (as the renter, only after status=returned)
curl -X POST http://localhost:4000/api/v1/rental-reviews \
  -H "Content-Type: application/json" -H "Authorization: Bearer <renter_token>" \
  -d '{"listingId": "<listing id>", "bookingId": "<booking id>", "rating": 5, "comment": "Worked great"}'
```

The double-booking test (step 5) is the most important one to actually run —
it exercises the Postgres `EXCLUDE USING gist` constraint directly, not
just application-layer validation, so it's worth confirming locally rather
than trusting code review alone.

## Testing Phase 4 (Buy & Sell)

```bash
# 1. List an item for sale (as the seller)
curl -X POST http://localhost:4000/api/v1/products \
  -H "Content-Type: application/json" -H "Authorization: Bearer <seller_token>" \
  -d '{"title": "iPhone 13", "price": 35000, "condition": "used", "qty": 1}'

# 2. Browse nearby listings (as anyone)
curl "http://localhost:4000/api/v1/products?lat=13.08&lng=80.27&radius=10"

# 3. Express interest (as the buyer)
curl -X POST http://localhost:4000/api/v1/orders \
  -H "Content-Type: application/json" -H "Authorization: Bearer <buyer_token>" \
  -d '{"productId": "<listing id>", "message": "Is this still available?"}'

# 4. Accept and complete (as the seller)
curl -X PATCH http://localhost:4000/api/v1/orders/<order id>/status \
  -H "Content-Type: application/json" -H "Authorization: Bearer <seller_token>" \
  -d '{"status": "accepted"}'
# ... then again with {"status": "completed"}
# After completion, GET /products/<listing id> should show qty=0 and status="sold".

# 5. Soft delete (as the seller) — confirm it disappears from browse but the
#    row still exists in the DB with deleted_at set, not actually removed.
curl -X DELETE http://localhost:4000/api/v1/products/<listing id> \
  -H "Authorization: Bearer <seller_token>"
```

Worth running concurrently if you can: fire two `PATCH .../status
{"status":"completed"}` requests for two different orders against the
*same* listing with `qty: 1` at nearly the same time. Exactly one should
succeed in decrementing qty to 0 and marking it sold; the other should
either fail validation or also complete without qty going negative —
either is acceptable, but a negative qty would indicate the
`FOR UPDATE` locking in `updateOrderStatus` isn't working as intended.

## Testing Phase 5 (Community Help + Emergency SOS)

```bash
# 1. Post a blood request (requires login)
curl -X POST http://localhost:4000/api/v1/community \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"type": "blood", "bloodGroup": "O-", "title": "Need O- urgently"}'

# 2. Browse the feed
curl "http://localhost:4000/api/v1/community?lat=13.08&lng=80.27&radius=10"

# 3. Offer to help (as a different user)
curl -X POST http://localhost:4000/api/v1/community/<request id>/respond \
  -H "Content-Type: application/json" -H "Authorization: Bearer <other_token>" \
  -d '{"message": "I can donate, where do I go?"}'

# 4. Close the request (as the requester)
curl -X PATCH http://localhost:4000/api/v1/community/<request id>/close \
  -H "Authorization: Bearer <token>"
```

### Testing SOS specifically

This is the highest-stakes endpoint in the whole app — worth testing for
real, not just trusting the code review:

1. **Phone verification gate**: try `POST /community/sos` with an account
   that registered via email and never verified a phone. Expect a 403
   `phone_verification_required`. Then complete phone OTP verification on
   that account and retry — it should succeed.
2. **Rate limit**: send a second SOS within 30 minutes of the first, from
   the same user. Expect a 429. The error should clearly say "1 SOS per 30
   minutes," not a generic rate-limit message — confirms `sosRateLimiter`
   (not the regular `communityPostRateLimiter`) is actually attached to
   this route.
3. **Emergency contact SMS**: add at least one emergency contact via
   `POST /users/me/emergency-contacts` first. Without real MSG91
   credentials, check the **backend terminal** for `[DEV MODE]`-style logs
   confirming the SMS attempt was made (or, if MSG91 is configured, confirm
   the contact's phone actually receives a text).
4. **Socket.IO broadcast**: open two browser sessions as two different
   nearby users (both with `lat`/`lng` set within 5km of each other via
   `/onboarding/location`). Send an SOS from one; the other should see the
   red banner appear within a second or two, without a page refresh —
   this confirms the `sos:alert` event actually reaches a connected,
   *different* user, not just the sender's own session.
5. **Distance boundary**: set a third test user's location to >5km away
   and confirm they do *not* receive the alert — the radius is hardcoded
   to 5km regardless of that user's own `search_radius_km` preference.

```bash
curl -X POST http://localhost:4000/api/v1/community/sos \
  -H "Content-Type: application/json" -H "Authorization: Bearer <phone_verified_token>" \
  -d '{"lat": 13.08, "lng": 80.27, "description": "Need help now"}'
```

## Testing Phase 6 (Learn Skills)

```bash
# 1. Become a trainer
curl -X POST http://localhost:4000/api/v1/trainer-profile \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"subjects": ["Python"], "qualifications": "5 years teaching experience"}'

# 2. Create a course with capacity 1 (deliberately small, to make the
#    capacity test in step 4 easy to trigger)
curl -X POST http://localhost:4000/api/v1/courses \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"subject": "Python", "title": "Intro to Python", "mode": "online", "capacity": 1}'

# 3. Browse
curl "http://localhost:4000/api/v1/courses?subject=python"

# 4. Enroll (as a student) — then try enrolling a SECOND student in the
#    same capacity-1 course and expect a 409 course_full.
curl -X POST http://localhost:4000/api/v1/enrollments \
  -H "Content-Type: application/json" -H "Authorization: Bearer <student_token>" \
  -d '{"courseId": "<course id>"}'

# 5. Confirm and complete (as the trainer)
curl -X PATCH http://localhost:4000/api/v1/enrollments/<enrollment id>/status \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"status": "confirmed"}'
# ... then again with {"status": "completed"}

# 6. Leave a review (as the student, only after status=confirmed or completed)
curl -X POST http://localhost:4000/api/v1/course-reviews \
  -H "Content-Type: application/json" -H "Authorization: Bearer <student_token>" \
  -d '{"courseId": "<course id>", "rating": 5, "comment": "Great course"}'

# 7. Try leaving a SECOND review for the same course as the same student —
#    expect a 409 already_reviewed. This specifically exercises a fix:
#    course reviews use the student's enrollment id as `request_ref`
#    rather than leaving it NULL, since Postgres never treats two NULLs as
#    equal in a UNIQUE constraint — a NULL request_ref would have silently
#    let this duplicate through.
curl -X POST http://localhost:4000/api/v1/course-reviews \
  -H "Content-Type: application/json" -H "Authorization: Bearer <student_token>" \
  -d '{"courseId": "<course id>", "rating": 1, "comment": "duplicate attempt"}'
```

Step 4 and step 7 are the two things worth actually running rather than
trusting code review alone — one tests the `FOR UPDATE` capacity lock,
the other tests the `request_ref` fix for duplicate-review prevention.

## Testing Phase 7, Pass 1 (Chat + Notifications + Uploads)

```bash
# 1. Start a chat between two users
curl -X POST http://localhost:4000/api/v1/chats/start \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token_a>" \
  -d '{"otherUserId": "<user b id>"}'

# 2. Send a text message
curl -X POST http://localhost:4000/api/v1/chats/<room id>/messages \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token_a>" \
  -d '{"type": "text", "body": "Hey, is this still available?"}'

# 3. List rooms (as user B) — should show the new room with the message preview and unread_count=1
curl http://localhost:4000/api/v1/chats -H "Authorization: Bearer <token_b>"

# 4. Mark read (as user B)
curl -X PATCH http://localhost:4000/api/v1/chats/<room id>/read -H "Authorization: Bearer <token_b>"

# 5. Try starting the SAME chat again (in either direction) — should return
#    the SAME room id both times, not create a duplicate. This is the
#    sorted-pair invariant working: regardless of who initiates, user_a_id
#    is always the lexicographically lower UUID.
curl -X POST http://localhost:4000/api/v1/chats/start \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token_b>" \
  -d '{"otherUserId": "<user a id>"}'

# 6. Get an upload signature (for chat images)
curl -X POST http://localhost:4000/api/v1/uploads/cloudinary-signature \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token_a>" \
  -d '{"purpose": "chat_image"}'

# 7. Check notifications got persisted, not just live-emitted — e.g. after
#    creating a service request in Phase 2, check the worker's notifications:
curl http://localhost:4000/api/v1/notifications -H "Authorization: Bearer <worker_token>"
# Should show a service_request_new entry even if the worker was offline
# when the request was created — this is the whole point of persisting
# rather than only emitting live.
```

Step 5 is worth actually running: it's the one place a subtle bug (forgetting
to sort the pair, or sorting it inconsistently between create and lookup)
would silently create duplicate rooms instead of erroring, which code
review alone might not catch.

## Testing Phase 7, Pass 2 (Admin + Reporting)

```bash
# 1. Log in as the seeded admin (see "Admin login" above for credentials)

# 2. List users
curl http://localhost:4000/api/v1/admin/users -H "Authorization: Bearer <admin_token>"

# 3. Suspend a user, then confirm they can't log in
curl -X PATCH http://localhost:4000/api/v1/admin/users/<user id>/suspend \
  -H "Content-Type: application/json" -H "Authorization: Bearer <admin_token>" \
  -d '{"suspended": true}'

# 4. File a report (as any regular user) against something
curl -X POST http://localhost:4000/api/v1/reports \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"targetType": "worker_profile", "targetId": "<worker user id>", "reason": "Spam messages"}'

# 5. Review it (as admin)
curl http://localhost:4000/api/v1/admin/reports?status=open -H "Authorization: Bearer <admin_token>"
curl -X PATCH http://localhost:4000/api/v1/admin/reports/<report id> \
  -H "Content-Type: application/json" -H "Authorization: Bearer <admin_token>" \
  -d '{"status": "actioned"}'

# 6. Approve a pending KYC verification manually (the same path Phase 2's
#    "no real provider credentials" dev mode relies on)
curl http://localhost:4000/api/v1/admin/verifications?status=pending -H "Authorization: Bearer <admin_token>"
curl -X PATCH http://localhost:4000/api/v1/admin/verifications/<verification id> \
  -H "Content-Type: application/json" -H "Authorization: Bearer <admin_token>" \
  -d '{"status": "verified"}'
# Then confirm the affected worker/trainer's is_verified flag and
# trust_score both updated — this exercises the same syncVerifiedBadge
# path a real provider webhook would.

# 7. Create a category, then disable it via the override mechanism
curl -X POST http://localhost:4000/api/v1/admin/categories/service \
  -H "Content-Type: application/json" -H "Authorization: Bearer <admin_token>" \
  -d '{"slug": "test-category", "names": {"en": "Test Category"}}'
curl -X PATCH http://localhost:4000/api/v1/admin/categories/service/<category id> \
  -H "Content-Type: application/json" -H "Authorization: Bearer <admin_token>" \
  -d '{"isDisabled": true}'

# 8. Confirm every mutation above wrote an audit row
psql $DATABASE_URL -c "SELECT action, target_type, created_at FROM admin_actions ORDER BY created_at DESC LIMIT 10;"

# 9. Confirm a non-admin gets 403, not a silent pass-through
curl http://localhost:4000/api/v1/admin/users -H "Authorization: Bearer <regular_user_token>"
```

Step 8 is the one worth treating as non-negotiable: the doc's audit-log
requirement is a security control, not a nice-to-have, so it's worth
actually confirming every admin mutation above produced a row — not just
trusting that `logAdminAction` was called from each controller function.

## Project structure

See root `Project structure` section in the repo README, or `src/` directly —
it mirrors the doc's §5 folder structure exactly.

## What's NOT implemented yet

Phase 8: real TA/HI/TE/ML translations (currently placeholder English
text duplicated across all locale files), an accessibility audit, SEO
metadata, and CI/CD pipeline configuration. Everything else in the
original spec — Phases 1 through 7 — has real route logic, not just schema.
