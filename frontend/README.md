# LocalLink Frontend — Phase 1 through Phase 8 (all phases complete)

Vite + React + TypeScript + Tailwind. Designed to run inside the Lovable
preview, but API calls will fail until `VITE_API_URL` points at a reachable
backend (local Docker, or your deployed Render/Railway/VPS instance).

## Setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to your running backend, e.g. http://localhost:4000
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## What's built (Phase 1)

- **Auth**: `/auth/login`, `/auth/register`, `/auth/verify-otp`, `/auth/forgot`,
  `/auth/reset` — phone OTP (primary), email+password (secondary), Google
  OAuth (tertiary, redirects to `/auth/oauth-success`).
- **Onboarding**: `/onboarding/location` (GPS capture + radius selector),
  `/onboarding/roles` (multi-role selection).
- **Core**: `/` (5-card home — all five cards enabled now that every
  phase is built), `/profile`, `/settings/language`.
- **Session handling**: access token lives in memory only (never
  localStorage/sessionStorage); a silent `/auth/refresh` call on app load
  uses the httpOnly cookie to restore the session across reloads. 401
  responses trigger one automatic refresh-and-retry via an axios
  interceptor before giving up.
- **i18n**: English fully populated; Tamil/Hindi/Telugu/Malayalam files
  exist with the same key structure but placeholder (English) content —
  real translation is Phase 8 scope per the doc.

## What's built (Phase 2 — Hire a Person)

- `/hire` — browse workers with category chips, sort (rating/distance/trust),
  verified-only filter.
- `/hire/:category` — same browse experience pre-filtered by category slug.
- `/workers/:id` — worker detail: reputation panel, bio, skills, rates,
  reviews, "Request Service" + call/WhatsApp deep links. **Requires login**
  (the backend returns the worker's phone number here for the deep links,
  so this page sits behind `ProtectedRoute`).
- `/become-a-worker` — create or edit your own worker profile; assigns the
  `worker` role automatically on first save.
- `/requests/inbox` — worker's incoming requests, with accept/decline/mark-complete.
- `/requests/sent` — customer's sent requests, with cancel and (post-completion) leave-a-review.
- `/profile/verify` — KYC status per document type (Aadhaar/DL/GST) and a
  form to submit a document number for verification.
- Profile page gains links to Verify identity, Edit worker profile
  (if you hold the `worker` role), and Requests sent.

## What's built (Phase 3 — Rent an Item)

- `/rent` — browse rental listings with category chips, verified-seller filter.
- `/rent/:category` — same browse experience pre-filtered by category slug.
- `/rentals/:id` — listing detail: photos, rates, deposit, delivery option,
  reviews, "Book Now" (opens a date-range modal that shows already-booked
  periods before you pick dates). Public — no login required.
- `/list-an-item` — create/edit your own listings; assigns the `item_owner`
  role automatically on first save. Includes a "My listings" management
  list with edit/delete.
- `/bookings/owner` — bookings received on your listings, with
  confirm/decline/mark-returned actions.
- `/bookings/mine` — bookings you've made, with cancel and
  (post-return) leave-a-review.
- Profile page gains links to My listings + Bookings received (if you hold
  the `item_owner` role), and My bookings for everyone.

## What's built (Phase 4 — Buy & Sell)

- `/marketplace` — browse product listings with category chips (icons
  mapped locally by slug, since `product_categories` has no icon column
  in the schema) and a condition filter (new/like new/used/refurbished).
- `/marketplace/:category` — same browse experience pre-filtered by
  category slug.
- `/products/:id` — listing detail: photos, price, condition, delivery
  option, "Contact Seller" (opens a quantity + message modal). No reviews
  section — the doc's Phase 4 scope doesn't include a review system for
  marketplace listings, unlike Hire/Rent. Public — no login required.
- `/sell` — create/edit your own listings; assigns the `seller` role
  automatically on first save. Includes a "My listings" management list
  with edit/mark-sold/delete.
