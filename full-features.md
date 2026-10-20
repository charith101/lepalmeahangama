# Le Palme Ahangama — Full Feature Reference

> **Purpose:** Single source of truth for AI agents (and humans) working on this codebase.
> Part 1 documents every **currently implemented** feature (what it does + exactly where it lives).
> Part 2 documents the **38 features the owner SELECTED to build** (from `SELECTED-FEATURES.md`, picked 2026-10-20), each with current behavior, desired behavior, files to touch, and code anchors.
>
> **How agents should use this doc:**
> - Read §0 (Architecture) and §9 (Ground Rules) before touching anything.
> - For a selected feature, find its ID (e.g. `bk01`, `py02`) in Part 2. IDs match `SELECTED-FEATURES.md` / `FEATURE-PICKER.html`.
> - Line numbers were verified on commit `33c321c` (2026-10-20). Re-grep if drift is suspected.
> - Do **not** build anything not in Part 2 unless the owner asks.

---

## 0. Project Snapshot & Architecture

| Item | Value |
|---|---|
| App | Hotel website + PMS for Le Palme Ahangama, Sri Lanka |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | Supabase (Postgres) — anon client + RLS for browser writes, service-role admin client for privileged server work |
| Auth | Supabase email+password, cookie sessions via `@supabase/ssr` |
| Payments | PayHere (MD5-signed form POST + notify webhook) — **hard-coded to SANDBOX** |
| Email | Resend (exactly one email exists) |
| UI | shadcn/ui + Tailwind v4, lucide-react icons, sonner toasts |
| Validation | Zod (`src/lib/validations.ts`) |
| Tests | Vitest (`npm test`) — only `src/__tests__/pricing.test.ts` exists |
| Currency / language | USD only, English only |

### Directory map

```
src/app/                      Public site + booking flow (guest-facing routes)
src/app/booking/              5-step wizard, confirmation, lookup, guest portal ([ref])
src/app/api/payhere/          hash, notify (webhook), return, cancel
src/app/api/search/           staff-only global search endpoint
src/app/auth/                 login page + callback route
src/app/dashboard/            Staff PMS  ((main)/ = admin+reception; housekeeping/ = separate)
src/components/public/        Guest site components
src/components/dashboard/     PMS components
src/lib/actions/              "use server" actions (⚠ many are implemented but UNUSED — see §4)
src/lib/                      auth, booking-pricing, email, payhere, validations, constants, supabase clients
supabase/migrations/          5 security-fix migrations only (base schema lives in the live DB;
                              the authoritative in-repo snapshot is src/lib/supabase/database.types.ts)
src/proxy.ts                  Next.js 16 middleware equivalent (session refresh + route guards)
```

### Request/data flow patterns (know these before editing)

1. **Public booking money path (server-trusted):** wizard (client state in `sessionStorage`) → `createPayHereBooking()` server action (re-validates, re-prices, inserts `pending_payment`) → `POST /api/payhere/hash` (server-computed amount + MD5) → browser POSTs hidden form to `https://sandbox.payhere.lk/pay/checkout` → PayHere calls `/api/payhere/notify` → bookings flipped to `confirmed`, payment recorded, equipment activated, email sent.
2. **Dashboard write paths are split (important!):** some flows use server actions with `requireStaff()` guards (booking detail actions, shift notes, housekeeping status), but many dashboard panels write **directly from the browser** with the anon key and rely on RLS only (BookingForm, Quick Check-in/out, Mark Clean, Equipment, Transfers, Admin panel). Fixing this is selected feature `uh03`.
3. **Pricing is always recomputed server-side.** Client-supplied totals are ignored (`validateAndComputeRoomTotal`, `equipmentItemPrice`, `transferPrice` in `src/lib/booking-pricing.ts`). Never trust client amounts.
4. **Availability = overlap queries + `get_available_rooms` RPC + a Postgres exclusion constraint** (returns SQLSTATE `23P01` on race — code catches it and shows "room was just booked"). Blocking statuses: `pending_payment`, `confirmed`, `checked_in` (+ `maintenance_block` on the calendar).

### Roles

| Role | Access |
|---|---|
| `admin` | Everything, incl. `/dashboard/admin` |
| `receptionist` | All operational pages, no admin |
| `housekeeping` | Only `/dashboard/housekeeping` (redirected away from main dashboard); no guest PII |

Gates: `src/proxy.ts` (login), layouts (`dashboard/(main)/layout.tsx` redirects housekeeping; `admin/layout.tsx` admin-only), server actions `requireStaff()/requireAnyStaff()/requireAdmin()` (`src/lib/auth.ts`), and Postgres RLS via `get_staff_role()` (SECURITY DEFINER, honours `profiles.active` — deactivating a staff account instantly revokes data access).

### Environment variables (names only)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `NEXT_PUBLIC_PAYHERE_MODE` (⚠ defined but **unused in code**), `PAYHERE_APP_ID`, `PAYHERE_APP_SECRET`, `RESEND_API_KEY`, optional kill-switch `NEXT_PUBLIC_BOOKING_ENABLED` (`"false"` hides all booking CTAs and blocks `createPayHereBooking`).

---

# PART 1 — CURRENTLY IMPLEMENTED FEATURES

Everything in Part 1 is live and working unless a ⚠ note says otherwise.

## 1. Guest Website

### 1.1 Global chrome
| Feature | Details | Where |
|---|---|---|
| Navbar | Stay/Dine/Experiences/About/Contact; animated hover underline | `src/components/public/PublicNavbar.tsx` |
| "My Bookings" link | → `/booking/lookup` (desktop + mobile menu) | same |
| "Book Now" CTA | → `/booking`; auto-hidden when `NEXT_PUBLIC_BOOKING_ENABLED=false` | same |
| Booking kill-switch | Env check in nav, hero, booking page, and `createPayHereBooking` | `src/app/booking/page.tsx:21-37`, `src/lib/actions/bookings.ts:132` |
| Theme toggle | Light/dark/system via next-themes | `src/components/ui/animated-theme-toggler.tsx` |
| Mobile menu | Full-screen overlay, scroll-lock, closes on route change | `PublicNavbar.tsx:134-254` |
| Scroll-aware nav | Transparent over home hero → solid after 60px scroll | `PublicNavbar.tsx:39-54` |
| Footer | Address→Google Maps, `tel:`, `mailto:`, quick links, legal links, embedded map; hidden on `/dashboard` | `src/components/public/PublicFooter.tsx` |
| Error boundary + toasts | Global client error fallback; sonner toasts | `src/components/ui/error-boundary.tsx`, `src/app/layout.tsx` |
| Loading skeletons | Per-route `loading.tsx` (home, rooms, room detail, booking, confirmation, login, all dashboard routes) | alongside each page |

### 1.2 Home page (`/`)
| Feature | Details | Where |
|---|---|---|
| Hero date-search bar | Two calendars (past dates blocked, checkout>check-in) + guests dropdown (1–6) + "Check Availability" → `/booking?checkIn=…&checkOut=…&guests=…` ⚠ *guests param is dropped downstream — selected bug `bk01`* | `src/components/public/HeroSection.tsx:16,31,82-165` |
| Hero fallback | Booking-disabled state shows "contact us directly" | `HeroSection.tsx:166-172` |
| Content sections | Welcome, Hotel intro (Stay/Dine/Events cards), Room showcase, Restaurant, Experiences, Events cards (static, no links) | `src/components/public/{WelcomeSection,HotelIntroSection,RoomShowcase,RestaurantSection,ExperiencesSection,EventsSection}.tsx` |

### 1.3 Rooms
| Feature | Details | Where |
|---|---|---|
| Listing page | Server-fetches `room_categories`; cards show image, name, max occupancy, `$X/night` | `src/app/rooms/page.tsx`, `src/components/public/RoomCategoryCard.tsx` |
| Detail page | Slug = `name.toLowerCase().replace(/\s+/g,"-")`; lookup via `ilike("name", …)`; single image, feature bullets parsed from description, price panel | `src/app/rooms/[slug]/page.tsx`, `src/components/public/RoomDetail.tsx` |
| "Check Availability" CTA | Pre-fills wizard: `/booking?categoryId=…&checkIn=tomorrow&checkOut=+4d` | `RoomDetail.tsx:15-20` |
| SEO | JSON-LD room schema, dynamic OG metadata, sitemap (`src/app/sitemap.ts`), robots | `src/lib/seo.ts` |

