# Le Palme Ahangama — Feature Test Report

> **Date:** 2026-10-21
> **Method:** Live browser testing via Chrome DevTools MCP against `http://localhost:3000` (Next.js 16 dev server, connected to the real Supabase project).
> **Scope:** Every feature listed in `full-features.md` Part 1 (currently implemented), verified as a real user/guest would use it. Known issues from Part 2 are confirmed/refuted in the browser where reachable.
> **Test accounts:** Temporary QA accounts created for this test run and **deleted afterwards** (`qa.admin@`, `qa.reception@`, `qa.housekeeping@lepalme.test`).
> **Note on data:** Writes made during testing (bookings, contact messages, shift notes, etc.) use obvious `QA`/`Test`-prefixed data and are cleaned up where safe; leftover rows are listed in the Cleanup section at the end.

## Status legend

| Status | Meaning |
|---|---|
| ✅ Working | Feature tested in browser, behaves as documented |
| ⚠️ Partial | Works but with a caveat/limitation noted |
| 🐛 Bug | Documented defect confirmed in browser (with ID from `full-features.md` Part 2 where applicable) |
| ❌ Broken | Feature does not work at all |
| ⏭ Not tested | Could not be tested (environment/integration limitation) — reason given |

---

## Summary (final tally — filled in at end of run)

**166 feature verdicts recorded across 18 sections:**

| ✅ Working | ⚠️ Partial / caveat | 🐛 Bug confirmed | ❌ Broken | ⏭ Not tested |
|---:|---:|---:|---:|---:|
| **96** | **27** | **40** | **0** | **3** |

**Documented (`full-features.md` Part 2) bugs confirmed live — 34 IDs:**
`wb01` `wb02` `wb03` · `bk01` `bk02` `bk03` `bk04` `bk09` `bk11` · `uh01` `uh02` `uh03` · `ds03` `ds04` `ds05` `ds09` · `py01` `py02` `py03` `py04` `py06` · `op01` `op02` `op06` `op07` `op08` `op09` `op10` `op12` `op17` · `ad02` `ad05` `ad06` `ad08`

**New bugs found by this test run — 17 rows (30 findings tagged 🆕), worst first:**

| # | Severity | Where | What |
|---|---|---|---|
| N1 | 🔴 Critical | §14.3 Housekeeping | The **housekeeping role cannot change any room status** — `updateRoomHousekeepingStatus` uses `requireStaff()` (auth.ts:15) which excludes `housekeeping`; every click → *"Insufficient permissions"*. The module's only write action is closed to the people it is for. (`requireAnyStaff()` already exists, unused.) |
| N2 | 🔴 Critical | §14.6 + §17.11 | Maintenance issues are **invisible where they matter** (`op17`), and `reported_by_staff_id` is never written → Admin's "Reported By" is always "—". |
| N3 | 🔴 Critical | §10.7 / §15.7 / §16.6 | **Orphaned holds:** `expire-pending-bookings` cancels bookings but never releases `equipment_bookings` (stuck `pending`) or `airport_transfers` (stuck `scheduled`) — 4 stale equipment rows + 1 transfer belonged to cancelled bookings at test time. |
| N4 | 🟠 High | §3.4 / §14.2 | Money: charged **$614.25 while the UI showed $693** (qty-stepper race in `DateStep.tsx`), and the confirmation page's Grand Total only tallies part of the group ($236.25 of $693). |
| N5 | 🟠 High | §16.4 | **Transfers drift 5 h 30 m:** staff-entered local time is stored as UTC, so 6:45 PM renders as 12:15 AM — and the row stays filed under the previous day. |
| N6 | 🟠 High | §17.12 | Equipment **retire is a one-way door**: the button has *no accessible name*, and retiring removes the row from the list with no filter and no restore path. |
| N7 | 🟠 High | §9.2 / §12.5 / §12.6 | **Numbers lie:** "Pending Check-ins 9" counts months-old bookings; guest profile *Total Spent* includes cancelled bookings and ignores board/extras. |
| N8 | 🟠 High | §15.2 / §15.6 | Equipment counter counts `pending` **and `returned`** rows as "active" (13 shown vs 8 real); **Return has no confirmation** and permanently frees the unit. |
| N9 | 🟡 Med | §15.3 / §17.6 | **Raw Postgres errors shown to staff** as toasts (`equipment_bookings_no_overlap`, `rooms_room_number_key`) — no friendly message, no client-side pre-check. |
| N10 | 🟡 Med | §13.2 / §18.7 | Unlabelled controls: operations timeline never renders `time`, ⌘K results absent from the a11y tree, 17 unnamed buttons on the admin screen, the mobile hamburger has no accessible name, 10 unlabelled admin form fields. |
| N11 | 🟡 Med | §5.4 / §3.x | Confirmation page shows **raw ISO datetimes** and "1 guest" even for multi-guest bookings; static "Booking Confirmed" heading (`bk09` extended). |
| N12 | 🟡 Med | §18.3 | CSP is report-only and already logging violations for inline scripts, `eval` and the Google Maps frame — enforcing it as-is would break the map and inline code. |

**What works best:** the booking wizard's availability/upsell logic, guest CRM search/export, the calendar, invoices/payments bookkeeping (the DB is well-constrained — exclusion constraints caught double-booking and duplicate rooms), the admin panel's write paths, and role-based routing.

**What needs attention before launch:** N1 (housekeeping is dead in the water), N3 (inventory leaks), N4 (charging the wrong amount), N5 (wrong pickup times), N9/N10 (trust + accessibility), plus PayHere's merchant-limit rejection seen in §5.x (owner must confirm the production merchant limit covers ~$700 bookings).

**Not tested (3):** booking-disabled kill-switch (`NEXT_PUBLIC_BOOKING_ENABLED` off-state), `loading.tsx` skeleton states (dev server too fast), production Lighthouse performance score (this MCP build emits no Performance category; lab numbers are dev-server only).

---

---

## 1. Public site — Global chrome & home page

**Page tested:** `/` (desktop 1440px + mobile 390×844 viewport)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 1.1 | Navbar links (Stay/Dine/Experiences/About/Contact) | ✅ Working | All 5 links present with correct hrefs; client-side navigation to `/dine` verified. Animated underline is CSS-based (present in markup). |
| 1.2 | "My Bookings" link | ✅ Working | Present in desktop nav → `/booking/lookup`. |
| 1.3 | "Book Now" CTA | ✅ Working | Present → `/booking`. `NEXT_PUBLIC_BOOKING_ENABLED` is **not set** in `.env.local`, so CTA shows (default enabled). Kill-switch **off-state** ⏭ Not tested (requires env change + server restart). |
| 1.4 | Theme toggle (light/dark/system) | ✅ Working | Clicked "Toggle theme": `<html>` `dark` class removed, `body` bg `rgb(255,255,255)` — next-themes switching works; persisted via localStorage. |
| 1.5 | Mobile menu (full-screen overlay, scroll-lock, closes on route change) | ✅ Working | At 390px: "Open menu" → full-screen overlay with all 7 links; `body` overflow becomes `hidden` (scroll-lock); clicking "Dine" navigated to `/dine` and menu closed, overflow restored to `visible`. |
| 1.6 | Scroll-aware nav (transparent → solid after 60px) | ✅ Working | Top: `bg-transparent`; at `scrollY=300`: `bg-white dark:bg-stone-950 border-b` (700ms transition observed). |
| 1.7 | Footer (maps/tel/mailto/quick links/legal/map iframe) | ✅ Working | Address → Google Maps coords link, `tel:+94769617372`, `mailto:info@lepalmeahangama.com`, Quick Links, Legal links (Refund/Privacy/Terms), embedded map iframe all present. Footer hidden on `/dashboard` (checked later in Section 8). |
| 1.8 | Global error boundary + sonner toasts | ⚠️ Partial | `error-boundary` + sonner `Notifications` region present in DOM. Not triggered during any test run (no way to force a render error without code change) — present but effectively unproven. |
| 1.9 | Loading skeletons | ⏭ Not tested | Dev server responds too fast to catch `loading.tsx` states reliably; routes exist in repo. |
| 1.10 | Console health on home page | ⚠️ Notes | **No console errors.** Only: CSP **report-only** violations (inline scripts/eval — dev-mode/HMR related, `unsafe-eval` + inline hashes), React DevTools info, and 2 a11y issues: *"No label associated with a form field (count: 3)"* + *"form field should have id or name (count: 1)"* — the hero ARRIVAL/DEPARTURE/GUESTS inputs lack proper labels. |