- `/orders/seller` — orders received on your listings, with
  accept/decline/mark-complete actions.
- `/orders/mine` — orders you've placed, with cancel (while still
  "interested").
- Profile page gains links to My listings + Orders received (if you hold
  the `seller` role), and My orders for everyone.

## What's built (Phase 5 — Community Help + Emergency SOS)

- `/community` — feed with type filters, an SOS button (confirmation modal
  before firing — "single tap" opens the confirm, not the alert itself),
  and shortcuts to blood/medical/volunteers/lost-and-found.
- `/community/blood`, `/community/emergency` — thin redirects into
  `/community/new` with the type/urgency pre-filled, per the doc's
  shortcut behavior.
- `/community/new` — full request form (type, urgency, blood group when
  relevant, title, description, auto-close timer, contact visibility).
- `/community/:id` — request detail with respond/close actions. For SOS
  posts specifically, the "helpers on the way" count updates live via a
  Socket.IO listener — no manual refresh needed.
- `/community/volunteers` — nearby users with the `volunteer` role and a
  quick-call button.
- `/community/lost-found` — combined list + report form, with
  mark-resolved and delete for your own posts.
- `/profile/emergency-contacts` — the first UI for a CRUD API that's
  existed since Phase 1; lets you manage who gets an SMS if you ever send
  an SOS.
- Profile page gains a "become a volunteer" toggle and an emergency
  contacts link.
- A global `SosAlertListener` is mounted once in `AppShell`, so an
  incoming `sos:alert` shows a dismissible red banner on **any** page you're
  on, not just `/community` — a real emergency alert shouldn't be missed
  because you happened to be browsing `/hire`.

## What's built (Phase 6 — Learn Skills)