### 1.4 Booking wizard (`/booking`) — 5 steps
Orchestrator: `src/components/public/BookingWizard.tsx` — clickable step indicator, live price recalculation (room+board+equipment+vehicles+transfer → subtotal → `×(1+surcharge%)`), whole state persisted in `sessionStorage["booking_wizard_data"]`, restored on reload, cleared after payment redirect.
| Step | Feature details | Where |
|---|---|---|
| 1 Dates & Rooms | Calendars (past/invalid blocked); category cards appear after both dates; **live availability** via `getAvailableRooms` RPC ("Checking… / N available / Sold out"); qty steppers capped at availability; per-room subtotals; zod `dateStepSchema`; URL pre-fill from hero/room CTA | `src/components/public/DateStep.tsx` (availability call 49-61; ⚠ wrong button label at :495 = `bk04`) |
| 2 Board Plan | Room Only $0 / Half Board +$10 / Full Board +$20 per room·night; per-plan totals | `src/components/public/BoardStep.tsx`, plans in `src/lib/constants.ts:53-57` |
| 3 Extras | Surfboards (qty 0-20 + dates; tiers $25/1-6d, $14/7-13d, $12/14-20d, $11/21+d), Motorbikes (3 DB models, qty≤10), Cars (8 DB models), Airport transfer toggle (direction, flight no., pickup time); zod `extrasSchema` | `src/components/public/ExtrasStep.tsx`, tiers `src/lib/constants.ts:81-88` |
| 4 Guest Details | Full name, email, phone, nationality, NIC/passport — all required via zod `guestSchema` (`src/lib/validations.ts:3-18`) | `src/components/public/GuestDetailsStep.tsx` |
| 5 Review & Pay | Itemised review + totals; "Pay with PayHere" re-checks room + unit availability → `createPayHereBooking` → `/api/payhere/hash` → auto-submit hidden form to sandbox gateway | `src/components/public/PaymentReview.tsx` (gateway URL :139; ⚠ transfer date :104 = `bk02`; ⚠ `Math.min` shrink :76,:98 = `bk03`) |

Server pricing fetch on the wizard page (categories, equipment prices, first transfer route price, `settings.surcharge_pct` with fallbacks): `src/app/booking/page.tsx:42-73`.

### 1.5 Payment pipeline (PayHere)
| Piece | Details | Where |
|---|---|---|
| `createPayHereBooking` | Kill-switch; zod-validates guest; re-checks availability per room; inserts guest + N bookings (`status:'pending_payment'`, `source:'website'`, shared `group_booking_id`, board totals, server-computed `room_total_usd`); equipment `pending`; transfer `scheduled`; handles PG `23P01`; returns `orderId="BOOK-<group>"` + server `grandTotal` | `src/lib/actions/bookings.ts:120-253` |
| Hash endpoint | Validates USD + `BOOK-<uuid>` + booking exists & pending; recomputes total via `computeBookingTotal`; returns `{hash, merchant_id, amount}`; MD5 = `merchantId+orderId+amount+currency+MD5(secret)` | `src/app/api/payhere/hash/route.ts`, `src/lib/payhere.ts:7-16` |
| Notify webhook | Signature verify; `status_code==="2"` + USD required; **amount reconciliation vs server total (rejects mismatch/underpayment)**; confirms whole group; idempotent payment insert (`card_payhere`, `completed`, `payhere_payment_id`); activates `pending` equipment; sends confirmation email. ⚠ non-2 statuses are a silent no-op (= `bk12`) | `src/app/api/payhere/notify/route.ts` (`status_code` check :27; email :100) |
| Return / cancel | return → `/booking/confirmation/<id>`; cancel → `/booking` with no message (= `bk11`) | `src/app/api/payhere/return/route.ts`, `src/app/api/payhere/cancel/route.ts:4` |
| Confirmation email | HTML: reference (first 8 of group id, upper), rooms, dates, board, rentals, transfer, total, site link | `src/lib/email.ts:9-86` |
| Refunds | `refundBookingPayment` (requireStaff) → PayHere OAuth+refund (sandbox URLs) → payment `refunded` | `src/lib/actions/bookings.ts:442-471`, `src/lib/payhere-refund.ts` |
| Total computation | `computeBookingTotal` = Σ(room_total + board_total) + Σ(equipment) + Σ(transfers), then `×(1+surcharge_pct/100)` | `src/lib/booking-pricing.ts` |

### 1.6 Confirmation page
`/booking/confirmation/[id]` — reference, live status badge, rooms/dates/board/rentals/transfers/guest/total, JSON-LD booking schema, "not found" fallback.
⚠ Static "Booking Confirmed" heading regardless of status (= `bk09`); fetched with `createAdminClient()` so anyone with the UUID can view (= `uh01`). Where: `src/app/booking/confirmation/[id]/page.tsx` (admin client :3,:34,:56; heading ~:116).

### 1.7 Guest self-service (view only)
| Feature | Details | Where |
|---|---|---|
| Lookup | Reference (8-char) + email → `lookupBookingByRef` → RPC `lookup_booking_by_ref` (exact email match, service-role) → redirect to portal | `src/app/booking/lookup/lookup-form.tsx`, action `src/lib/actions/bookings.ts:389-403`, RPC `supabase/migrations/20260907000000_security_fixes.sql:113` |
| Portal page | Requires `?email=` (else → lookup); shows all rooms in group + statuses, dates, nights, totals, board, "Activities & Extras" (rentals + transfers), guest details — **read-only** | `src/app/booking/[ref]/page.tsx` (:13-20), `booking-detail-client.tsx` |


### 1.8 Contact & content pages
| Page | Feature details | Where |
|---|---|---|
| Contact | Form (name/email/message, required) → inserts `contact_messages` (public INSERT policy); success screen + toast; map/tel/mailto | `src/app/contact/page.tsx`; policy `supabase/migrations/20260907000000_security_fixes.sql:33-45` |
| Dine | Static copy, hours, images; ⚠ "Reserve a Table" → `/booking` (= `wb03`) | `src/app/dine/page.tsx:37-42` |
| Experiences | 5 hardcoded experiences; "Inquire" → generic `/contact` with no context (= `wb02`) | `src/app/experiences/page.tsx:76-81` |
| About / Refund / Privacy / Terms | Static content pages | `src/app/{about,refund-policy,privacy-policy,terms-and-conditions}/page.tsx` |

### 1.9 Known gap on this page (selected for fixing)
- "Events & Gatherings" card links to **nonexistent `/events`** (`HotelIntroSection.tsx:18`) — selected as `wb01` (see Part 2).

## 2. Staff Dashboard (PMS)

### 2.1 Shell & navigation
| Feature | Details | Where |
|---|---|---|
| Login | Email+password (`signInWithPassword`), zod `loginSchema`, → `/dashboard` | `src/app/auth/login/page.tsx` |
| Session + route guards | `src/proxy.ts` refreshes cookies, redirects (no user → login; logged-in on login → dashboard) | `src/proxy.ts` |
| Role routing | housekeeping → `/dashboard/housekeeping`; admin layout rejects non-admin | `src/app/dashboard/(main)/layout.tsx`, `admin/layout.tsx`, `housekeeping/layout.tsx` |
| Sidebar | 9 items, role-filtered (housekeeping sees only Housekeeping; no one but admin sees Admin); logout confirm dialog | `src/components/dashboard/AppSidebar.tsx:32-42,72-109` |
| Header | Live 24h clock, ⌘K global search, theme toggle, staff name + role badge | `src/components/dashboard/DashboardHeader.tsx`, `Clock.tsx` |
| Global search | ⌘K command palette, 250ms debounce → `GET /api/search?q=` (`requireAnyStaff`) → RPC `global_search` (guests + bookings: name/email/phone/NIC/nationality/room/status/OTA/notes/ref) → navigate to profile/booking | `src/components/dashboard/GlobalSearch.tsx`, `src/app/api/search/route.ts`, RPC `supabase/migrations/20260907000000_security_fixes.sql:194-252` |

