# Le Palme Ahangama — Testing Plan

**Stack:** Vitest (unit/integration) + Playwright (E2E) + Testing Library (components)
**Targets:** Local (`http://localhost:3000`) and Netlify (via `PLAYWRIGHT_BASE_URL`)

---

## 1. Utility Layer (Vitest)

### `src/lib/utils.ts`
- `cn()` merges classes and resolves Tailwind conflicts
- `formatCurrency()` formats USD correctly (0, decimal, thousands) and handles NaN
- `roundTo()` rounds to specified decimals with correct rounding

### `src/lib/validations.ts` — all 13 Zod schemas
Each tested with valid inputs (pass), invalid per field (correct error path + message), and boundaries:
- `guestSchema` — empty name, bad email, phone special chars, nationality with numbers
- `dateStepSchema` — checkout before checkin, zero qty, missing selections
- `extrasSchema` — negative qty, equipment end < start, transfer without time
- `bookingLookupSchema`, `loginSchema`, `dashboardBookingSchema`, `chargeSchema`, `equipmentRentalSchema`, `transferSchema`, `recordPaymentSchema`, `settingsSchema`, `addUnitSchema`, `pricingUpdateSchema`

---

## 2. Server Actions (Vitest — Mocked Supabase)

All 10 action files. Mock `createServerClient()` / `createAdminClient()`.

| File | Key tests |
|---|---|
| **bookings.ts** | create single + multi-room, check-in/out, cancel (with/without payments), lookup by ref/group, today arrivals/departures, record deposit, rollback on Polar failure |
| **guests.ts** | create, search by name, get register, get/update, bookings history |
| **rooms.ts** | categories, availability, calendar, move guest, update housekeeping |
| **billing.ts** | post charge, generate invoice, record payment (cash/card/bank), confirm bank transfer |
| **equipment.ts** | categories, available units, create rental, return, active rentals |
| **transfers.ts** | routes, create, update status, schedule |
| **shiftnotes.ts** | add, list, delete own note |
| **maintenance.ts** | report, get all, resolve |
| **admin.ts** | staff list, deactivate, update pricing, toggle room maintenance |
| **settings.ts** | get, update |

---

## 3. Auth Layer (Vitest)

- `requireStaff()` — admin, receptionist, housekeeping all pass; no session → error
- `requireAdmin()` — admin passes; receptionist/housekeeping → forbidden; no session → error

---

## 4. API Routes (Vitest)

**`GET /api/polar/success`** — valid checkout_id confirms booking; missing/invalid → error; idempotent

**`POST /api/polar/webhook`** — valid signature + `order.paid` → booking confirmed; bad signature → 401; non-order event → 200 no-op; duplicate → idempotent

---

## 5. Component Tests (Vitest + Testing Library)

### Public
- **PublicNavbar** — links render, scroll changes opacity, mobile hamburger, dark toggle
- **PublicFooter** — all columns with contact/nav/social
- **HeroSection** — CTA buttons, booking bar
- **RoomCategoryCard** — name, price, image, max occupancy, CTA link
- **BookingWizard** — 4-step flow, sessionStorage persistence, back/next
- **DateStep** — date pickers, room quantity, availability check
- **ExtrasStep** — equipment steppers (0–20), transfer toggle
- **GuestDetailsStep** — react-hook-form validation, errors shown
- **PaymentReview** — accurate price breakdown, loading state

### Dashboard
- **DashboardShell/Header/AppSidebar** — layout, role-filtered nav links
- **OverviewCards** — arrivals, departures, occupancy %, dirty rooms
- **RoomStatusBoard** — all rooms with status + occupant
- **RevenueCard** — today/month/outstanding
- **ShiftNotes** — add, list, delete
- **QuickCheckinSheet/QuickCheckoutSheet/MarkCleanSheet** — open, select, submit
- **CalendarGrid** — 30-day grid with bookings
- **BookingDetail** — status transitions, charges, payments, invoice, move room
- **BookingForm** — dates, room selector, guest fields, OTA conditional
- **GuestTable/GuestProfile** — search, CSV export, financial summary
- **ChargeForm/InvoiceView** — create charge, display invoice
- **HousekeepingCard/EquipmentPanel/TransferPanel** — status updates, CRUD
- **OperationsTimeline** — chronological events
- **AdminPanel** — staff deactivate, pricing, settings, maintenance, equipment units

---

## 6. E2E (Playwright)