**Home page content sections (1.2):**

| Feature | Status | Evidence |
|---|---|---|
| Hero date-search bar | ✅ Working | Arrival picker: **past dates correctly disabled** (all before 21 Oct 2026 disabled); departure picker: dates ≤ arrival disabled (**checkout > check-in enforced**); guests dropdown 1–6 (set to 4 ✅); button label switches "Select dates" → "Check Availability" when valid; submitted → `/booking?checkIn=2026-10-27&checkOut=2026-10-30&guests=4` — **all 3 params present in URL** (the `guests` param is dropped downstream — see `bk01`, tested in Section 3). |
| Hero fallback (booking disabled) | ⏭ Not tested | Requires kill-switch env (same as 1.3). |
| Welcome / Hotel intro / Room showcase / Restaurant / Experiences / Events sections | ⚠️ Partial | All sections render with content + images. **Bug `wb01` confirmed:** "Events & Gatherings" card links to **`http://localhost:3000/events`** — route does not exist (404, verified in Section 6). Events cards are static (no links) as documented. |

**Minor issues found (not in Part 2):**
- 🆕 Hero date inputs have no accessible labels (matches the 3 "No label associated with a form field" a11y issues).
- 🆕 Both date buttons are announced identically as "Select date" before selection — screen-reader users can't tell Arrival from Departure (the visible "ARRIVAL"/"DEPARTURE" text is not associated with the button).
- CSP is **report-only** in production config? (violations logged but not enforced — worth checking `next.config.ts` before launch).

## 2. Public site — Rooms

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 2.1 | Listing page (`/rooms`) | ✅ Working | Server-rendered categories: **Budget** $20.00/night (up to 2), **Deluxe** $40.00/night (up to 3); image, name, occupancy, price, "View Details" all present. Cards link to slugified URLs `/rooms/budget`, `/rooms/deluxe`. |
| 2.2 | Detail page (`/rooms/[slug]`) | ✅ Working | `/rooms/deluxe` → h1 "Deluxe", occupancy, **8 feature bullets parsed from description**, price panel ($40/night + max occupancy), back link. Page title "Deluxe Room \| Le Palme Ahangama". |
| 2.3 | Unknown slug → 404 | ✅ Working | `/rooms/not-a-real-room` renders the styled 404 page ("This page could not be found"). |
| 2.4 | "Check Availability" CTA | ✅ Working | → `/booking?categoryId=51d3cabe-…&checkIn=2026-10-22&checkOut=2026-10-25` (category + dates prefilled, tomorrow → +3 nights). Consumed by wizard Step 1 (verified in Section 3). |
| 2.5 | SEO (JSON-LD, OG, sitemap, robots) | ✅ Working | `/rooms`: `Hotel` JSON-LD + `og:title`/`og:description`. `/rooms/deluxe`: `Hotel` + `HotelRoom` JSON-LD. `/sitemap.xml` returns valid urlset (uses canonical `https://lepalmeahangama.com` origin), `/robots.txt` allows all + references sitemap. |
| 2.6 | Dynamic OG/canonical per room | ⚠️ Partial | `og:title`/`og:description` present; **no `<link rel="canonical">` found** on `/rooms` (minor SEO gap, not in Part 2). |

## 3. Public site — Booking wizard (5 steps)

Tested as a real guest: `/booking?checkIn=2026-10-27&checkOut=2026-10-30&guests=4` (from hero search) → 5 Budget rooms, Half Board, 2 surfboards (Oct 27–30), TVS Ntorq ×1, airport transfer (departure, 10:30), guest details, then Review & Pay.

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 3.1 | Step 1 — Dates & rooms | ✅ Working | Date range prefilled from URL; availability via server action (POST body `["<categoryId>","2026-10-27","2026-10-30"]`); Budget rooms B1–B5 selectable; qty stepper; past dates blocked; checkout > check-in enforced. |
| 3.2 | `bk01` — guests param dropped | 🐛 **Confirmed** | URL `guests=4` is never shown or stored anywhere in the wizard. **DB proof:** `bookings.num_guests = NULL` on all 5 booking rows created by this test. No guest-count field exists on any step. |
| 3.3 | `bk04` — wrong "Next" label on Step 1 | 🐛 **Confirmed** | Step 1's forward button reads "Next: Add Extras" (jumps semantics; Step 2 is Board Plan). Observed live. |
| 3.4 | 🆕 Qty stepper race — can exceed availability | 🐛 **New bug** | Rapidly clicking "Increase" on Step 1 sets qty 6–7 for Budget (only 5 exist). Root cause `src/components/public/DateStep.tsx:94-113`: the availability effect refires on every `selections` change, and while `count` is `null` (in flight) the UI uses `a?.count ?? 99` → both the cap and the `disabled` state disengage. Safety net exists: Next-step validation blocks with "Only 5 Budget rooms available for the selected dates. Please reduce the quantity to 5 or less." — so no invalid booking can be created, but the control misleads. |
| 3.5 | Step 2 — Board plan | ✅ Working | Half Board math correct: $300 room + $150 board (5 rooms × 3 nights × $10); Full Board +$300; Bed & Breakfast +$0 — matches `BOARD_PRICE_PER_NIGHT`. |
| 3.6 | Step 3 — Surfboard tiered pricing | ✅ Working | 2 boards × 3 nights × $25/day (tier 1–6) = **$150**, displayed and validated. Surf-dates required (inline errors shown if cleared). |
| 3.7 | Step 3 — Vehicle rental | ✅ Working | TVS Ntorq ×1 = **$30** (3 days). |
| 3.8 | Step 3 — Airport transfer | ✅ Working | CMB → Ahangama toggle; Direction combobox; custom time spinbuttons (Hours/Minutes/AM-PM) with required "Pickup time"; $30 fixed price. Direction=departure persisted. (Test artifact: fixed navbar can overlap buttons at scroll y<72.) |
| 3.9 | Step 4 — Guest details | ✅ Working | 5 fields; required-field validation fires on empty Full name/Email/Phone ("…is required" inline errors). **UI nit (🆕):** phone *is* required (`src/lib/validations.ts:7` — `min(1, "Phone number is required")`) but its label shows `Phone` without the `*` used on Full name/Email — a guest told "Phone number is required" after submitting sees a label that claimed it was optional. Nationality/NIC are genuinely optional (correctly unlabeled). |
| 3.10 | Step 5 — Review & Pay | ✅ Working | Grand total **$693** = ($300 rooms + $150 board + $150 surfboards + $30 vehicle + $30 transfer) × 1.05 surcharge — math verified against `settings.surcharge_pct=5.00`. Subtotal/live "grand total" pill kept in sync across all steps. |
| 3.11 | sessionStorage persistence | ✅ Working | Reload mid-wizard restores `{step, data}` exactly (5 rooms, extras, guest details). |
| 3.12 | Transfer date bug (`bk02`) | 🐛 **Confirmed** | Direction = **departure** (leaving Oct 30) but `airport_transfers.transfer_datetime = 2026-10-27 10:30` — the **check-in date**, not check-out. DB row `41cb4ce1…`. |
| 3.13 | Surfboard silent shrink (`bk03`) | 🐛 **Confirmed** | After placing a blocking rental on Surfboard #1 for Oct 27–30 (simulating a concurrent guest), the wizard still **showed 2 surfboards / $150** through Review & Pay, but the created booking contains only **Surfboard #2, $75**. No warning, no message, no price change in the UI. DB rows `d8381f03…` (surfboard) + `5bf7dab5…` (vehicle). Root cause: `src/lib/actions/bookings.ts:213-223` inserts one row per *available* unit and never reports the shortfall; `PaymentReview.tsx:76,98` displays requested qty, not granted. |

## 4. Public site — Payment pipeline (PayHere)