### 2.2 Overview (`/dashboard`)
| Feature | Details | Where |
|---|---|---|
| Stat cards | Arrivals today (check_in=today, confirmed/checked_in), departures today, occupancy % (checked_in ÷ active rooms), dirty/cleaning count, pending check-ins + "View All" → bookings | `src/components/dashboard/OverviewCards.tsx`, page `src/app/dashboard/(main)/page.tsx` |
| Room status board | Grid of room cards with derived badge: Retired/Dirty/Cleaning/Vacant/Occupied/Arriving/Departing/Booked — **read-only** (= `op01`) | `src/components/dashboard/RoomStatusBoard.tsx` |
| Quick Check-in | Loads confirmed bookings with check_in ≤ today → optional NIC/passport → sets `checked_in` + guest NIC | `src/components/dashboard/QuickCheckinSheet.tsx` |
| Quick Check-out | Loads checked-in; invoice/charges/payments breakdown with balance due; "Collect Payment" (amount + cash/bank_transfer/card_payhere → inserts `payments` completed); "Complete Check-out" → `checked_out` ⚠ no invoice generation, no room-dirty (= `ds09`; contrast `src/components/dashboard/QuickCheckoutSheet.tsx:104`) | same component |
| Mark Room Clean | Dirty/cleaning rooms → set `housekeeping_status='ready'` | `src/components/dashboard/MarkCleanSheet.tsx` |
| Revenue card | Today / this month / outstanding (Σ issued invoices − Σ payments) — display only (= `op02`) | `src/components/dashboard/RevenueCard.tsx` |
| Shift notes | Post (1–500 chars, Enter to post) / delete / last 10 with author+time via `addShiftNote`/`deleteShiftNote` (requireStaff) | `src/components/dashboard/ShiftNotes.tsx`, `src/lib/actions/shiftnotes.ts` |
| Buttons | Walk-in, New Booking (both → `/dashboard/bookings/new` ⚠ identical = `ds04`), Calendar | `(main)/page.tsx:125-136` |

### 2.3 Calendar (`/dashboard/calendar`)
30-day grid (rooms × dates, grouped by category); booking bars colored by status (`pending_payment` secondary, `confirmed` primary tint, `checked_in` solid, `maintenance_block` muted); hover tooltip (guest/room/range/status); bar → booking detail link.
⚠ Query filters to 4 statuses only — cancelled/no_show hidden; no legend/filters/navigation (= `op06`).
Where: `src/app/dashboard/(main)/calendar/page.tsx:33`, `src/components/dashboard/CalendarGrid.tsx:14-19,165-206`.

### 2.4 Bookings
**List** `/dashboard/bookings` — table (guest, dates, status, total, source, View button), `created_at desc`, **hard `.limit(50)`** (`bookings/page.tsx:14`), no filters/search/export (= `ds03`).

**New booking** `/dashboard/bookings/new` (`src/components/dashboard/BookingForm.tsx`, 646 lines):
- Date pickers (check-in ≥ today; check-out after check-in), zod `dashboardBookingSchema`.
- Multi-room: category → room (filtered by category, already-picked, and **live availability** overlap query) → add; chips with remove.
- Source: `walk_in` | `ota_manual` (+ OTA name). Board plan toggles from `BOARD_PLANS`.
- Equipment add-ons: surfboards (tiered), bicycles, motorbikes (3 models), cars (8 models) — unit availability via RPC `get_available_equipment_units`; errors if insufficient.
- Guest fields incl. **num_guests (1–20)** and notes; inserts `guests` (⚠ always new row), then bookings per room `status:'confirmed'` with shared `group_booking_id`, `created_by_staff_id`; handles `23P01`; direct client inserts (RLS-guarded).
- ⚠ No guest prefill support (= `ds05`).

**Booking detail** `/dashboard/bookings/[id]` (`src/components/dashboard/BookingDetail.tsx`, 714 lines) + page `.../bookings/[id]/page.tsx` (loads booking, guest, room, charges, invoices, payments, `settings.min_deposit_pct`):
- Status badge for all 7 statuses; guest/stay/notes cards (read-only).
- **Deposit card** (pending/confirmed): required = `room_total × min_deposit_pct%`, received, remaining, progress bar; "Mark Received" → `recordDeposit` (⚠ hard-codes `method:'cash'` — `src/lib/actions/bookings.ts:405-414` = `py06`).
- Pending: "Confirm Payment" (bank transfer → `confirmBankTransfer`: payment completed + booking confirmed), "Cancel" → `cancelBooking` → `cancelled`.
- Confirmed: "Check In" dialog (optional NIC) → `checkIn`; "Cancel"; "No-show" → `updateBookingStatus('no_show')`.
- Checked-in: "Post Charge" (`postCharge` via `src/components/dashboard/ChargeForm.tsx`: description, category meal/late_checkout_fee/transport/misc, qty×unit ⚠ no edit/delete = `py04`), "Move Room" (conflict-free list → `moveGuestToRoom` ⚠ no price recalc = `py05`), "Generate Invoice" (`generateInvoice`: room+board+active equipment+transfers+charges ×(1+surcharge) → upserts `invoices` issued ⚠ silent overwrite = `py03`), "Check Out" → `checkOut`.
- Payments: "Record Payment" dialog (amount + method chips → `recordPayment` ⚠ flips invoice to `paid` regardless of amount — `src/lib/actions/billing.ts:123-124` = `py02`); payments table; **Refund** button for completed `card_payhere` → `refundBookingPayment` ⚠ `.single()` breaks with >1 card payment (`bookings.ts:454` = `py01`).
- Invoice preview + `window.print()` invoice (`src/components/dashboard/InvoiceView.tsx`).

### 2.5 Guests (CRM)
- Register `/dashboard/guests`: all guests, newest first; client-side search (name/email/phone); **CSV export** of filtered rows; row → profile. `src/components/dashboard/GuestTable.tsx`.
- Profile `/dashboard/guests/[id]`: contact/identity card (read-only), stats (total spent / paid / outstanding), booking history (rows → booking detail), "New Booking for {name}" ⚠ no prefill (= `ds05`; `GuestProfile.tsx:138`). Where: `src/components/dashboard/GuestProfile.tsx`.

### 2.6 Operations (`/dashboard/operations`)
Today-only merged timeline: arrivals @ **hard-coded 14:00**, departures @ **11:00**, scheduled transfers (real time), equipment returns due @ **12:00**; shows first 15 + "+N more"; read-only. Where: `src/app/dashboard/(main)/operations/page.tsx:21,28,42`, `src/components/dashboard/OperationsTimeline.tsx:32,45` (= `op07`).

### 2.7 Housekeeping (`/dashboard/housekeeping`)
- Room grid of active rooms; status buttons Dirty/Cleaning/Ready with gating (dirty→cleaning→ready enforced; ready→dirty allowed) via `updateRoomHousekeepingStatus` (requireStaff). `src/components/dashboard/HousekeepingCard.tsx`.
- "Report Issue" dialog (description + priority low/normal/high/urgent) → direct insert into `maintenance_requests` (`HousekeepingCard.tsx:58`).
- ⚠ Reported issues are **not visible** on this board (= `op17`).

### 2.8 Equipment (`/dashboard/equipment`)
- Page loads **all** `equipment_bookings` + categories + non-retired units + guests; "Active rentals" count ⚠ includes returned (`EquipmentPanel.tsx:96` = `op09`).
- "New Rental" dialog: category → unit → guest → dates; price = days × `price_per_day_usd`; direct insert `status:'active'` ⚠ **no availability/overlap/RPC check** (`EquipmentPanel.tsx:69` = `op08`).
- "Return" button → `status:'returned'` ⚠ no confirmation/undo (`EquipmentPanel.tsx:87` = `op10`).