### 6.1 Public Site
- Homepage renders all sections (hero, navbar, footer, room showcase, restaurant, experiences, amenities, gallery, newsletter)
- Navbar links navigate correctly, mobile hamburger works
- Theme toggle persists across reload
- `/rooms` listing, `/rooms/[slug]` detail
- `/about`, `/contact`, `/dine`, `/experiences` render

### 6.2 Booking Flow
- Full 4-step wizard: dates → extras → guest details → review/pay → Polar redirect → confirmation page
- sessionStorage persistence on refresh
- Validation errors on each step
- Hero / room detail "Check Availability" pre-fills booking page
- Booking lookup: valid ref → detail; invalid ref → error; wrong email → mismatch

### 6.3 Auth
- `/dashboard` without auth → redirect to `/auth/login`
- Login valid → dashboard; invalid → error
- Already logged in → login page redirects to dashboard
- Logout clears session

### 6.4 Dashboard
- **Overview** — cards, room board, shift notes CRUD, quick check-in/out, mark clean
- **Bookings** — list, create (walk-in/OTA), detail page, check-in/out/cancel, charges, payments, deposits, move room
- **Calendar** — 30-day grid loads
- **Guests** — register table, search, CSV export, profile
- **Housekeeping** — status board, update status
- **Operations** — today's timeline
- **Equipment** — create rental, list active, return
- **Transfers** — create, update status
- **Admin** — staff deactivate, pricing, settings, maintenance, room toggle, add unit

### 6.5 Role-Based Access
- Receptionist: no admin link in sidebar
- Housekeeping: restricted to housekeeping page
- Admin: all links visible

### 6.6 SEO
- JSON-LD on home (Hotel), room (HotelRoom), confirmation (Order)
- Open Graph / Twitter meta tags on all pages
- `/sitemap.xml` + `/robots.txt` return 200

---

## 7. Netlify Deployment

| Test | Assertion |
|---|---|
| `npm run build` | Exit 0 |
| All public routes | 200 |
| Dashboard middleware | Redirects unauthenticated |
| Server Actions | Work in serverless |
| API routes | Valid responses |
| Remote images | Load from Supabase + Unsplash |
| 404 page | Renders on unknown route |

---

## 8. Security & Edge Cases

- Unauthenticated API calls rejected
- Role enforcement on admin-only server actions
- Invalid UUIDs, missing params → validation errors
- Concurrent check-in race → DB constraint prevents double booking
- Webhook replay → idempotent
- Date logic: cross-year, leap year, Colombo +5:30 timezone
- Empty states, loading skeletons, error boundaries

---

## Test Structure

```
src/__tests__/
  lib/          utils.test.ts, validations.test.ts, auth.test.ts
  actions/      bookings.test.ts, guests.test.ts, rooms.test.ts, billing.test.ts,
                equipment.test.ts, transfers.test.ts, shiftnotes.test.ts,
                maintenance.test.ts, admin.test.ts, settings.test.ts
  components/
    public/     PublicNavbar, HeroSection, BookingWizard, DateStep, ExtrasStep,
                GuestDetailsStep, PaymentReview, etc.
    dashboard/  OverviewCards, BookingDetail, BookingForm, GuestTable, etc.
  api/          polar-success.test.ts, polar-webhook.test.ts

e2e/
  public-site.spec.ts, booking-flow.spec.ts, auth.spec.ts,
  dashboard-overview.spec.ts, dashboard-bookings.spec.ts, dashboard-calendar.spec.ts,
  dashboard-guests.spec.ts, dashboard-housekeeping.spec.ts, dashboard-operations.spec.ts,
  dashboard-equipment.spec.ts, dashboard-transfers.spec.ts, dashboard-admin.spec.ts,
  role-based-access.spec.ts, seo.spec.ts, netlify-deploy.spec.ts
```

## Config

**`vitest.config.ts`** — `@/` alias, `node` + `happy-dom` environments, v8 coverage (80%+ target on utils/actions)

**`playwright.config.ts`** — `baseURL` from `PLAYWRIGHT_BASE_URL` env, web server `npm run dev`, chromium + firefox projects

## package.json scripts

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:deploy": "PLAYWRIGHT_BASE_URL=$DEPLOY_URL playwright test"
```

## Test Data
- Seed script: 2 room categories, 6 rooms, 2 equipment categories + 4 units, 2 airport routes, 3 staff profiles, 1 settings row, 2 sample guests + bookings
- Factory functions for booking/guest/charge data objects
- Supabase clients mocked globally in Vitest setup
- Playwright fixture stores auth cookie after login