- `/learn` — browse courses with a free-text subject search (no category
  chips, since `courses.subject` has no backing categories table — unlike
  every other module's discovery flow) and an online/offline/hybrid filter.
- `/learn/:subject` — same browse experience pre-filtered by subject, used
  as a search term directly rather than a category lookup.
- `/courses/:id` — course detail: trainer info, reputation, mode/language/
  capacity, "Enroll" (disabled once the course hits capacity), reviews.
- `/become-a-trainer` — create/edit your trainer profile; assigns the
  `trainer` role automatically on first save.
- `/my-courses` — create a course and manage the ones you've created;
  links to a nested enrollments-management view (not in the original
  page list, but required to actually use the backend's
  `GET /enrollments/trainer` — same gap-filling pattern as earlier phases'
  category endpoints).
- `/my-enrollments` — courses you've enrolled in, with cancel
  (while pending) and leave-a-review (once confirmed/completed).
- Profile page gains a "My courses" link (if you hold the `trainer` role)
  and a "My enrollments" link for everyone.

## What's built (Phase 7 — Real-time Chat, Notifications, Admin, Moderation)

**Pass 1 — Chat + Notifications + Uploads:**

- **Bottom nav now has 4 tabs** instead of 2: Home, Messages, Notifications,
  Profile — both with live unread-count badges (red, capped at "9+") that
  update via Socket.IO without polling.
- `/messages` — conversation list with last-message preview and per-room
  unread counts.
- `/messages/:roomId` — real-time chat: text, image (uploaded directly to
  Cloudinary via the signed-upload flow, never through our server), and
  location sharing (tappable map-pin link). Shows delivered/read receipts
  and a throttled typing indicator. Deliberately rendered **outside** the
  bottom-nav shell — a full-screen conversation shouldn't compete with the
  tab bar for space, the same way most chat apps hide their nav while a
  conversation is open.
- `/notifications` — persisted notification feed with mark-read /
  mark-all-read (optimistic UI, reverts on failure).
- "Message" buttons added to worker profiles, rental listings, and product
  listings — per the doc's "initiated from worker profile, listing, or
  order page" requirement — each calling `chats/start` to find-or-create
  the room before navigating to the conversation.
- First real Cloudinary direct-upload implementation in the app (every
  prior phase's photo-upload UI was left as a documented gap) —
  `lib/cloudinary.ts`'s `uploadToCloudinary` posts straight to Cloudinary
  using a signature from our backend, so image bytes never pass through
  our server.

**Pass 2 — Admin + Reporting:**

- `/admin` — dashboard with quick links and at-a-glance counts (total
  users, pending verifications, open reports).
- `/admin/users` — search, suspend/unsuspend, and a one-way "Verify"
  action for users holding the worker or trainer role (the list view
  doesn't track each profile's current verification state, so this isn't
  a true toggle — it's documented as such in the code rather than glossed
  over).
- `/admin/verifications` — KYC review queue with approve/reject, reusing
  the exact same `syncVerifiedBadge` path a real provider webhook would
  trigger, so admin approval and automated confirmation behave identically.
- `/admin/reports` — review queue for the reporting system below.
- `/admin/categories` — tabbed by type (service/rental/product), since
  each has a genuinely different schema shape under the hood; create new
  categories, disable/enable existing ones via the override layer, delete.
- `/admin/analytics` — DAU, total users, new listings/requests today, open
  reports, pending verifications — with an honest note in the UI itself
  about DAU being an approximation (no dedicated session/activity log
  exists, so it undercounts pure-browsing visits).
- A reusable `ReportButton` component, wired into worker profiles, rental
  listings, product listings, courses, and community requests — per the
  doc's "Report button on any user/listing/request."
- `/admin/*` is gated by an `AdminRoute` guard that redirects non-admins
  away from the UI shell entirely — though the real security boundary is
  always the backend's role check; this is a UX nicety, not the actual
  enforcement.

## Testing the flows

1. Start the backend first (see `backend/README.md`) — without it, every
   API call here will fail with a network error.
2. Register via phone or email. If MSG91/SMTP aren't configured on the
   backend, check the **backend's terminal output** for the OTP code (it's
   logged in dev mode).
3. Complete onboarding (location + roles) to reach the home screen.
4. To test Phase 2 end-to-end you need **two accounts** — one becomes a
   worker via `/become-a-worker`, the other requests service from them via
   `/hire` → tap the worker → "Request Service". Accept/complete from the
   worker account's `/requests/inbox`, then leave a review from the
   customer account's `/requests/sent`.
5. To test Phase 3, list an item via `/list-an-item` on one account, then
   book it from another via `/rent` → tap the listing → "Book Now". Try
   booking the same item again with overlapping dates from a third account
   — you should see "this item is already booked for part of that period"
   rather than a generic error. Confirm and mark returned from the owner's
   `/bookings/owner`, then leave a review from the renter's `/bookings/mine`.
6. To test Phase 4, sell an item via `/sell` on one account, then express
   interest from another via `/marketplace` → tap the listing → "Contact
   Seller". Accept and mark complete from the seller's `/orders/seller`,
   then check the listing's quantity dropped to 0 and its status shows
   "sold" (visible on `/sell`'s My listings list).
7. To test Phase 5's SOS feature for real (not just by reading the code):
   add an emergency contact via `/profile/emergency-contacts` on one
   account, verify your phone if you haven't already, then open a second
   account in another browser/incognito window with a location within 5km
   of the first. Tap SOS → confirm on the first account; the second
   account should show a red banner within a couple seconds without
   refreshing. Check the first account's emergency contact for an SMS (or
   the backend terminal for a dev-mode log if MSG91 isn't configured).
8. To test Phase 6, become a trainer via `/become-a-trainer`, then create
   a course with `capacity: 1` via `/my-courses`. Enroll from a second
   account via `/learn` → tap the course → "Enroll". Try enrolling a
   *third* account in the same course — the button should already show
   "Full" and be disabled, and a direct API call would get a 409. Confirm
   and mark complete from `/my-courses` → "Enrollments received", then
   leave a review from the student's `/my-enrollments`.
9. To test Phase 7's chat, open two accounts in two browsers. From one,
   visit any worker/listing/product detail page and tap "Message" — this
   creates the room and navigates straight into it. Send a text, an image
   (needs real Cloudinary credentials — without them you'll get a 503;
   text messages work regardless), and a location pin. On the second
   account, confirm the message arrives live without a refresh, the
   Messages nav badge increments, and opening the conversation marks it
   read (badge clears, sender sees the read receipt update live).
10. To test notifications, trigger any of the events in the backend
    README's notification list (e.g. a new service request) while the
    recipient is logged out or on a different page, then check
    `/notifications` shows it — confirming it was actually persisted, not
    just a live event that would've been missed.
11. To test Phase 7 Pass 2, log in as the seeded admin account (see
    `backend/README.md`'s "Admin login" section for credentials) and visit
    `/admin`. Suspend a test user from `/admin/users` and confirm they
    can't log in afterward. File a report from any detail page's "Report"
    link, then confirm it shows up in `/admin/reports` and that resolving
    it there actually changes its status. Approve a pending KYC
    verification from `/admin/verifications` and confirm the affected
    worker/trainer's "Verified" badge appears on their public profile.

## Known limitations

- Profile photo upload UI isn't built yet; the backend signature endpoint
  (`POST /users/me/photo`) exists and is ready to wire up — note this is
  now inconsistent with chat's *new* generic upload flow
  (`POST /uploads/cloudinary-signature`), which profile photos should
  probably migrate to in a later pass rather than keeping two endpoints.
- Google OAuth requires real `GOOGLE_CLIENT_ID`/`SECRET` on the backend —
  there's no dev-mode mock for a full OAuth handshake.
- KYC verification falls back to a manual-review state without real
  Surepass/HyperVerge credentials — see `backend/README.md` for how to
  simulate a provider's webhook confirming a verification. (Admins can
  now also approve manually from `/admin/verifications`, which is the
  same underlying mechanism.)
- The booking date picker shows already-booked periods as a simple list,
  not a visual calendar grid — functional but not the polished UI the
  doc's "availability calendar" phrasing might suggest for a later pass.
- The SOS feature requires a real browser geolocation prompt to work end
  to end — it can't be meaningfully tested by reading code alone, and the
  README above calls out the specific two-browser test worth actually
  running.
- There's no course-editing UI yet — `/my-courses` only supports create;
  the backend's `PATCH /courses/:id` exists and is ready to wire up.
- Chat has no message-deletion, editing, or group-chat support — strictly
  1:1, per the doc's scope.
- The admin "Verify" action on `/admin/users` is one-way (always sets
  verified=true) rather than a true toggle, since the user list doesn't
  currently fetch each profile's existing verification state. A real
  toggle would need that join added.
- All five locale files (ta/hi/te/ml) now have genuine translations for
  the shared UI chrome (nav, auth, onboarding, profile, chat,
  notifications — 79 keys); the deeper feature-specific namespaces
  (hire/rent/market/community/learn/admin) still fall back to English.
  These are competent but not native-speaker-QA'd translations — fine for
  an MVP, not a substitute for professional localization before a real
  launch.
- SEO metadata in `index.html` is static and site-wide (Open Graph,
  Twitter card) — this is a client-rendered SPA with no SSR, so
  individual listings/profiles don't get their own meta tags or rank
  independently in search. Flagged directly in `index.html` itself.
- The accessibility pass was static analysis (alt text, aria-labels,
  `role="alert"` on the SOS banner, `lang` syncing with the active
  language) — no real screen-reader session or automated Lighthouse/axe
  audit was run, since there's no browser available in this build
  environment.
- CI (`.github/workflows/ci.yml`) runs lint/typecheck/test/build on push
  and PR, but there's no automated *deploy* step — deploy targets and
  secrets are environment-specific and intentionally left for whoever
  sets up hosting. It also uses `npm install` rather than `npm ci` since
  no `package-lock.json` is committed yet; the workflow's own comments
  explain how to switch once one exists.