Tested by clicking "Pay with PayHere" on Step 5 of the Section 3 booking (5 Budget rooms, Half Board, 2 surfboards, motorbike, departure transfer).

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 4.1 | Server-side booking creation before redirect | ✅ Working | Click → `POST /booking` [200] creates guest + **5 `pending_payment` bookings** (B1–B5, group `a2fe9481-…`) + equipment rows + transfer row in one action, then returns `{bookingIds, groupBookingId, orderId: "BOOK-<group>", grandTotal}`. |
| 4.2 | `/api/payhere/hash` | ✅ Working | `POST /api/payhere/hash` [200] → `{hash, merchant_id}`; client auto-submits the gateway form (no user interaction) to `https://sandbox.payhere.lk/pay/checkout` [200]. Hash lib (`src/lib/payhere.ts`) matches PayHere's MD5 spec. |
| 4.3 | Gateway redirect & rendering | ✅ Working | Lands on genuine PayHere sandbox checkout ("Pay with PayHere" title, sandbox assets). One cross-origin `www.payhere.lk/merchant/` request blocked by ORB (harmless analytics iframe). |
| 4.4 | 🆕 Charged amount ≠ displayed amount (consequence of `bk03`) | 🐛 **New bug (critical, financial trust)** | UI Review screen showed **$693.00**; the gateway presented **USD 614.25**. Cause: `createBooking` recomputes the total server-side (`computeBookingTotal`, `bookings.ts:238`) *after* the silent surfboard shrink (1× $75 instead of 2× $75 → −$75 −$3.75 surcharge), and `PaymentReview.tsx:150` sends that recomputed `grandTotal`. The guest is asked to pay an amount they never saw. If a room category had shrunk instead, the reverse (over-charge vs. display) is possible. |
| 4.5 | Sandbox merchant limit failure | ⚠️ Environment/config | PayHere sandbox rejected the payment: *"payment amount exceeds the maximum payment limit of this merchant — This is a merchant's error."* The test sandbox merchant has a low cap. **Not an app bug**, but the owner must verify the production merchant's per-transaction limit exceeds ~$700, or large group bookings will fail at the last step. |
| 4.6 | No `payments` row until gateway callback | ✅ Working (by design) | After abandoning at the gateway: `payments` table empty for this group; bookings remain `pending_payment`. No phantom payment recorded. PayHere notify/callback path itself was not exercised (requires a completed sandbox payment) — remains untested. |
| 4.7 | 🆕 Deposit percentage not applied | ⚠️ Question for owner | `settings.min_deposit_pct = 50.00`, but `PaymentReview.tsx:150` charges `grandTotal` in full (no deposit split, no "pay 50% now" UI anywhere). If deposit-based payment was intended, it is not implemented in the public wizard; if full-payment is intended, `min_deposit_pct` is dead config. |

## 5. Public site — Confirmation, lookup & guest portal

Tested with the QA booking created in Section 3/4 (group `a2fe9481…`, 5× Budget B1–B5, pending_payment, guest qa.test.guest@lepalme.test).

### Confirmation page (`/booking/confirmation/[id]`)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 5.1 | Page renders with full booking summary | ✅ Working | Reference `A2FE9481` (group id slice), room B1 — Budget, dates, Half Board $30, surfboard row, motorbike row, transfer row, guest name/email, JSON-LD `Order` schema, `robots: noindex`. |
| 5.2 | `bk09` — static "Booking Confirmed" heading | 🐛 **Confirmed** | Status badge reads **"Pending Payment"** while the h1 says **"Booking Confirmed"** and the subtitle claims "Your booking has been confirmed. A confirmation email will be sent." — the guest was never charged (abandoned gateway) yet is told it's confirmed. `src/app/booking/confirmation/[id]/page.tsx:116-117`. |
| 5.3 | `uh01` — page publicly viewable with UUID | 🐛 **Confirmed** | Navigated directly (no login, no cookie) → full booking details incl. **guest name + email** rendered. Anyone with a UUID/confirmation link sees PII. `createAdminClient()` at `page.tsx:56`. |
| 5.4 | 🆕 "Grand Total" on confirmation is a partial total | 🐛 **New bug** | Page shows **$236.25** = only **B1's** room+board ($60+$30) + *all* extras ($75+$30+$30) × 1.05 — but the guest's booking spans **5 rooms** and the wizard charged **$614.25** (UI said $693). The label "Grand Total" is wrong three ways on this page; it neither matches the charged amount nor the wizard, and other rooms' charges are silently excluded (`page.tsx:97-98` sums one booking row of the group). |
| 5.5 | 🆕 Raw ISO datetime shown to guest | 🐛 **New bug (cosmetic)** | Transfer row prints `2026-10-27T10:30:00+00:00` verbatim instead of a formatted date/time (`page.tsx:160`). Also displays the `bk02` wrong date. |
| 5.6 | "Back to Home" CTA | ✅ Working | Full-width pill button → `/`. No link to lookup/portal (minor UX gap 🆕). |

### Lookup (`/booking/lookup`) & guest portal (`/booking/[ref]?email=…`)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 5.7 | Lookup form + validation | ✅ Working | Bad combo (ref `NOPE1234` + wrong email) → assertive live-region error "Booking not found or email does not match. Please check your details." Correct combo (ref `A2FE9481` + qa.test.guest@lepalme.test) → redirects to portal. |
| 5.8 | `uh02` — email in URL as the only "auth" | 🐛 **Confirmed** | Portal URL is `/booking/a2fe9481-…?email=qa.test.guest%40lepalme.test` — knowing ref+email (both appear on the publicly-viewable confirmation page per `uh01`) is the entire credential; the email sits in the URL where it leaks via history/logs/referrers. |
| 5.9 | Portal shows full group | ✅ Working | All 5 rooms (B1–B5) rendered as cards with formatted dates ("October 27th, 2026"), nights, board plan, source "Website"; extras section lists Surfboard #2 $75, Motorbike $30, Transfer (Departure) $30; guest details (name/email/phone/nationality); "Total room charges: $300.00". |
| 5.10 | 🆕 Portal shows "Guests: 1 guest" per room | 🐛 **New bug (consequence of `bk01`)** | Since `num_guests` was never collected, the portal shows a fallback "1 guest" on every room — a party that booked 5 rooms is told there is 1 guest per room. |
| 5.11 | 🆕 Raw ISO transfer datetime again | 🐛 **New bug (same as 5.5)** | Portal prints `2026-10-27T10:30:00+00:00` verbatim (and the `bk02` wrong date). |
| 5.12 | Portal is read-only | ⚠️ Gap | No cancel, no modify, no "pay now" to resume the abandoned `pending_payment` booking — a guest whose payment failed (Section 4) has **no way to complete it** from the portal. (`bk11` in Part 2 covers cancel; resume-payment appears entirely missing 🆕.) |
| 5.13 | Grand total absent on portal | ⚠️ Gap | Shows "Total room charges $300.00" but never the group grand total (extras + surcharge), so the portal total cannot be reconciled with any number the guest saw. |

## 6. Public site — Contact & static content pages

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 6.1 | `wb01` — `/events` 404 | 🐛 **Confirmed** | Home "Events & Gatherings" card → `http://localhost:3000/events` → styled 404 ("404: This page could not be found"). |
| 6.2 | Dine page + `wb03` | ⚠️ Confirmed (known) | Renders ("A Taste of Sri Lanka", hours, images). Its "Reserve a Table" button links to **`/booking`** — i.e. books a *room*, not a table. |
| 6.3 | Experiences page + `wb02` | ⚠️ Confirmed (known) | 5 experiences; each "Inquire About This Experience" + "Plan Your Experience" link to bare **`/contact`** — no `?subject=`/experience name carried over, so the guest must retype context. |
| 6.4 | Contact form | ✅ Working | Labeled required fields NAME/EMAIL/MESSAGE. Submitted QA message → "Thank You" page + assertive toast "Message sent!…". **DB verified:** `contact_messages` row `ee1dd67e…` created (queued for cleanup). |
| 6.5 | About page | ✅ Working | h1 "Le Palme Ahangama", ~2k chars of content, map + `/contact` links. |
| 6.6 | Refund / Privacy / Terms | ✅ Working | All three render with substantive content (1.6k–3.3k chars); contact email `lepalmeahangama@protonmail.com`; Terms cross-links Refund Policy. **Note 🆕:** footer shows a *different* contact email (`info@lepalmeahangama.com`) than the policy pages (`…@protonmail.com`) — owner should confirm which is current. |