### 2.9 Transfers (`/dashboard/transfers`)
- List (guest, direction, flight, time, route, status), date filter (defaults today, client-side `startsWith`).
- "New Transfer": route (fixed price) → guest → direction → flight no. → datetime-local; insert `airport_transfers` `status:'scheduled'` ⚠ `booking_id` stays null (= `op12`; `TransferPanel.tsx:68`).
- "Done" → `completed`; "X" → `cancelled` (no dialogs). Where: `src/components/dashboard/TransferPanel.tsx`.

### 2.10 Admin (`/dashboard/admin`, admin-only; `src/components/dashboard/AdminPanel.tsx`, 471 lines, 7 stacked cards)
1. **Staff accounts**: profiles table + Activate/Deactivate toggle (direct `profiles.update({active})` :63 — instantly revokes RLS access).
2. **Room pricing**: per-category `$ / night` inputs → `pricingUpdateSchema` → update `room_categories.base_price_usd` (:71-77). ⚠ No category add/edit/rename (= `ad02`).
3. **Rooms**: retire/activate (`operational_status` :105), Add Room (:146).
4. **Hotel settings**: check_in_time, check_out_time, surcharge_pct, min_deposit_pct → `settings` update (:94). ⚠ Times stored but unused elsewhere (= `ad08`; only refs are `AdminPanel.tsx:85-295` and `src/lib/actions/settings.ts`).
5. **Maintenance requests**: open/in_progress list, Resolve → `resolved` + `resolved_at` (:351). ⚠ No reopen/close/status edit/filters (= `ad05`); `resolved_by_staff_id` never written.
6. **Equipment units**: list with condition badge, retire (`condition_status='retired'` :133), Add Unit (:120).
7. **Contact messages**: list (truncated), Read/New badge, toggle `read` (:159). ⚠ No full view/delete/reply (= `ad06`).

## 3. Data Model (authoritative snapshot: `src/lib/supabase/database.types.ts`)

**Tables (17):** `rooms` (housekeeping_status, operational_status), `room_categories` (name, max_occupancy, base_price_usd, image_url), `guests` (full_name, email, phone, nationality, nic_or_passport), `bookings` (one row per room; check_in/out, status, source, ota_name, num_guests, notes, room_total_usd, board_plan, board_total_usd, group_booking_id, created_by_staff_id), `booking_charges` (description, category, quantity, unit_price_usd, line_total_usd), `invoices` (one-to-one per booking; room/addon totals, surcharge_pct_applied, grand_total_usd, status), `payments` (amount_usd, method, status, payhere_payment_id, invoice_id; **multiple per booking allowed**), `airport_transfer_routes` (airport_name, fixed_price_usd, active), `airport_transfers` (route_id, guest_id, booking_id?, direction, flight_number, transfer_datetime, price_usd, status), `equipment_categories` (price_per_day_usd, tiered_pricing json), `equipment_units` (unit_label, condition_status), `equipment_bookings` (unit_id, guest_id, booking_id?, start/end_date, price_usd, status), `profiles` (= auth user; full_name, role, active), `shift_notes`, `maintenance_requests` (room_id, description, priority, status, resolved_at), `contact_messages` (read bool), `settings` (singleton id=true; check_in_time, check_out_time, surcharge_pct, min_deposit_pct).

**Enums:**
- `booking_status`: `pending_payment | confirmed | checked_in | checked_out | cancelled | no_show | maintenance_block`
- `booking_source`: `website | walk_in | ota_manual`
- `charge_category`: `room | late_checkout_fee | meal | transport | misc`
- `invoice_status`: `draft | issued | paid`
- `payment_method`: `card_payhere | cash | bank_transfer | card_polar`
- `payment_status`: `pending | completed | failed | refunded` (⚠ `failed` never written — see `bk12`)
- `room_housekeeping_status`: `dirty | cleaning | ready`; `room_operational_status`: `active | retired`
- `staff_role`: `admin | receptionist | housekeeping`
- `transfer_direction`: `arrival | departure`; `transfer_status`: `scheduled | completed | cancelled`
- `equipment_booking_status`: `active | returned | cancelled | pending`; `equipment_condition_status`: `good | needs_maintenance | retired`
- Free-text: maintenance `status` (`open/resolved/closed`), `priority` (`low/normal/high/urgent`); booking `board_plan` (`room_only/half_board/full_board` via `boardPlanSchema`).

**RPCs / DB functions:** `get_available_rooms(category, ci, co)` · `get_available_equipment_units(category, start, end)` (SECURITY DEFINER; good condition + no overlapping active rental; migration :174) · `global_search(q)` (migration :194) · `lookup_booking_by_ref(ref, email)` (service-role only; migration :113) · `get_staff_role()` (SECURITY DEFINER, active-only) · `handle_new_user()` trigger (self-signups → `housekeeping`).

**Hard-coded IDs in `src/lib/constants.ts`:** `CATEGORY_DELUXE`, `CATEGORY_BUDGET`, `EQUIPMENT_SURFBOARD`, `EQUIPMENT_BICYCLE`, `MOTORBIKE_CATEGORIES` {tvs_ntorq, honda_dio, honda_navi}, `CAR_CATEGORIES` {wagonR, hustler, aqua, fit_gp5, prius, vezel, fit_shuttle, every}, `ROUTE_CMB` (Colombo transfer route), `BOARD_PLANS`.

## 4. Server actions quick reference (`src/lib/actions/`)

| File | Wired to UI | Unused (implemented, no importer) |
|---|---|---|
| `bookings.ts` | `createPayHereBooking`, `lookupBookingByRef`, `lookupBookingByGroupId`, `checkIn`, `checkOut`, `cancelBooking`, `updateBookingStatus`, `recordDeposit`, `confirmBankTransfer`, `refundBookingPayment` | `createBooking`, `getBooking`, `getBookingsByGroup`, `getTodayArrivals`, `getTodayDepartures` |
| `billing.ts` | `postCharge`, `generateInvoice`, `recordPayment` | `getInvoice` |
| `rooms.ts` | `getAvailableRooms`, `moveGuestToRoom`, `updateRoomHousekeepingStatus` | `getRoomCategories`, `getCalendarBookings`, `getAllRooms`, `getAllAvailableRooms` |
| `guests.ts` | — | **all** (`createGuest`, `searchGuests`, `getGuestRegister`, `getGuest`, `updateGuest`, `getGuestWithBookings`) |
| `transfers.ts` | — | **all** (`getTransferRoutes`, `createTransfer`, `updateTransferStatus`, `getSchedule`) |
| `equipment.ts` | `getAvailableUnits` (via PaymentReview) | `getEquipmentCategories`, `createRental`, `returnUnit`, `getActiveRentals` |
| `maintenance.ts` | — | **all** (`reportMaintenanceIssue`, `getMaintenanceRequests`, `updateMaintenanceStatus`) |
| `shiftnotes.ts` | `addShiftNote`, `deleteShiftNote` | `getShiftNotes` |
| `admin.ts` | — | **all** (`getStaffList`, `deactivateStaff`, `updatePricing`, `toggleRoomMaintenance` — all `requireAdmin`) |
| `settings.ts` | — | `getSettings`, `updateSettings` |

⚠ The unused actions are exactly what feature `uh03` wants wired up — the dashboard reimplements them as direct browser writes.

---

# PART 2 — SELECTED FEATURES TO BUILD (38)

> Status legend: 🐛 Bug (exists but wrong) · 🔧 Improve (partial) · 💡 Idea (started) · ✨ New.
> IDs match `SELECTED-FEATURES.md`. Suggested build order is in §5.

## Booking Flow & Guest Portal (8 selected)

### `bk01` 🐛 Guest count never captured on website bookings
- **Current:** Hero bar collects `guests` (1–6) and puts it in the URL (`src/components/public/HeroSection.tsx:16,31`), but `/booking` only reads `categoryId/checkIn/checkOut` (`src/app/booking/page.tsx:19`); the wizard has no guest field; `createPayHereBooking` never sets `bookings.num_guests` → NULL (guest pages display "1 guest", `booking-detail-client.tsx` ~:137).
- **Target:** Guest count flows hero → URL → wizard state → `createPayHereBooking` → `bookings.num_guests`. Staff form already does this correctly (`BookingForm.tsx:300`) — copy that pattern.
- **Files:** `HeroSection.tsx`, `src/app/booking/page.tsx` (extend `searchParams` type), `BookingWizard.tsx` (state), `PaymentReview.tsx` (payload), `src/lib/actions/bookings.ts` (insert + type), `booking-detail-client.tsx`.
- **Note:** Implemented together with `bk05` (they share the wizard state change).