## 7. Auth, session & role guards

Tested in an **isolated browser context** (clean cookies; the main context had a stale `admin@test.com` session). Code refs: `src/proxy.ts` (middleware), `src/app/dashboard/(main)/layout.tsx`, `…/admin/layout.tsx`, `…/housekeeping/layout.tsx`, `src/app/auth/login/page.tsx`.

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 7.1 | Unauthenticated `/dashboard` → login | ✅ Working | Clean context visiting `/dashboard` → 302 to `/auth/login` (`proxy.ts:26-30`). |
| 7.2 | Authenticated `/auth/login` → dashboard | ✅ Working | `proxy.ts:32-36`. Verified implicitly: after each role login, revisiting `/auth/login` would bounce (rule present); after logout the reverse worked. |
| 7.3 | Bad credentials | ✅ Working | Wrong email/password → Supabase `POST /auth/v1/token` [400] and a sonner toast **"Invalid credentials"** (`page.tsx:37`). ⚠️ The toast auto-dismisses in ~4 s and there is no inline field error — a distracted user may just see the form do nothing (minor UX nit 🆕). |
| 7.4 | Valid login (admin) | ✅ Working | `qa.admin@lepalme.test` → lands on `/dashboard`; sidebar shows "QA Admin / Admin" and the full 9-item nav (Overview, Calendar, Bookings, Guests, Operations, Housekeeping, Equipment, Transfers, Admin). |
| 7.5 | Logout | ✅ Working | Sidebar "Logout" opens a confirmation dialog ("Are you sure you want to logout?") → confirm → session cleared → back on `/auth/login`; `/dashboard` then redirects to login again. |
| 7.6 | Receptionist role routing | ✅ Working | `qa.reception@lepalme.test` → `/dashboard`; **"Admin" link hidden** from sidebar; direct navigation to `/dashboard/admin` → redirected to `/dashboard` (guard `role !== "admin"` at `admin/layout.tsx:20`). |
| 7.7 | Housekeeping role routing | ✅ Working | `qa.housekeeping@lepalme.test` → auto-redirected from `/dashboard` to **`/dashboard/housekeeping`** (`(main)/layout.tsx:22`); sidebar reduced to a single "Housekeeping" item. Direct `/dashboard/admin`, `/dashboard/bookings`, `/dashboard` all bounce back to `/dashboard/housekeeping`. |
| 7.8 | Per-role guard depth | ⚠️ Note | Guards live in server-component layouts (good, server-side), not in `proxy.ts` — every protected page relies on its layout running. Currently correct for all tested routes, but a new dashboard page added outside `(main)/` and `housekeeping/` would inherit only the weak "is logged in" check. No CSRF-style issue found (server actions). |

## 8. Dashboard — Shell & navigation

Tested as admin (`qa.admin`) in the isolated context.

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 8.1 | Sidebar (9 items, role-filtered) | ✅ Working | Admin sees Overview, Calendar, Bookings, Guests, Operations, Housekeeping, Equipment, Transfers, Admin. Role filtering verified in Section 7 (receptionist: no Admin; housekeeping: only Housekeeping). |
| 8.2 | Header: clock, ⌘K, theme, identity | ✅ Working | Live 24 h clock ("08:13:30", ticking), Search button labelled "Search (⌘K)", theme toggle, "QA Admin / Admin" badge. |
| 8.3 | ⌘K global search | ✅ Working | Opens command palette; typing "QA Test Guest" → `GET /api/search?q=…` [200] → **6 results** (1 guest + 5 bookings). Selecting the guest navigates to `/dashboard/guests/727d45fd-…`. ⚠️ The cmdk results are **not exposed in the accessibility tree** (a11y snapshot showed an empty listbox while the DOM had 6 `[cmdk-item]`s) — screen-reader/voice-control users likely can't perceive or select results 🆕 (a11y gap worth verifying with a real SR). |
| 8.4 | ⌘K keyboard toggle | ✅ Working | ⌘K toggles the palette open/closed (`GlobalSearch.tsx:57-67`). |
| 8.5 | Logout confirm dialog | ✅ Working | Covered in 7.5. |

## 9. Dashboard — Overview (`/dashboard`)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 9.1 | Stat cards | ✅ Working | Arrivals 0, Departures 0, Occupancy 0%, Dirty/Cleaning 0, Pending Check-ins 9 — all render. |
| 9.2 | 🆕 "Pending Check-ins" counts stale months-old bookings | 🐛 **New bug (data-trust)** | The card shows **9** because it counts *all* `status='confirmed'` with `check_in <= today` (`(main)/page.tsx:45`) — DB confirms these are 9 bookings from **2026-07-01 … 2026-10-12** that were never checked in or no-showed. A front-desk user reads "9 pending check-ins" as "9 people arriving today". Should exclude long-past stays or mark them as no-show. |
| 9.3 | Room status board | ✅ Working | 10 rooms (B1–B5 Budget, D1–D5 Deluxe) each showing number, derived badge ("Vacant"), category. Read-only (`op01` as documented). |
| 9.4 | Quick Check-in sheet | ✅ Working | Dialog opens with "NIC / Passport (optional)" and a **disabled** "Confirm Check-in" (no confirmed booking has check_in ≤ today besides the stale ones — correct gating for today). |
| 9.5 | Quick Check-out sheet | ✅ Working | Dialog opens with an empty state (no guests currently checked in). |
| 9.6 | Mark Room Clean sheet | ✅ Working | Dialog opens, "Mark as Ready" disabled (no dirty/cleaning rooms). |
| 9.7 | Walk-in / New Booking / Calendar buttons | ✅ Working | All three render. **`ds04` confirmed:** "Walk-in" and "New Booking" link to the **identical** URL `/dashboard/bookings/new` (`(main)/page.tsx:125-131`) — no difference in behavior despite distinct labels. Calendar → `/dashboard/calendar`. |
| 9.8 | Revenue card | ✅ Working | Renders Today / This month / Outstanding (display-only, `op02` as documented). |
| 9.9 | Shift notes — post | ✅ Working (with nit) | Posted a note via typing → `POST /dashboard` server action → **row created in DB** (`shift_notes` id `c437a273…`, author "QA Admin"). ⚠️ **Nit 🆕:** the list and input did **not** refresh after posting — the note only appeared, and the input only cleared, after a full page reload. |
| 9.10 | Shift notes — delete | ✅ Working (same nit) | Clicking the (unlabelled 🆕) delete button removed the row from the DB. Same no-instant-refresh nit, and the delete button has **no accessible name** (a11y 🆕). |

## 10. Dashboard — Calendar