### `bk02` 🐛 Departure transfers booked on check-in date
- **Current:** `PaymentReview.tsx:104` always builds `transfer_datetime: \`${checkIn}T${transferTime}\`` regardless of `extras.transferDirection`.
- **Target:** `arrival` → check-in date; `departure` → check-out date. Prefer collecting an explicit pickup date in `ExtrasStep` for departures, defaulting to check-out.
- **Files:** `src/components/public/PaymentReview.tsx:104`, `src/components/public/ExtrasStep.tsx` (transfer block ~:468-525, may need a date field; `extrasSchema` in `src/lib/validations.ts`), server price/date handling in `createPayHereBooking`.
- **Watch:** Operations timeline and `/dashboard/transfers` display `transfer_datetime` — no change needed there, they'll just show the correct date.

### `bk03` 🐛 Extras silently shrink when stock is short
- **Current:** At payment, `PaymentReview.tsx:76` (surfboards) and `:98` (vehicles) loop `Math.min(requestedQty, availableUnits.length)` — fewer units are booked and charged with no user message.
- **Target:** Surface the shortfall before charging: block payment or show an explicit notice ("Only 1 of 2 surfboards is available — continue?"). Never silently change the order.
- **Files:** `src/components/public/PaymentReview.tsx` (lines ~70-110 + review UI ~:192-276).
- **Pattern:** The room availability errors in `src/lib/actions/bookings.ts:151-211` already return friendly messages — mirror that.

### `bk04` 🔧 Wrong button label on step 1
- **Current:** `DateStep.tsx:495` renders "Next: Add Extras" but the next step is Board Plan.
- **Target:** "Next: Choose Board Plan" (or "Continue").
- **Files:** `src/components/public/DateStep.tsx:495`. One-line fix.

### `bk05` ✨ "How many guests?" field in the booking form
- **Current:** `GuestDetailsStep.tsx` collects name/email/phone/nationality/NIC only; zod `guestSchema` (`src/lib/validations.ts:3-18`) has no guest count.
- **Target:** Add a number-of-guests input (min 1, cap at max occupancy of the selected rooms; hero value pre-fills it — see `bk01`). Store on `bookings.num_guests` and show on confirmation/portal/invoices where relevant.
- **Files:** `GuestDetailsStep.tsx`, `src/lib/validations.ts` (`guestSchema`), `BookingWizard.tsx`, `PaymentReview.tsx`, `src/lib/actions/bookings.ts`, optionally capacity check against `room_categories.max_occupancy` (server-side in `createPayHereBooking`).
- **Implements together with:** `bk01`.

### `bk09` 🔧 Confirmation page should reflect the real status
- **Current:** `src/app/booking/confirmation/[id]/page.tsx` renders a static "Booking Confirmed" heading (~:116) even when the live badge says "Pending Payment"; no refresh. Page fetches with `createAdminClient()` (:3,:34,:56).
- **Target:** Heading/copy derived from `bookings.status` (e.g. "Payment received — your booking is confirmed" vs "Complete your payment to confirm"); while `pending_payment`, auto-refetch (poll every ~5s with a cap, or router.refresh interval) and stop when confirmed.
- **Files:** `src/app/booking/confirmation/[id]/page.tsx`. Note `NEXT_PUBLIC_APP_URL` for origin; keep JSON-LD.
- **Related:** `bk12` (failed payments), `uh01` (this page's public access).

### `bk11` 🔧 Explain what happens after a cancelled payment
- **Current:** `src/app/api/payhere/cancel/route.ts:4` 302s straight to `/booking` with no message; the `pending_payment` rows keep blocking availability (blocking statuses include `pending_payment`).
- **Target:** (a) Guest lands on a clear "Payment cancelled — your booking is not confirmed" state (query param or dedicated section on `/booking`), with a link to retry; (b) release the held rooms: pass the group id in PayHere `cancel_url` (set at form submit in `PaymentReview.tsx` ~:139-160) and cancel the `pending_payment` group in the cancel route (server-side, service-role), or add expiry (not selected — keep to cancel-flow release).
- **Files:** `src/app/api/payhere/cancel/route.ts`, `src/components/public/PaymentReview.tsx` (cancel_url construction), `src/app/booking/page.tsx` (message state), `src/lib/actions/bookings.ts` (reusable cancel-by-group helper; `cancelBooking` at :310 works per-booking).
- **Care:** Don't release bookings that were already confirmed by webhook.

### `bk12` 🔧 Handle failed payments properly
- **Current:** `src/app/api/payhere/notify/route.ts:27` — `status_code !== "2"` returns `{status:"ok"}` and does nothing: no record, no email, booking stays `pending_payment` forever. `payments.status` enum value `failed` exists but is never used.
- **Target:** For a verified-signature failure (e.g. status 1 = failed): record a `payments` row with `status:'failed'` (or a booking note), and email the guest ("payment didn't go through — retry here" with their portal link) using Resend. Keep `pending_payment` (or mark expiry).
- **Files:** `src/app/api/payhere/notify/route.ts`, `src/lib/email.ts` (add `sendPaymentFailedEmail` following the `sendBookingConfirmation` HTML pattern), `src/lib/actions/bookings.ts`. The retry link in the email should point to the existing lookup/portal page (`/booking/lookup`) — no self-service retry-payment flow exists.
- **Guard:** Only act on verified signatures (signature check happens before the status branch — keep that order).

## Payments, Invoices & Money (6 selected)

### `py01` 🐛 Refund breaks with >1 card payment
- **Current:** `refundBookingPayment` (`src/lib/actions/bookings.ts:442-471`) finds the completed `card_payhere` payment with `.single()` (:454) → throws if a booking has e.g. deposit + balance.
- **Target:** Refund a **specific payment**: change the action to accept `paymentId`, fetch that row, verify `method='card_payhere' && status='completed'`, call PayHere refund with its `payhere_payment_id`, then set that row `refunded`. UI passes the clicked row's id.
- **Files:** `src/lib/actions/bookings.ts:442-471`, `src/components/dashboard/BookingDetail.tsx` (payments table + Refund button ~:482-503).
- **Note:** Webhook idempotency in `notify/route.ts` uses `maybeSingle()` per booking — also fragile with >1 payment; make it check by `payhere_payment_id` while here.

### `py02` 🔧 Partial payments mark the whole invoice as paid
- **Current:** `recordPayment` (`src/lib/actions/billing.ts:105-124`) updates `invoices.status='paid'` whenever `invoice_id` is passed (:123-124), regardless of amount.
- **Target:** After inserting the payment, sum completed payments for the booking vs `grand_total_usd`: set `paid` only when `paid >= total`, else keep `issued`. Optionally surface "balance remaining" in `InvoiceView`/detail.
- **Files:** `src/lib/actions/billing.ts` (`recordPayment`), `src/components/dashboard/BookingDetail.tsx` (Record Payment dialog + invoice card), `src/components/dashboard/InvoiceView.tsx`.
- **Constraint:** `invoice_status` enum has only draft/issued/paid — no "partial"; use `issued` + balance display (no enum change needed).

### `py03` 🔧 Regenerating an invoice silently overwrites
- **Current:** `generateInvoice` (`src/lib/actions/billing.ts:37`) upserts the single `invoices` row per booking (unique `booking_id`) as `issued`, overwriting totals/`issued_at`.
- **Target:** UI guard at minimum: when an invoice already exists, confirm ("An invoice was issued on X — replace it?"). Optionally keep an `invoice_history`/log note. Server: only overwrite when explicitly forced.
- **Files:** `src/components/dashboard/BookingDetail.tsx` (Generate Invoice button + preview dialog), `src/lib/actions/billing.ts`.

### `py04` 🔧 Extra charges can't be edited or deleted
- **Current:** `postCharge` (`src/lib/actions/billing.ts:9`) inserts `booking_charges`; no update/delete action or UI anywhere. ChargeForm (`src/components/dashboard/ChargeForm.tsx`) is insert-only.
- **Target:** Add `updateCharge`/`deleteCharge` server actions (requireStaff; validate like `chargeSchema`), plus edit (pencil) and delete (trash + confirm) in the charges table in `BookingDetail.tsx`.
- **Files:** `src/lib/actions/billing.ts`, `src/lib/validations.ts` (reuse `chargeSchema`), `src/components/dashboard/BookingDetail.tsx` (charges table), `src/components/dashboard/ChargeForm.tsx` (edit mode).
- **Watch:** Invoice already generated? Deleting a charge should warn/re-generate (`py03` interplay).

### `py05` 🔧 Move room doesn't recalculate price
- **Current:** `moveGuestToRoom` (`src/lib/actions/rooms.ts`, wired from `BookingDetail.tsx` Move Room dialog) updates `bookings.room_id` only; `room_total_usd` keeps the old rate.
- **Target:** In the action, after conflict check: fetch the new room's category base price, recompute `room_total_usd = base_price × nights`, update the row. Surface the price change in the dialog/toast.
- **Files:** `src/lib/actions/rooms.ts` (`moveGuestToRoom`), `src/components/dashboard/BookingDetail.tsx` (Move Room dialog; show before/after totals).
- **Server pricing rule:** compute server-side (never trust client) — same as `validateAndComputeRoomTotal` in `src/lib/booking-pricing.ts`.

### `py06` 🔧 Deposits always recorded as "cash"
- **Current:** `recordDeposit` (`src/lib/actions/bookings.ts:405-414`) hard-codes `method: "cash"`; UI dialog in `BookingDetail.tsx` has only an amount input.
- **Target:** Add method choice (cash / bank_transfer / card_payhere chips — copy the existing Record Payment dialog pattern) and pass it through the action.
- **Files:** `src/lib/actions/bookings.ts:405-414`, `src/components/dashboard/BookingDetail.tsx` (Record Deposit dialog).

## Guest-Facing Website (3 selected)

### `wb01` 🐛 "Events & Gatherings" card leads to 404
- **Current:** `src/components/public/HotelIntroSection.tsx:18` links to `/events` — route doesn't exist.
- **Target (owner chose fix, not a new page):** Point the card at an existing page — best options: `/dine` (private dining is mentioned there) or `/experiences`, or remove the card. **Recommended:** retarget to `/dine` and keep copy.
- **Files:** `src/components/public/HotelIntroSection.tsx` (:4-20,41-55).

### `wb02` 🔧 Experience enquiries lose their context
- **Current:** `src/app/experiences/page.tsx:76-81` links to plain `/contact`; the contact form (`src/app/contact/page.tsx:24-63`) inserts only name/email/message.
- **Target:** Append `?experience=<slug-or-title>` to the inquiry links; in `/contact`, read the param, show a chip/hidden context ("Enquiring about: Surfing") and prepend it to the stored message (keep `contact_messages` schema unchanged — simplest), and prefill the message textarea.
- **Files:** `src/app/experiences/page.tsx`, `src/app/contact/page.tsx`.

### `wb03` 🔧 "Reserve a Table" sends people to book a room
- **Current:** `src/app/dine/page.tsx:37-42` — button links to `/booking` (room wizard). No table-booking feature exists.
- **Target (owner chose fix):** Replace with a table-inquiry CTA → `/contact?subject=Table%20Reservation` (add the same context-prefill mechanism as `wb02`), and fix the copy ("Reserve a table — we'll confirm by email"). Alternative if preferred: remove the button.
- **Files:** `src/app/dine/page.tsx`, `src/app/contact/page.tsx` (shared prefill logic with `wb02`).

## Staff Dashboard — Bookings & Guests (4 selected)

### `ds03` 🔧 Bookings list has no search, filters or export
- **Current:** `src/app/dashboard/(main)/bookings/page.tsx` — plain table, `created_at desc`, `.limit(50)` (:14), no controls.
- **Target:** Add (client-side or server-side with search params): status filter chips, check-in date range, guest-name search; pagination or "load more" beyond 50; CSV export button.
- **Files:** `src/app/dashboard/(main)/bookings/page.tsx`; new small components under `src/components/dashboard/` (e.g. `BookingsFilters.tsx`).
- **Patterns to reuse:** CSV export — `src/components/dashboard/GuestTable.tsx` (filtered Blob download); paging — `getGuestRegister(limit/offset)` in `src/lib/actions/guests.ts` (unused action, can be wired).

### `ds04` 🔧 "Walk-in" and "New Booking" buttons are identical
- **Current:** Both buttons on `(main)/page.tsx:125-136` link to `/dashboard/bookings/new`; the form's source defaults to `walk_in` anyway.
- **Target:** Walk-in → `/dashboard/bookings/new?source=walk_in` and New Booking → `?source=new` (or none); `BookingForm.tsx` reads the param to preselect the Source select (and maybe a "Walk-in" heading).
- **Files:** `src/app/dashboard/(main)/page.tsx`, `src/components/dashboard/BookingForm.tsx` (source state ~:446 area).

### `ds05` 🐛 "New booking for this guest" doesn't attach the guest
- **Current:** `GuestProfile.tsx:138-139` pushes `/dashboard/bookings/new` with no params → blank form → inserts a **new guest row** (duplicate).
- **Target:** Push `/dashboard/bookings/new?guestId=<id>`; `BookingForm.tsx` loads that guest (via `getGuest` in `src/lib/actions/guests.ts` — exists, unused), shows it as a locked/selected chip ("Booking for Ana Silva ✕" to clear), and **skips the guest insert** on submit (pass `guest_id` through).
- **Files:** `src/components/dashboard/GuestProfile.tsx:138`, `src/components/dashboard/BookingForm.tsx` (guest section + submit ~:250-320), `src/lib/actions/guests.ts` (`getGuest`).
- **Note:** The booking insert already links `guest_id` — only the guest-create path needs branching.

### `ds09` 🔧 Quick check-out skips invoicing and room status
- **Current:** `QuickCheckoutSheet.tsx:104` — "Complete Check-out" only sets `bookings.status='checked_out'`. No invoice is generated and the room is **not** marked dirty (the detail-page `checkOut` flow also doesn't dirty the room, but Mark-Clean/Quick flows expect dirty rooms to exist).
- **Target:** On complete check-out: (1) generate the invoice if none exists (`generateInvoice` — `src/lib/actions/billing.ts:37`, requireStaff, callable from server or reuse logic); (2) set the booking's room `housekeeping_status='dirty'`. Show the invoice in the sheet summary before confirming (sheet already fetches the invoice `maybeSingle()` at :67 — if absent, generate or compute).
- **Files:** `src/components/dashboard/QuickCheckoutSheet.tsx`; optionally `src/lib/actions/bookings.ts` (`checkOut`) so both flows share "check out + dirty room" behavior — then use the same in `BookingDetail.tsx`.
- **Consistency rule:** pick one implementation (server action) and use it in both places.

## Staff Dashboard — Operations & Rooms (9 selected)

### `op01` 🔧 Room status cards aren't clickable
- **Current:** `RoomStatusBoard.tsx` renders non-interactive cards; the overview page fetches guest names but not booking ids.
- **Target:** Each card links somewhere useful: if there's a current booking → `/dashboard/bookings/<id>`; if arriving today → that booking; else → `/dashboard/calendar`. Requires adding `booking_id` to the page query (`(main)/page.tsx` room-status query) and passing it to the board.
- **Files:** `src/app/dashboard/(main)/page.tsx` (query), `src/components/dashboard/RoomStatusBoard.tsx` (render as `<Link>`).

### `op02` 🔧 Revenue card doesn't drill down
- **Current:** `RevenueCard.tsx` displays today/month/outstanding; not clickable; no export.
- **Target:** Click → popover/dialog listing the underlying payments (date, guest via booking, amount, method) for the selected period, with CSV export (reuse `GuestTable.tsx` CSV pattern). Query `payments` joined to `bookings→guests` filtered `status='completed'` and date range.
- **Files:** `src/components/dashboard/RevenueCard.tsx` (or new `RevenueBreakdown.tsx`), `src/app/dashboard/(main)/page.tsx`.

### `op06` 🔧 Calendar filters, legend and hidden statuses
- **Current:** `calendar/page.tsx:33` filters `.in("status", ["pending_payment","confirmed","checked_in","maintenance_block"])` — cancelled/no_show never shown; `CalendarGrid.tsx` has no legend or filters.
- **Target:** Include all statuses; style `cancelled` (strikethrough/muted red) and `no_show` (dashed) distinctly; add a legend row; add status filter chips (toggle which bars show).
- **Files:** `src/app/dashboard/(main)/calendar/page.tsx`, `src/components/dashboard/CalendarGrid.tsx` (bar styles :14-19, render :165-206, tooltip).

### `op07` 🔧 Operations timeline is read-only and capped
- **Current:** Today-only; arrivals hard-coded 14:00, departures 11:00, equipment returns 12:00 (`operations/page.tsx:21,28,42`); first 15 events then "+N more" (`OperationsTimeline.tsx:32,45`); no actions.
- **Target:** (1) Use real times from `settings.check_in_time` / `check_out_time` (ties into `ad08`) instead of literals; (2) date picker to view any day (filter the same three queries by chosen date); (3) remove the 15-cap (show all or paginate); (4) make arrival/departure rows link to `/dashboard/bookings/<id>` and transfers to `/dashboard/transfers`.
- **Files:** `src/app/dashboard/(main)/operations/page.tsx`, `src/components/dashboard/OperationsTimeline.tsx`.

### `op08` 🐛 Staff "New Rental" dialog skips availability checks
- **Current:** `EquipmentPanel.tsx:69` inserts `equipment_bookings` directly with `status:'active'` — no overlap/condition check, so double-booking is possible. The booking-flow path checks availability properly via RPC `get_available_equipment_units` (`PaymentReview.tsx`; action `getAvailableUnits` in `src/lib/actions/equipment.ts`).
- **Target:** Before insert, call the RPC for the chosen unit/category+dates (recommended: check the **specific unit id** has no overlapping active rental — extend or reuse `get_available_equipment_units(category, start, end)` and verify the chosen unit is in the result); block with a clear error toast if not.
- **Files:** `src/components/dashboard/EquipmentPanel.tsx` (dialog submit ~:60-85), `src/lib/actions/equipment.ts` (`getAvailableUnits`), migration `supabase/migrations/20260907000000_security_fixes.sql:174` (RPC definition).
- **Also fix the count bug `op09` in the same file.**

### `op09` 🐛 Equipment "active rentals" count includes returned items
- **Current:** `EquipmentPanel.tsx:96` shows `{activeBookings.length} active rental(s)`, but the initial `bookings` prop contains **all** rentals (page loads every `equipment_bookings` row).
- **Target:** Count/filter `status === 'active'` (the state is already named `activeBookings` — initialize it filtered: `useState(bookings.filter(b => b.status === "active"))`, and keep the table showing active by default with a separate "history/returned" section if desired).
- **Files:** `src/components/dashboard/EquipmentPanel.tsx:40,96`, `src/app/dashboard/(main)/equipment/page.tsx` (query).

### `op10` 🔧 Equipment return needs confirmation & undo
- **Current:** `EquipmentPanel.tsx:87` — one click sets `status:'returned'`, no dialog, no revert.
- **Target:** shadcn `Dialog` confirm ("Mark X as returned?"); on success toast with an **Undo** action (sonner supports action buttons) that sets the row back to `active`.
- **Files:** `src/components/dashboard/EquipmentPanel.tsx` (return button ~:181).

### `op12` 🔧 Transfers aren't linked to bookings
- **Current:** `TransferPanel.tsx:68` inserts `airport_transfers` without `booking_id` (always null), so the booking detail page (which loads transfers by booking) never shows staff-created transfers. The public wizard path **does** link them (`createPayHereBooking` sets booking_id).
- **Target:** In the New Transfer dialog, after guest selection, fetch that guest's bookings (non-cancelled) and add an optional/required "link to stay" select; write `booking_id`. If a guest has exactly one active booking, preselect it.
- **Files:** `src/components/dashboard/TransferPanel.tsx` (dialog + insert), guest bookings query (reuse pattern from `GuestProfile.tsx` bookings load).

### `op17` 🔧 Maintenance issues invisible on the housekeeping board
- **Current:** Housekeeping reports issues (`HousekeepingCard.tsx:58` inserts `maintenance_requests`) but `/dashboard/housekeeping` never fetches them; they only appear in Admin (`AdminPanel.tsx` card 5). RLS already allows staff SELECT (`staff_read_maintenance` policy).
- **Target:** Fetch open (`status='open'`) requests joined with room number; show a per-room badge ("⚠ 1 issue") and/or a board-level "Open issues" list with priority chips. Optionally allow marking `in_progress` from here (status values are free-text: open/resolved/closed).
- **Files:** `src/app/dashboard/housekeeping/page.tsx` (query), `src/components/dashboard/HousekeepingCard.tsx` (badge), optional new `MaintenanceList.tsx`.

## Admin & Settings (5 selected)

### `ad02` 🔧 Room category management (add / edit / rename)
- **Current:** `AdminPanel.tsx:71-77` updates `room_categories.base_price_usd` only (validated by `pricingUpdateSchema`).
- **Target:** CRUD UI: add category (name, description, max_occupancy, base_price, image_url), edit name/description/occupancy/image, rename. Server actions exist for pricing (`updatePricing` in `src/lib/actions/admin.ts` — currently unused) — extend or add `createRoomCategory`/`updateRoomCategory` with `requireAdmin`.
- **Files:** `src/components/dashboard/AdminPanel.tsx` (card 2), `src/lib/actions/admin.ts`, `src/lib/validations.ts` (new schema), `src/app/dashboard/(main)/admin/page.tsx` (server data load).
- **Watch:** Room detail slugs derive from category **name** (`rooms/[slug]` uses `ilike` on name; `RoomCategoryCard` slugifies) — renaming changes URLs (sitemap too, `src/app/sitemap.ts`). Keep the slug logic in sync or warn in UI.

### `ad03` 💡 Seasonal rates & minimum-stay rules
- **Current:** Single flat `room_categories.base_price_usd` × nights, always. Pricing core: `validateAndComputeRoomTotal` + `computeBookingTotal` (`src/lib/booking-pricing.ts`); wizard fetches prices in `src/app/booking/page.tsx:42-73`; staff form in `BookingForm.tsx`. No rate tables exist.
- **Target (design):** New table `rate_rules` (e.g. `id, name, category_id nullable, date_start, date_end, price_per_night_usd nullable, multiplier nullable, min_stay_nights int nullable, active bool`) + a resolver function `resolvePrice(categoryId, date)` that returns the applicable price (specific category rule > global rule > base price). Enforce `min_stay` in the wizard's `DateStep` availability/validation and in `createPayHereBooking`. Admin UI card to CRUD rules. Tests in `src/__tests__/pricing.test.ts` (existing zod/vitest pattern).
- **Files:** new migration under `supabase/migrations/` (⚠ base schema isn't in git — coordinate; add table via migration), `src/lib/booking-pricing.ts`, `src/lib/validations.ts`, `src/components/public/DateStep.tsx`, `src/app/booking/page.tsx`, `src/lib/actions/bookings.ts`, `src/components/dashboard/BookingForm.tsx`, `src/components/dashboard/AdminPanel.tsx`, `src/__tests__/pricing.test.ts`.
- **Size:** this is the largest selected item — plan as multiple commits (table+resolver → wizard enforcement → admin UI → tests). Server-side pricing only (ground rule #3).

### `ad05` 🔧 Maintenance requests: reopen, close, filter
- **Current:** `AdminPanel.tsx:312-360` lists open/in_progress and offers only "Resolve". `updateMaintenanceStatus` action exists (`src/lib/actions/maintenance.ts`, handles `resolved`/`closed` + `resolved_at`) but is unused (direct writes instead).
- **Target:** Status workflow buttons (open → in_progress → resolved; reopen resolved → open), priority display, filter chips by status/priority/room; wire through `updateMaintenanceStatus` (requireStaff) instead of direct browser writes (aligns with `uh03`).
- **Files:** `src/components/dashboard/AdminPanel.tsx` (card 5), `src/lib/actions/maintenance.ts`, `src/app/dashboard/(main)/admin/page.tsx`.

### `ad06` 🔧 Contact inbox improvements
- **Current:** `AdminPanel.tsx:439-460` — truncated rows (max-w-64), Read/New badge, read toggle (:159). No full view, delete, or reply.
- **Target:** (1) Row click → dialog with full message + metadata; (2) "Reply" button → `mailto:<email>?subject=Re: your enquiry&body=…` (simplest, no sending infra); (3) delete with confirm — ⚠ check RLS: staff have SELECT/UPDATE policies (`supabase/migrations/20260907000000_security_fixes.sql:33-45`) but likely **no DELETE policy** — add one (staff-only) via a new migration before wiring the button.
- **Files:** `src/components/dashboard/AdminPanel.tsx` (card 7), new migration if DELETE policy needed.

### `ad08` 🔧 Check-in / check-out times aren't enforced anywhere
- **Current:** `settings.check_in_time`/`check_out_time` are editable (`AdminPanel.tsx:291-295`) and saved, but read nowhere else.
- **Target (display + derive, minimal enforcement):** (1) Guest-facing: show "Check-in from 14:00 · Check-out by 11:00" on room detail, confirmation and portal pages (fetch settings server-side); (2) staff: use them in the Operations timeline (`op07`) instead of 14:00/11:00 literals; (3) optional helper `lateCheckoutFeeHours(settings)` to support `late_checkout_fee` charges. Avoid hard blocking of dates (availability is date-granular).
- **Files:** `src/app/rooms/[slug]/page.tsx`, `src/app/booking/confirmation/[id]/page.tsx`, `src/app/booking/[ref]/page.tsx`, `src/app/dashboard/(main)/operations/page.tsx`, maybe `src/lib/booking-pricing.ts` helper + `src/lib/actions/settings.ts` (`getSettings` exists, unused — wire it).

## Under the Hood — Security & Reliability (3 selected)

### `uh01` 🔧 Confirmation page visible to anyone with the link
- **Current:** `src/app/booking/confirmation/[id]/page.tsx` fetches the booking with `createAdminClient()` (:3,:34,:56) — no auth, full PII + prices for a bare UUID.
- **Target (recommended, minimal):** Replace the admin client with a **possession proof**: require a secret in the URL (e.g. `?t=<token>`) that only PayHere return + the paying browser has. Options: (a) HMAC token = `hmac(group_id, PAYHERE_MERCHANT_SECRET)` generated in `PaymentReview` and appended to `return_url`; (b) simplest robust: store a random `access_token` on the group at creation (column via migration) and check it server-side, 404/redirect otherwise. Keep the webhook path (server-to-server) on the admin client.
- **Files:** `src/app/booking/confirmation/[id]/page.tsx`, `src/components/public/PaymentReview.tsx` (return_url :143-150), possibly new migration (token column) or pure HMAC (no migration).
- **Coordinate with:** `bk09` (same file — do together), `bk11` (cancel_url shares the mechanism).

### `uh02` 🔧 Guest portal uses email in the URL as its "password"
- **Current:** `src/app/booking/[ref]/page.tsx:13-20` requires `?email=`; `lookupBookingByGroupId` (`src/lib/actions/bookings.ts`) service-role compares email exactly. Email travels in the clear in URLs (and logs/history).
- **Target:** One-time/unguessable token: add `access_token` (uuid, generated in `createPayHereBooking` and in staff-booking creation) to the group; portal link becomes `/booking/<ref>?t=<token>`; server validates token, no email in URL. Keep the lookup form as fallback (it can redirect to the tokenized URL after verification). Hash tokens at rest if storing (or accept random-uuid entropy).
- **Files:** migration (column on `bookings` or a `booking_access` table), `src/lib/actions/bookings.ts` (`createPayHereBooking` + `lookupBookingByGroupId`), `src/app/booking/lookup/lookup-form.tsx` (redirect target), `src/app/booking/[ref]/page.tsx`.
- **Related:** `bk01` confirmation email (`src/lib/email.ts`) links should also carry the token.

### `uh03` 🔧 Admin screens write data straight from the browser
- **Current:** These panels do direct `supabase.from(...).insert/update` with the anon client (RLS-only guard):
  - `AdminPanel.tsx` — profiles (:63), room_categories (:77), settings (:94), rooms (:105,:146), equipment_units (:120,:133), contact_messages (:159), maintenance_requests (:351)
  - `QuickCheckinSheet.tsx`, `QuickCheckoutSheet.tsx` (:104 + payments insert), `MarkCleanSheet.tsx`, `BookingForm.tsx` (guests/bookings/equipment inserts), `EquipmentPanel.tsx` (:69,:87), `TransferPanel.tsx` (:68), `HousekeepingCard.tsx` (:58)
  **Unused server actions already exist for most of this:** `src/lib/actions/{admin,settings,guests,transfers,equipment,maintenance}.ts`.
- **Target:** Route these writes through the server actions (wire the unused ones, add missing ones: contact delete `ad06`, payment record in quick checkout, check-out+dirty `ds09`). Every action uses `requireStaff()`/`requireAdmin()` from `src/lib/auth.ts`. Client components then call actions and `router.refresh()`.
- **Suggested batching (atomic commits):** (1) admin panel → `admin.ts`/`settings.ts`; (2) quick sheets + booking form → `bookings.ts`/`guests.ts`; (3) equipment + transfers panels → `equipment.ts`/`transfers.ts`; (4) housekeeping card → `maintenance.ts` + rooms action.
- **Files:** all listed above; `src/lib/auth.ts` (existing guards).
- **Note:** Several selected features (`op08`, `op10`, `op12`, `ds05`, `ad05`, `ad06`) touch these same components — implement their fixes **through** server actions to avoid doing this twice.

---

## 5. Suggested build order (dependencies & risk)

1. **Bug batch 1 — booking wizard** (same files): `bk01` + `bk05` (guest count), `bk02` (transfer date), `bk03` (silent shrink), `bk04` (label).
2. **Payment robustness:** `py01` (refund by payment id), `py02` (partial payments), `py03` (invoice overwrite confirm), `bk12` (failed payments), `bk09` + `uh01` (confirmation page: status + access — same file).
3. **Post-payment UX:** `bk11` (cancel explanation + release), `uh02` (portal token — touches `createPayHereBooking` and email links).
4. **Dashboard quick wins:** `ds04` (walk-in prefill), `ds05` (guest prefill), `ds09` (quick check-out), `op08` + `op09` + `op10` (equipment panel), `op12` (transfer link), `op17` (housekeeping issues).
5. **Dashboard bigger UI:** `ds03` (bookings filters/export), `op01` (room cards), `op02` (revenue drill-down), `op06` (calendar), `op07` (timeline — pairs with `ad08`).
6. **Admin:** `ad05` (maintenance), `ad06` (inbox), `ad02` (categories), `ad08` (times used everywhere), then `uh03` (server-action wiring — do alongside 4–6 to avoid rework).
7. **Last (largest):** `ad03` (seasonal rates) — after pricing-touching fixes are merged; extend `src/__tests__/pricing.test.ts` first (red-green).

## 6. Verification checklist (per feature)

- [ ] `npm run lint` · `npx tsc --noEmit` · `npm test` all pass
- [ ] Money/price logic recomputed **server-side** only; client totals never trusted
- [ ] New writes go through `requireStaff()`/`requireAdmin()` server actions (not direct browser writes)
- [ ] RLS implications considered (new tables/policies need a migration under `supabase/migrations/`; note the base schema is not in git)
- [ ] Public flows re-tested with the booking kill-switch off (`NEXT_PUBLIC_BOOKING_ENABLED=false`)
- [ ] PayHere flows still work in sandbox; webhook reconciliation unchanged
- [ ] Commit per slice with conventional message (`fix:`/`feat:`), no push