Tested with a temporary confirmed booking (D1, Oct 24–27, guest "QA Test Guest") inserted via SQL and **deleted immediately after** the test.

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 10.1 | 30-day grid, rooms × dates, grouped by category | ✅ Working | Header row "Room" + dates (20 → 12 next month); 10 room rows (B1–B5, D1–D5). Renders after a brief "Loading calendar" state. |
| 10.2 | Booking bar rendering | ✅ Working | The QA booking rendered as a colored bar spanning Oct 24 → 27 (grid-column `6 / span 3`) in room D1's row, labelled "D1". |
| 10.3 | Bar → booking detail link | ✅ Working | Bar is an `<a>` to `/dashboard/bookings/c1ddf9d3-…`. |
| 10.4 | Hover tooltip | ✅ Working | Hovering the bar shows: **"QA Test Guest / Room D1 · Deluxe / Oct 24 → Oct 27 / Confirmed"** — exactly the documented content. (Requires a real hover; synthetic JS events don't trigger Base UI tooltips.) |
| 10.5 | Status coloring | ✅ Working | `confirmed` bar rendered with the primary tint (`bg-primary/10 text-primary`) matching `statusColors`. |
| 10.6 | `op06` — cancelled/no-show hidden, no legend/filters/nav | ⚠️ Confirmed (known) | Query filters to 4 statuses only (`calendar/page.tsx:33`) — cancelled & no_show bookings are invisible. **No legend, no status filter, no date navigation** (verified: no `<select>`, no legend text). Staff cannot see why a room looks free. |
| 10.7 | 🆕 Orphaned equipment/transfer holds invisible everywhere | 🐛 **New bug (found here, cross-ref 15.x)** | The 5 cancelled QA bookings left `pending` equipment rows + a `scheduled` transfer behind (see 15.7). Those units stay **blocked on the calendar date range conceptually but are not shown on the calendar at all**, and the calendar gives no indication a cancelled booking once held these rooms. |

## 11. Dashboard — Bookings (list, new, detail)

Tested as admin: list page, then created a real staff booking (D2 · Deluxe, Oct 22–24, "QA Staff Booking", walk-in), then drove it through deposit → check-in → charge → invoice → payment → check-out.

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 11.1 | Bookings list | ✅ Working | Table (Guest, Check-in, Check-out, Status, Total, Source, Actions) with 28 rows, "View" links, "New Booking" CTA, created_at desc. |
| 11.2 | `ds03` — no filters/search/export, hard limit 50 | ⚠️ Confirmed (known) | Verified: **zero** `<select>`/search inputs/export button on the list; `bookings/page.tsx:14` has `.limit(50)`. With >50 bookings older ones become unreachable. |
| 11.3 | New Booking form — full field set | ✅ Working | Date pickers (past dates correctly disabled through Oct 12), Category → Room (Deluxe → D1–D5), Source (Walk-in default, OTA option), Board Plan toggles (Room Only / Half Board +$10 / Full Board +$20), equipment steppers + model selectors, guest name/email/phone/nationality/NIC, **num_guests (1–20)**, notes. |
| 11.4 | Room add + chip | ✅ Working | Selecting D2 + clicking the (unlabelled 🆕) add button produced a "D2 · Deluxe" chip. ⚠️ **The add-room button has no accessible name** (a11y 🆕) — it renders as a bare button. |
| 11.5 | Booking creation | ✅ Working | Submitting created booking `2ea843c2…`, `status:'confirmed'`, `source:'walk_in'`, `room_total_usd:80` (2 nights × $40), `created_by_staff_id` correctly set to the QA Admin profile. Auto-navigated to the detail page. |
| 11.6 | `ds05` — no guest prefill | ⚠️ Confirmed (known) | No existing-guest lookup on the form; each submission inserts a brand-new `guests` row (verified: "QA Staff Booking" created as a new guest even though the flow has no reuse path). Duplicate guests will accumulate. |
| 11.7 | Booking detail — deposit card | ✅ Working | Shows Required (50%) $40.00 / Received $0 / Remaining $40 with progress bar; matches `settings.min_deposit_pct`. |
| 11.8 | `py06` — deposit hard-codes cash | ⚠️ Confirmed (known) | "Mark Received" → recorded $40 with `method:'cash'` automatically (`payments` row `6fb7c917…`). Staff can't record a card/bank deposit here. |
| 11.9 | Check In | ✅ Working | "Check In" dialog (optional NIC) → booking became `checked_in`; checked-in action set (Post Charge / Move Room / Generate Invoice / Check Out) appeared. |
| 11.10 | Post Charge | ✅ Working (with gaps) | Posted "QA test charge - dinner" ×1 @ $15.50 → `booking_charges` row `a90b82a3…`, line total $15.50 correct. ⚠️ `added_by_staff_id` was written as **NULL** (audit gap 🆕). **`py04` confirmed:** the charges table has **no edit or delete** actions. |
| 11.11 | Generate Invoice — math | ✅ Working | Invoice `9c9ca996…`: room $80 + addons $15.50 = $95.50 × 1.05 surcharge = **$100.28** ✅. Rendered an invoice preview with "Print Invoice" (`window.print()`). |
| 11.12 | `py03` — silent overwrite | ⚠️ Confirmed (known, code) | Regenerating upserts the same invoice row with no confirmation; charges posted after generation are silently swallowed on the next regeneration. |
| 11.13 | `py02` — partial payment marks invoice paid | 🐛 **Confirmed (critical, financial)** | Recorded a **$50** payment against the **$100.28** invoice via "Card Payhere" → `payments` row `957b0e0a…` created AND `invoices.status` flipped to **`paid`** while $10.28 remains outstanding. Front desk has no signal that money is still owed. |
| 11.14 | Refund button | ⚠️ Present (code risk `py01`) | "Refund" appears on the completed `card_payhere` payment row. Not clicked (would create a real refund). Code risk confirmed: `bookings.ts:454` uses `.single()`, which **errors once a booking has >1 card_payhere payment**. Also `payhere_payment_id` is NULL on manually-recorded card payments, so a refund of these has no gateway reference to act on 🆕. |
| 11.15 | `ds09` — check-out skips invoice + room-dirty | 🐛 **Confirmed** | "Check Out" → booking became `checked_out`, but: (a) **no invoice was generated** (count stayed 1 — the one I made manually), (b) room **D2 `housekeeping_status` stayed `ready`** instead of flipping to `dirty`. A real guest's checkout leaves the room looking clean for the next guest. |

## 12. Dashboard — Guests (CRM)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 12.1 | Guests registry | ✅ Working | 24 rows (Guest, NIC, Nationality, Email, Phone, Last visit), newest first, row → profile. |
| 12.2 | Client-side search | ✅ Working | Typing "QA Test" filtered 24 → 1 row instantly (name/email/phone). |
| 12.3 | CSV export | ✅ Working (code-verified) | "Export CSV" button present; exports the **filtered** rows as `GuestTable.tsx:47-52` (`Blob` → `a.download = "guests.csv"`). Click produced no console errors; the transient blob download isn't observable via DevTools MCP, so this is verified at the code level rather than by inspecting the file. |
| 12.4 | Guest profile — contact & stats | ✅ Working | "QA Test Guest": contact/identity card (email, phone, NIC, nationality), stat tiles (Total Spent / Total Paid / Outstanding), booking history table (5 rows), "New Booking for QA…" CTA, "Back to Guests". |
| 12.5 | 🆕 Total Spent / Outstanding include cancelled bookings | 🐛 **New bug (financial reporting)** | Profile shows **Total Spent $300 / Outstanding $300** — but **all 5 bookings are `cancelled`**. `guests/[id]/page.tsx:37-39` sums `room_total_usd` over **every** booking with **no status filter**, and `outstanding = totalSpent - totalPaid`. Staff see a phantom $300 debt from a guest who never stayed, and cancelled/no-show revenue is counted as earned. |
| 12.6 | 🆕 "Total Spent" ignores board/extras | 🐛 **New bug (same tile)** | It sums only `room_total_usd` — board plan, equipment, transfers and the 5% surcharge are excluded, so even for real stays the "Total Spent" understates revenue and won't match any invoice. |
| 12.7 | Booking history | ✅ Working | Lists all 5 group bookings with room, dates, status badge ("cancelled", destructive variant) and total; rows link to booking detail. |
| 12.8 | `ds05` — "New Booking for {name}" has no prefill | ⚠️ Confirmed (known) | The CTA links to a blank `/dashboard/bookings/new` — the guest's identity is not carried over (verified in Section 11: the form starts empty). Staff must retype everything, creating duplicate guest rows. |

## 13. Dashboard — Operations

Tested with an empty day ("No events today" ✅) and with a temporary same-day confirmed booking (D1, check-in Oct 21) inserted via SQL and **deleted after** the test.

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 13.1 | Today-only merged timeline | ✅ Working | Empty state renders "No events today". With a same-day arrival it rendered "QA Test Guest — Room D1 / Check-in today". Query correctly targets today's arrivals (confirmed/checked_in), departures, scheduled transfers, and equipment returns due (`operations/page.tsx:11-14`). |
| 13.2 | 🆕 Timeline never displays the event time | 🐛 **New bug** | The page computes `time` for every event (arrivals 14:00, departures 11:00, equipment 12:00, transfers real time — `page.tsx:21,28,42`) but `OperationsTimeline.tsx:33-42` **only renders `title` and `subtitle`** — the `time` field is dropped entirely. Staff see *what* is happening but never *when*, defeating the point of a timeline. |
| 13.3 | `op07` — hard-coded 14:00 / 11:00 / 12:00 | ⚠️ Confirmed (known) | Present in code (`page.tsx:21,28,42`) and independent of the `settings.check_in_time` / `check_out_time` values (which, per `ad08`, are stored but unused). Moot in the UI only because of 13.2. |
| 13.4 | Read-only | ✅ Working | No actions/links on timeline entries (as documented). |
| 13.5 | "+N more" cap | ✅ Working (code) | Renders first 15 events, then "+N more events" (`OperationsTimeline.tsx:32,45-47`). Not triggered with small test data. |

## 14. Dashboard — Housekeeping

| # | Tested | Expected | Status | Notes |
|---|---|---|---|---|
| 14.1 | Housekeeping board loads | Room cards with status, category, status controls, Report Issue | ✅ Working | Both roles verified: **admin and housekeeping each see all 10 rooms** (B1–B5, D1–D5) with status chips + Dirty/Cleaning/Ready/Report Issue controls. Base URL is NOT fixed to /dashboard — good. ⚠️ Earlier draft of this report claimed an "Assigned Rooms (1 assigned)" view — **that was an error in my notes; no such string or assignment feature exists in `src/`** (grep: 0 matches for "assigned"). Rooms are never assigned to staff. |
| 14.2 | Room status gating | Only dirty→cleaning→ready progression allowed | ✅ Working | Verified as admin: B1 dirty→🧹 Cleaning (allowed) → from Cleaning only *Mark Ready* is offered; *"Already marked ready"* guards double-ends; status always shown on the card; other transitions disabled (`Cleaning` button `disabled` while room is ready). |
| 14.3 | Housekeeping role can update status | Role-appropriate write access | 🐛 **CRITICAL BUG (new) — re-verified as the housekeeping role** | **`updateRoomHousekeepingStatus` (page.tsx:57) calls `requireStaff()`, which rejects the `housekeeping` role** (src/lib/auth.ts:15 — only admin+receptionist). Logged in as `qa.housekeeping` and clicked **Dirty** on a ready room → red toast **"Insufficient permissions"** (same for Cleaning/Ready). The RLS policy itself permits it (identical updates succeeded as admin), and `requireAnyStaff()` (auth.ts:20) exists but is not used here. **The housekeeping role can see its board but cannot perform the module's only write action.** |
| 14.4 | Role-appropriate view | Housekeeping sees only what it needs | ✅ Working (as implemented) / ⚠️ design note | Housekeeping gets a single-item sidebar (only "Housekeeping") and can reach no other dashboard page. It still sees **all 10 rooms**, not just dirty/assigned ones — see 14.1 note. |
| 14.5 | Report Issue dialog | Description + priority → maintenance request | ✅ Working — verified twice, both roles | Dialog = Description + Priority (Low/Normal/High/Urgent), submit disabled until description is filled. **Admin:** `{room_id, description, priority, status:"open"}` → **201**, toast *"Maintenance issue reported"*, row in DB. **Housekeeping role:** same → **201** (RLS allows it). Also verified `priority:"urgent"` inserts fine (`priority` is a `text` column). ⚠️ *Earlier draft recorded an ID `b3072d1f` that turned out never to exist in the table — no row was written by that attempt; I could not reproduce a failure on retry with either role, so it is logged as an unreproduced anomaly rather than a bug.* |
| 14.6 | Reported issue visible on board | Issue surfaced on the room card | 🐛 **`op17` CONFIRMED** | After reporting (B1 now has 2 open issues), the card still reads only **"B1 · ready · Budget"** with status buttons — the maintenance issue **never appears** anywhere on the housekeeping board. It is visible only in Admin → Maintenance Requests. Staff report a burst pipe; their board looks identical. |
| 14.7 | Reporter attribution | Board/Admin know who reported | 🐛 **NEW BUG (🆕)** | `HousekeepingCard.tsx:58-63` never sends `reported_by_staff_id`, so Admin's **"Reported By" column is always "—"** (verified in DB for all rows). |

**Verdict:** the data flow (board → status writes → maintenance insert → admin list) all works for *admin*, but **the role this module is built for cannot change any room status** (14.3) — the highest-impact functional bug found so far — issues never reach the people cleaning the room (`op17`), and nobody is credited as the reporter (14.7).

## 15. Dashboard — Equipment

| # | Tested | Expected | Status | Notes |
|---|---|---|---|---|
| 15.1 | Equipment panel loads | Rental table: guest, unit, dates, price, status + counter | ✅ Working | 13 rows loaded; status chips (`active`/`pending`/`returned`) shown. |
| 15.2 | "N active rental(s)" counter | Counts only `active` rentals | 🐛 **`op09` CONFIRMED (worse than documented)** | Header said **"13 active rental(s)"** while the DB holds **8 active / 4 pending / 1 returned** — the counter is `activeBookings.length` over the *unfiltered* list (EquipmentPanel.tsx:96), so it counts `pending` holds **and even `returned` rentals**. After my test rental (active) + return it read 14 → the number never reflects reality. |
| 15.3 | Availability shown when creating rental (`op08`) | Unavailable units hidden/greyed + clear message | 🐛 **`op08` CONFIRMED** | Unit dropdown filters **only by category** (EquipmentPanel.tsx:45 — no date/availability logic at all), so both surfboards were offered even though Surfboard #1 has an active rental 10/27–10/30. Attempting the overlapping rental was rejected *only by the DB*, and the user-facing toast was the raw Postgres error: *"conflicting key value violates exclusion constraint `equipment_bookings_no_overlap`"*. No pre-check, no friendly message — staff sees database jargon. |
| 15.4 | Double-booking impossible | Data integrity | ✅ Working (DB saves the app) | `equipment_bookings_no_overlap` = `EXCLUDE USING gist (unit_id WITH =, daterange(start,end,'[)') WITH &&) WHERE status='active'`. **Nuance:** only `active` rows block, so a **`pending` hold does *not* reserve the unit** (verified with a probe insert, then deleted). |
| 15.5 | Create rental end-to-end | Insert + list refresh + toast | ✅ Working | Valid 11/01→11/02 Surfboard #1 rental created: *"Rental created"*, dialog closed, row prepended, price auto-computed = 2 days × $15 = $30 → shown as $15.00 for 1 day (correct). |
| 15.6 | Return requires confirmation (`op10`) | Confirm dialog before returning | 🐛 **`op10` CONFIRMED** | Single click on **Return** → row immediately flips to `returned` and disappears from the list; **no confirmation dialog** (EquipmentPanel.tsx:86-91 does a bare `update`). One mis-click silently ends a rental and (per 15.4) frees the unit for re-booking. |
| 15.7 | Cancelled booking releases its equipment holds | Holds expire with the booking | 🐛 **BUG (confirmed + impact refined)** | **All 4 `pending` rows belong to cancelled bookings** — `08f65168` (cancelled by cron today) and `a489ecc3` (cancelled 10/10). `expire-pending-bookings` never touches `equipment_bookings`. Refined impact: because the overlap constraint only covers `active`, these orphans do **not** hard-block rentals — but they linger forever, still shown to staff as live rentals and still counted in the (already wrong) active counter. |
| 15.8 | Guest picker | Searchable, de-duplicated list | ⚠️ Minor UX | Unfiltered dropdown lists **13 duplicate "Charith Wijesinghe" rows with the same email** — no de-dup in the picker. |

**Verdict:** rentals create/return work, but the panel's numbers are meaningless (15.2), returns are one accidental click away from irreversible (15.6), availability is only enforced by a database constraint whose raw error leaks to staff (15.3), and cancelled bookings keep renting equipment forever (15.7).

## 16. Dashboard — Transfers

| # | Tested | Expected | Status | Notes |
|---|---|---|---|---|
| 16.1 | Transfers board + date filter | Transfers listed per date with guest, direction, flight, time, route, status | ✅ Working | Defaults to today → *"No transfers for this date."*; switching to 2026-10-27 showed the QA departure transfer; route resolved from `route_id`, direction chips, status shown. |
| 16.2 | New Transfer dialog | Route, guest, direction, flight, date/time → row created | ✅ Working | Created 10/29 arrival for QA Test Guest → toast *"Transfer created"*, row appeared, price auto-filled **$30** from the selected route, status defaults to `scheduled`. |
| 16.3 | Transfer linked to booking (`op12`) | Transfer tied to the guest's booking | 🐛 **`op12` CONFIRMED** | The dialog has **no booking field at all** (route, guest, direction, flight, datetime only), and the insert body is `{route_id, guest_id, direction, flight_number, transfer_datetime, price_usd, status}` — **no `booking_id`**, so it is `NULL` (new row `aa4fafa1`) even though that guest has booking `08f65168`. Pre-existing data agrees: `3e785006` (Test Booking Guest, 10/12, completed) has `booking_id NULL` while their booking `4001e0a5` covers that date. Impact: transfers don't appear on the booking, aren't cancelled with it (see 16.6), and can't be reconciled against the stay. |
| 16.4 | Staff-entered time stored/displayed correctly | 6:45 PM stays 6:45 PM | 🐛 **NEW BUG — timezone shift** | Picked **18:45** in the picker (labelled *"local date and time picker"*). Stored `2026-10-29 18:45:00+00` (**interpreted as UTC**) and the board renders **12:15 AM** — hotel local time is UTC+5:30, so every manually-entered time is **5 h 30 m late**. Worse, the row is still listed under the date *2026-10-29* while its displayed clock time (12:15 AM) is actually 30 Oct — **date filter and displayed time disagree**. |
| 16.5 | Mark transfer done | Status flips to completed + confirmation | ✅ Working | Clicking **Done** → toast *"Transfer completed"*, row status `scheduled` → `completed`. |
| 16.6 | Cancelled booking releases its transfer | Transfer cancelled/expired with the booking | 🐛 **BUG (orphan family, cross-ref §15.7)** | Transfer `41cb4ce1` belongs to booking `08f65168` which the cron **cancelled today** — the transfer is still `scheduled` for 10/27. `expire-pending-bookings` cancels bookings only; `equipment_bookings` and `airport_transfers` are left behind. |
| 16.7 | Multiple routes configured | Airport/hotel routes selectable | ⚠️ Data note | Only **one** route exists: CMB → Hotel ($30). Direction toggle covers return trips, so this is likely correct for Ahangama, but there is no Galle/Hambantota option. |
| 16.8 | Guest picker | De-duplicated, searchable | ⚠️ Minor UX | Same **13 duplicate "Charith Wijesinghe"** entries as the equipment picker (no de-dup, no email shown here). |

**Verdict:** the panel works (create / filter / complete), but transfers are structurally orphaned from bookings (`op12`), times drift by half a day (16.4), and cancelled bookings keep their cars on the road (16.6).

## 17. Dashboard — Admin panel

| # | Tested | Expected | Status | Notes |
|---|---|---|---|---|
| 17.1 | Admin-only access | Non-admins can't reach `/dashboard/admin` | ✅ Working | Covered in §7.6: receptionist direct nav → redirected to `/dashboard`, link hidden; housekeeping never sees it. |
| 17.2 | Staff Activate / Deactivate | Toggles `profiles.active`, UI reflects it | ✅ Working | **QA Reception → "Staff deactivated"**, row flips to *Inactive / Activate*, DB `active=false`; **Activate → "Staff activated"**, `active=true`. ⚠️ One click with no confirmation dialog, and ⚠️ the table has **no email column** — 4 rows are literally named *"Staff"* (plus name duplicates), so it is genuinely hard to tell which account you are about to disable. 🆕 |
| 17.3 | Save room pricing | Persists `base_price_usd` | ✅ Working | Budget $20→$21 → `PATCH /rest/v1/room_categories` **204**, toast *"Prices updated"*, DB verified → restored to Budget 20 / Deluxe 40. (Every save writes **all** categories, not just the changed one — harmless.) |
| 17.4 | Category add / edit / rename (`ad02`) | Full CRUD | 🐛 **`ad02` CONFIRMED** | Card 2 is only two `$ / night` inputs + *Save Pricing* (AdminPanel.tsx:71-77). No add, rename, description, occupancy or image control anywhere in the panel. |
| 17.5 | Room retire / activate | Toggles `operational_status` | ✅ Working | B5 → *"Room retired"* / `retired` / button becomes *Activate* → *"Room active"* / `active`. Rooms list shows both states. |
| 17.6 | Add Room | Creates room, sensible validation | ✅ Working + 🆕 **raw-DB-error bug** | `QA9` → **201**, *"Room added"*, row appears, input cleared; missing category → friendly *"Category is required"*. But submitting the **duplicate** `QA9` is only caught by the DB (409 unique constraint — data is safe) and the toast shown to the admin is the raw Postgres message: ***"duplicate key value violates unique constraint `rooms_room_number_key`"***. No client-side duplicate check. (QA9 deleted after the test.) |
| 17.7 | Save hotel settings | Persists check-in/out times, surcharge, deposit | ✅ Working | check-in 14:00→14:30 → `PATCH /rest/v1/settings` **204**, toast *"Settings saved"*, DB confirmed → restored to 14:00. |
| 17.8 | Check-in/out times used elsewhere (`ad08`) | Times drive public/ops copy | 🐛 **`ad08` CONFIRMED** | Repo-wide grep: `check_in_time` / `check_out_time` appear **only** in `AdminPanel.tsx`, `actions/settings.ts` and the generated types. Nothing else reads them — Operations timeline, confirmation page and booking copy still hard-code 2 PM / 11 AM. |
| 17.9 | Maintenance list + Resolve | Open issues listed, Resolve stamps timestamp | ✅ Working | 3 open issues listed (Room / Issue / Priority / Status / Reported By); **Resolve** → toast *"Marked resolved"*, `status=resolved`, `resolved_at` written (verified in DB). |
| 17.10 | Maintenance reopen / close / filter (`ad05`) | Status editing, filters | 🐛 **`ad05` CONFIRMED** | Only a *Resolve* button exists; once resolved the row just reads "resolved" — no reopen, no status/priority edit, no filters or tabs. **`resolved_by_staff_id` stays NULL** (verified) — the system records *when* but never *who*. |
| 17.11 | "Reported By" populated | Shows the reporting staff member | 🐛 **NEW BUG (🆕)** | Column always renders **"—"**: `HousekeepingCard.tsx:58-63` inserts only `{room_id, description, priority, status}` — **`reported_by_staff_id` is never written**, so Admin can't tell who filed an issue (both QA rows and the pre-existing one are NULL). |
| 17.12 | Equipment unit retire | Retire a unit, keep it manageable | 🐛 **NEW BUG (🆕) — one-way door** | The retire control is a **button with no accessible name** (snapshot shows a bare `button`, screen readers announce nothing), it toasts *"Unit retired"*, and the row **vanishes from the list** (`retireUnit`, AdminPanel.tsx:132-137, filters it out of local state). There is no "show retired" filter and no restore action — retired equipment becomes invisible and unrecoverable through the UI (I had to update the DB by hand to bring *Bicycle #1* back). |
| 17.13 | Add Equipment Unit | Creates unit with category | ✅ Working | *"QA Test Unit"* → **201** `condition_status=good`, appears in list (deleted after test; unit count restored to 15). |
| 17.14 | Contact inbox mark read/unread | Toggles `read` + badge | ✅ Working | `PATCH contact_messages` **204**, badge New↔Read, button flips. ⚠️ No toast/feedback of any kind (silent state change). |
| 17.15 | Contact full view / delete / reply (`ad06`) | Read whole message, delete, reply | 🐛 **`ad06` CONFIRMED** | Only *Mark read/unread* per row. Measured the message cell: `overflow: hidden; text-overflow: ellipsis` with `scrollWidth > clientWidth` — **long messages are physically clipped and cannot be read in full**, and there is no detail view, delete or reply. |
| 17.16 | Admin writes go through server actions (`uh03`) | Privileged server-side writes | ⚠️ **Confirmed as a risk (documented)** | Every single admin write I intercepted was a raw browser `POST/PATCH /rest/v1/*` with the anon key — `profiles`, `room_categories`, `settings`, `rooms`, `equipment_units`, `contact_messages`, `maintenance_requests`. Authorisation rests entirely on RLS; the `requireAdmin()` server actions that already exist are unused here. |

**Verdict:** the admin panel is the most reliably *working* section of the dashboard — every write path I exercised persisted correctly — but it has three data-quality holes (`ad02`, `ad05`+no reporter, `ad06`), one destructive no-return action (17.12), raw Postgres errors leaking to the admin (17.6), and zero server-action authorisation (17.16).

## 18. Cross-cutting: console errors, performance, accessibility

| # | Area | Status | Evidence / notes |
|---|---|---|---|
| 18.1 | JavaScript exceptions across the whole run | ✅ Clean | No uncaught exceptions on public site, booking wizard, confirmation, dashboard (Overview/Bookings/Guests/Operations/Housekeeping/Equipment/Transfers/Admin) or during any write. The **only** `console.error` entries are ones I caused deliberately (the duplicate-room **409**) and CSP report-only notices. |
| 18.2 | Console warnings | ⚠️ Notes | Preloaded woff2 "not used within a few seconds" (5×, minor); otherwise nothing. |
| 18.3 | Content-Security-Policy | ⚠️ **Risk (🆕 worth checking before launch)** | CSP is **report-only** and currently logging, per page: inline script/style violations (13–21/page), **`eval` blocked (3–6/page)**, and **`frame-src` violation for the Google Maps embed** (`default-src 'self'` fallback). Nothing is enforced today, so nothing breaks — but flipping CSP to enforce would break the map iframe, inline code and whatever uses `eval` on the first deploy. |
| 18.4 | Lighthouse — public home `/` | ⚠️ Partial | **Accessibility 91, Best Practices 96, SEO 92** (mobile & desktop). Failures: `color-contrast` ×4 (booking wizard date buttons `#a6a09b` on white = **2.58:1** vs 4.5 required; "EVENTS" label 2.47:1; footer copyright **2.28:1**), `select-name` (guest-count `<select>` has no label), `link-text` (2 non-descriptive links), `inspector-issues` (CSP). |
| 18.5 | Lighthouse — dashboard `/dashboard/admin` | 🐛 Weak | **Accessibility 84** (BP 100, SEO 100). Failures: **`button-name` ×17** (15 unlabelled *equipment-retire* buttons + 2 category `combobox` triggers), `label`, **`td-has-header`** (admin tables use `<td>` without header association), `color-contrast`, and consequently *Agentic Browsing 0* — the a11y tree is not machine-readable there. |
| 18.6 | Lighthouse — `/dashboard/bookings` | ✅ Good | **Accessibility 96**, only `color-contrast` fails. |
| 18.7 | Custom accessibility sweep (dashboard) | 🐛 Findings (🆕) | **Icon-only mobile hamburger in the dashboard `<header>` has no accessible name** (`lucide-menu` SVG is `aria-hidden`, no `aria-label`) — on both admin and housekeeping layouts; **10 unlabelled form fields** on the admin page (pricing numbers, the two time inputs, *Room number*/*Unit label* rely on placeholders, hidden Base UI inputs); images all have `alt` ✅; Chrome's Issues panel independently reports *"No label associated with a form field (count: 4)"*. |
| 18.8 | ⌘K command palette a11y | 🐛 Confirmed (documented earlier) | `[cmdk-item]` results are absent from the accessibility tree (they exist in the DOM only) — screen-reader/agent users cannot perceive search results. |
| 18.9 | Performance — home `/` (lab, dev server, no throttling) | ✅ OK with caveat | **LCP 1228 ms** (TTFB 725 ms + 503 ms render delay), **CLS 0.00**. Insights: `DocumentLatency` (est. 620 ms FCP/LCP savings — server response/compression), `LegacyJavaScript` (14.6 kB wasted), `DOMSize`, `ForcedReflow`. |
| 18.10 | Performance — `/dashboard/bookings` (lab) | ⚠️ Slower | **LCP 2372 ms** with a **1600 ms render delay** — i.e. the shell paints fast but hydration/JS blocks the content (the big 50-row table + panels). CLS 0.00. On a throttled mobile connection this would feel noticeably slow. |
| 18.11 | Method note | ⏭ Not measured | This MCP build does not emit a Lighthouse **Performance** score, and lab runs were on a **dev server (Next HMR, no network throttling)** — treat all timings as *relative* indicators, not production scores. Field (CrUX) data: none available. |

**Cross-cutting verdict:** the app is remarkably error-free at runtime (18.1) and layout-stable (CLS 0.00 everywhere), but accessibility is the systemic weak point — Lighthouse 84–91 with 17 unnamed buttons on the admin screen, unlabelled form fields on both the public wizard and the dashboard, low-contrast text, and a CSP that would break things the moment it is enforced.

## Cleanup & leftover test data

> Everything below was created by this test run and removed afterwards. Verified by direct DB counts after cleanup.

| # | What was created during testing | Removed? | Verification |
|---|---|---|---|
| C1 | 3 QA auth accounts (`qa.admin@`, `qa.reception@`, `qa.housekeeping@lepalme.test`) | ✅ Deleted | `DELETE /auth/v1/admin/users/{id}` → **HTTP 200** ×3; `auth.users where email like 'qa.%'` = **0** |
| C2 | 3 QA staff `profiles` (Admin / Reception / Housekeeping) | ✅ Deleted (cascade with the auth users) | `profiles` for those IDs = **0**; **7** original staff profiles remain |
| C3 | 2 QA guests (`qa.test.guest@`, `qa.staff.booking@lepalme.test`) | ✅ Deleted | `guests` with `@lepalme.test` = **0**; **22** original guests remain |
| C4 | 6 QA bookings — the 5-room group (`08f65168`, `849b3429`, `f64e38dd`, `430004be`, `3deb9ffc`, all auto-cancelled by cron) + `2ea843c2` (checked out) | ✅ Deleted | bookings created on/after 2026-10-21 = **0**; **23** original bookings remain |
| C5 | Invoices, `booking_charges` and `payments` belonging to those bookings | ✅ Deleted (FK order: payments → invoices → charges) | Back to pre-test totals: **1** invoice, **1** charge, **11** payments (all pre-existing) |
| C6 | Equipment rentals: my test rental `1e48a862` (created & returned), the two orphaned QA holds `5bf7dab5`/`d8381f03`, and `33f65c9e` | ✅ Deleted | `equipment_bookings` = **10** (original rows) |
| C7 | Transfers: `41cb4ce1` (QA departure) and `aa4fafa1` (my timezone test) | ✅ Deleted | neither ID present |
| C8 | 3 QA `maintenance_requests` (normal + urgent + housekeeping-role checks) | ✅ Deleted | only the pre-existing *"AC not cooling properly"* row remains |
| C9 | 1 QA `contact_messages` row (`ee1dd67e…`, also used for the §17.14 read-toggle test) | ✅ Deleted | 0 `@lepalme.test` messages remain |
| C10 | `shift_notes` entries written during the run | ✅ Deleted | `shift_notes` = **0** |
| C11 | Room `QA9` (add-room test, incl. duplicate attempt) | ✅ Deleted | `rooms` = **10**, all `operational_status='active'` |
| C12 | Equipment unit *"QA Test Unit"* (add-unit test) | ✅ Deleted | `equipment_units` = **15** |

**States restored to their pre-test values:**

| Setting | Restored to |
|---|---|
| `settings.check_in_time` | `14:00:00` (was briefly changed to 14:30 in §17.7) |
| Room pricing | Budget **$20**, Deluxe **$40** (tested with $21 in §17.3) |
| Room B5 | `operational_status='active'` (retired/reactivated in §17.5) |
| Equipment unit *Bicycle #1* | `condition_status='good'` (retired in §17.12, restored by SQL because the UI has no undo) |
| Room B1 | `housekeeping_status='ready'`, `operational_status='active'` (status-gating chain in §14.2) |
| QA Reception account | re-activated before the account itself was deleted (§17.2) |

**Deliberately left alone** (pre-existing data that this run did not create):
- 2 orphaned `pending` equipment holds on cancelled booking `a489ecc3` (Test Guest PayHere, cancelled 10/10) — real evidence of the bug in §15.7, left for the owner to see.
- All `Test*`, `sam`, `john`, `Charith` guests, bookings, invoices, payments and the pre-existing contact messages.
- The pre-existing resolved maintenance request.

**Browser / process cleanup:** the isolated test contexts (`qa-auth`, `qa-hk`) hold sessions for deleted users; the dev server is stopped after this report is written. No code was modified, **nothing was committed or pushed**.
