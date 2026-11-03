# Le Palme Ahangama — Project Specification

**System:** Hotel PMS + Guest Booking Website ("Le Palme Ahangama")
**Stack:** Next.js 16 (App Router, RSC) · React 19 · TypeScript 5 · Supabase (Postgres 17, Auth, RLS) · Tailwind v4 · shadcn/ui (Base UI)
**Version:** 1.0 — 2026-10-22
**Status:** Living specification. Derived from the running codebase, the live Supabase project, and the graphify knowledge graph (`graphify-out/`, 1,084 nodes / 2,419 edges).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Scope & Personas](#2-product-scope--personas)
3. [System Architecture](#3-system-architecture)
4. [Domain Model](#4-domain-model)
5. [Identity, Roles & Access Control](#5-identity-roles--access-control)
6. [Public Website Specification](#6-public-website-specification)
7. [Booking & Payment Specification](#7-booking--payment-specification)
8. [Staff Dashboard Specification](#8-staff-dashboard-specification)
9. [Server Action Catalogue](#9-server-action-catalogue)
10. [Validation & Pricing Rules](#10-validation--pricing-rules)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Design System](#12-design-system)
13. [Infrastructure, Build & Deployment](#13-infrastructure-build--deployment)
14. [Testing Strategy](#14-testing-strategy)
15. [Operations & Observability](#15-operations--observability)
16. [Known Gaps & Backlog](#16-known-gaps--backlog)
17. [Glossary](#17-glossary)

---

## 1. Executive Summary

Le Palme Ahangama is a small boutique property in Ahangama, Sri Lanka. The system is two products sharing one database:

- **A guest-facing website** — marketing pages, a 5-step booking wizard, PayHere card checkout, a self-service booking portal, and a contact/enquiry form.
- **A staff dashboard (PMS)** — front-desk operations for bookings, guests, check-in/check-out, billing, invoices, room inventory, equipment rentals, airport transfers, housekeeping and maintenance, plus an admin panel.

### Design principles

| Principle | Expression in the system |
|---|---|
| **The server owns the money** | Every price that reaches PayHere is recomputed server-side (`computeBookingTotal`). Client-supplied prices are never trusted. The webhook independently recomputes the expected total and refuses to confirm on mismatch. |
| **Availability is enforced twice** | A Postgres `EXCLUDE` constraint (gist on `room_id + daterange`) is the ultimate authority; RPCs (`get_available_rooms`, `get_available_equipment_units`) give the UI a fast, race-safe preview. A `23P01` violation is surfaced as a friendly message. |
| **Holds must never leak** | Abandoned or cancelled bookings must release their equipment and transfer inventory. Enforced at three layers: the `expire_pending_bookings` cron, the `cancelBooking` action, and the PayHere cancel route. |
| **One hotel clock** | All wall-clock times are `Asia/Colombo` (UTC+05:30). `src/lib/datetime.ts` is the single source of truth for hotel-local conversion and formatting. |
| **Least privilege by default** | A new Supabase signup is provisioned as `housekeeping`. Roles are escalated by an admin, never self-assigned. |

---

## 2. Product Scope & Personas

### 2.1 Personas

| Persona | Entry point | Capabilities |
|---|---|---|
| **Prospective guest** | Public website | Browse rooms, check availability, build a stay with extras, pay by card, look up an existing booking by reference + email, send an enquiry. |
| **Receptionist** | `/auth/login` → `/dashboard` | Everything a front desk does daily: create walk-in/OTA bookings, check in/out, post charges, take payments, issue invoices, refund cards, manage equipment rentals and airport transfers, look up guests. |
| **Housekeeping** | `/auth/login` → `/dashboard/housekeeping` | Set room status (dirty → cleaning → ready), report maintenance issues, view open issues per room. |
| **Admin** | `/auth/login` → `/dashboard/admin` | Staff accounts, room categories & pricing, rooms, hotel settings (times, surcharge %, deposit %), maintenance workflow, equipment units, contact inbox. Admin also has full receptionist access. |

### 2.2 Scope boundaries

**In scope:** guest website, booking wizard, PayHere checkout, guest portal, staff dashboard, billing, inventory, housekeeping, maintenance, admin, emails, SEO, accessibility.

**Explicitly out of scope (deferred):** seasonal/date-based rate plans, a guest-facing "pay again / retry" flow, a guest-facing self-cancel action, multi-property support, currency conversion (USD only), OTA/channel-manager integrations, i18n (English only), and enforced Content-Security-Policy (report-only only — see [§11](#11-non-functional-requirements)).

---

## 3. System Architecture

### 3.1 Layer view

```
┌───────────────────────────────────────────────────────────────────────────┐
│  CLIENT (Browser)                                                        │
│  Public pages (RSC) · Booking wizard (5 client steps) · Dashboard (RSC+  │
│  client islands) · shadcn/Base-UI primitives · cmdk palette ⌘K          │
└───────────────┬───────────────────────────────────┬───────────────────────┘
                │ Server Actions (POST, RSC RPC)   │ Route Handlers
                │                                   │ /api/payhere/{hash,notify,cancel,return}
                │                                   │ /api/search · /auth/callback
┌───────────────▼───────────────────────────────────▼───────────────────────┐
│  NEXT.JS 16 SERVER RUNTIME (Node)                                        │
│  src/proxy.ts → session refresh + auth redirects                          │
│  layouts: /dashboard → (main) → per-module role gates                     │
│  src/lib/auth.ts: requireStaff · requireAnyStaff · requireAdmin          │
└───────────────┬───────────────────────────────────┬───────────────────────┘
                │                                   │
        ┌───────▼────────┐                 ┌────────▼─────────┐
        │ Supabase server │                 │ Supabase admin  │
        │ client (cookie) │                 │ client (service │
        │ → RLS applies   │                 │ role, RLS BYPASS)│
        └───────┬────────┘                 └────────┬─────────┘
                │                                   │
        ┌───────▼───────────────────────────────────▼───────────────────────┐
        │  SUPABASE (Postgres 17 + Auth + PostgREST)                       │
        │  17 tables · 13 enums · 7 functions · 1 trigger · 1 pg_cron job  │
        │  Row Level Security on every table                                │
        └───────────────────────────────────────────────────────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  │                                     │
        ┌─────────▼──────────┐              ┌───────────▼──────────┐
        │  PayHere (Sri Lanka)│              │  Resend (email)      │
        │  checkout · webhook │              │  confirmation · fail │
        │  · refund API       │              │                      │
        └─────────────────────┘              └──────────────────────┘
```

### 3.2 Technology stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router, RSC) | 16.2.9 | `src/proxy.ts` (Next 16 renamed middleware → proxy) |
| UI runtime | React | 19.2.4 | Server Components default; `"use client"` islands |
| Language | TypeScript | ^5, `strict` | Path alias `@/* → ./src/*` |
| Styling | Tailwind CSS | v4 | CSS-first: `@theme inline` in `src/app/globals.css`; no `tailwind.config.*` |
| Components | shadcn/ui `base-nova` on **Base UI** (`@base-ui/react` ^1.6.0) | — | 24 primitives in `src/components/ui/`; icons `lucide-react` |
| Database | Supabase Postgres | 17.6 | Project ref `emurxsoksddmoghodplv`; region `aws-1-ap-northeast-1` |
| Auth | Supabase Auth (email+password, PKCE) | — | `handle_new_user` trigger auto-provisions `profiles` |
| Validation | Zod | ^4 | Central schemas in `src/lib/validations.ts` |
| Forms | react-hook-form + `@hookform/resolvers` | ^7.80 / ^5.4 | Wizard step 4 + admin forms |
| Dates | date-fns + react-day-picker | ^4 / ^10 | Calendar picker |
| Payments | PayHere (MD5-signed) | — | Sandbox endpoint currently hard-coded |
| Email | Resend | ^6.18 | From `noreply@info.lepalmeahangama.com` |
| Toasts | sonner | ^2 | Global `<Toaster/>` |
| Command palette | cmdk | ^1.1 | ⌘K global search |
| Theming | next-themes | ^0.4 | `class` attribute, system default |
| Tests | Vitest + happy-dom + Testing Library | ^4.1.10 | Coverage thresholds configured at 80% |

### 3.3 Request lifecycle

1. **`src/proxy.ts`** — creates a request-scoped Supabase client bound to the request cookies; `getUser()` performs server-side session validation; refreshed cookies are written onto `NextResponse.next({ request })`.
   - Redirects `/dashboard*` → `/auth/login` when unauthenticated.
   - Redirects `/auth/login` → `/dashboard` when authenticated.
   - Matcher: `["/((?!_next/static|_next/image|favicon.ico).*)"]` (API routes are matched too).
   - **No role checks here** — role enforcement lives in layouts and `src/lib/auth.ts`.
2. **Layout gates** — `src/app/dashboard/layout.tsx` (auth) → `src/app/dashboard/(main)/layout.tsx` (auth + profile; `housekeeping` role redirected to `/dashboard/housekeeping`) → `src/app/dashboard/(main)/admin/layout.tsx` (admin only).
3. **Page/handler** — Server Component reads data, Client Component renders the interactive island.

### 3.4 The three Supabase clients

| Client | Factory | Construction | RLS | Used for |
|---|---|---|---|---|
| **Browser** | `src/lib/supabase/client.ts` → `createClient()` | `createBrowserClient` with anon key | Applies (anon/authenticated) | Client Components: availability RPC calls, dashboard panels that still write directly |
| **Server (request-scoped)** | `src/lib/supabase/server.ts` → `async createClient()` | `createServerClient` + `await cookies()`; `setAll` wrapped in try/catch because cookie writes are only legal in Actions/Handlers | **Applies as the logged-in staff user** | Server Components, Server Actions, Route Handlers — the primary staff data path |
| **Admin (service role)** | `src/lib/supabase/admin.ts` → `createAdminClient()` | plain `supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses RLS** | Public booking/pricing writes, PayHere webhook, emails, public portal + confirmation pages |

> **Invariant:** the admin client is only used where no authenticated staff session exists (public booking, webhooks, public read-by-reference) or where the action performs its own explicit authorisation and pricing. Any new admin-client usage must state its authorisation model.

### 3.5 Choosing a data-access mechanism

| Mechanism | When | Examples |
|---|---|---|
| **Server Action** (`src/lib/actions/**`) | Mutations invoked from client components; needs `revalidatePath` + progressive enhancement | `checkOut`, `recordPayment`, `postCharge`, `reportMaintenanceIssue` |
| **Route Handler** (`src/app/api/**`) | External webhooks (no client session), OAuth callback (cookie write + redirect), JSON APIs | `/api/payhere/notify`, `/auth/callback`, `/api/search` |
| **RPC** (Postgres function) | Availability/overlap checks and search — transactional logic that must stay atomic and be exposed as `SECURITY DEFINER` with restricted EXECUTE grants | `get_available_rooms`, `get_available_equipment_units`, `global_search`, `lookup_booking_by_ref` |
| **Direct browser query** | Legacy path in dashboard panels that still write from the client (BookingForm, EquipmentPanel, TransferPanel, AdminPanel) | See [§16](#16-known-gaps--backlog) G-01 |

---

## 4. Domain Model

### 4.1 Entity relationships

```
room_categories ──< rooms ──< bookings >── guests
                          │        │  └── group_booking_id (shared across a multi-room stay)
                          │        ├──< booking_charges
                          │        ├──< invoices (1:1, UNIQUE)
                          │        ├──< payments
                          │        ├──< equipment_bookings >── equipment_units ──> equipment_categories
                          │        └──< airport_transfers >── airport_transfer_routes
                          │
maintenance_requests >── rooms
profiles (1:1 auth.users) ──< bookings.created_by_staff_id
                       ├──< booking_charges.added_by_staff_id
                       ├──< maintenance_requests.reported_by_staff_id / resolved_by_staff_id
                       └──< shift_notes.created_by_staff_id
settings (single row, id = true)
contact_messages (standalone)
```

### 4.2 Table catalogue

> All 17 tables have **RLS enabled**. Table grants are `ALL` to `anon`, `authenticated`, `service_role` — **RLS is the only gate**.

#### Stays

**`bookings`** — one row = one room per stay. A multi-room stay shares a `group_booking_id`.
- `id uuid` PK · `guest_id uuid` FK→guests (RESTRICT) · `room_id uuid` FK→rooms (RESTRICT, NOT NULL)
- `check_in date` · `check_out date` · `status booking_status` (default `pending_payment`) · `source booking_source` (default `website`)
- `group_booking_id uuid` (default `gen_random_uuid()`) — the group key and the guest's reference
- `room_total_usd numeric(10,2)` · `board_plan text` (default `room_only`) · `board_total_usd numeric` (default 0) · `num_guests int`
- `ota_name text` · `notes text` · `created_by_staff_id uuid` FK→profiles · `created_at timestamptz`
- **Constraints:** `chk_booking_dates` (`check_out > check_in`) · `chk_guest_required_unless_maintenance` · `bookings_board_plan_check` · `bookings_num_guests_check` (>0) · `bookings_room_total_usd_check` · `bookings_board_total_usd_check`
- **Exclusion constraints (both gist on `room_id + daterange`):** `bookings_no_overlap` (status NOT IN cancelled,no_show) · `no_double_booking` (status IN pending_payment,confirmed,checked_in)
- **Indexes:** `idx_bookings_room`, `idx_bookings_guest`, `idx_bookings_dates`, both gist indexes

**`equipment_bookings`** — one rental of one unit over a date range.
- `id uuid` PK · `unit_id uuid` FK · `guest_id uuid` FK · `booking_id uuid` FK (**nullable**, SET NULL) · `start_date date` · `end_date date` · `status equipment_booking_status` (default `active`) · `price_usd numeric(10,2)`
- **Constraints:** `chk_equipment_dates` (`end_date > start_date`) · `equipment_bookings_price_usd_check` · **EXCLUDE** `equipment_bookings_no_overlap` (gist, `unit_id + daterange`, where status = `active`)

**`airport_transfers`** — one airport pickup or drop.
- `id uuid` PK · `route_id uuid` FK · `guest_id uuid` FK · `booking_id uuid` FK (nullable, SET NULL) · `direction transfer_direction` · `transfer_datetime timestamptz` · `status transfer_status` (default `scheduled`) · `price_usd numeric(10,2)` · `flight_number text` · `notes text`
- **Index:** `idx_airport_transfers_booking`

#### Billing

**`booking_charges`** — an extra line item on a booking.
- `id uuid` PK · `booking_id uuid` FK (**CASCADE**) · `description text` · `category charge_category` (default `misc`) · `quantity numeric(10,2)` (default 1) · `unit_price_usd numeric(10,2)` · `line_total_usd numeric(10,2)` · `added_by_staff_id uuid` FK · `created_at timestamptz`
- **Checks:** `quantity > 0`, `unit_price_usd >= 0`, `line_total_usd >= 0`

**`invoices`** — exactly one invoice per booking.
- `id uuid` PK · `booking_id uuid` FK (**UNIQUE**) · `room_charges_total_usd numeric(10,2)` (default 0) · `addon_charges_total_usd numeric(10,2)` (default 0) · `surcharge_pct_applied numeric(4,2)` (default 0) · `grand_total_usd numeric(10,2)` (default 0) · `status invoice_status` (default `draft`) · `issued_at timestamptz`

**`payments`** — a payment attempt or settlement. A booking may hold many (deposit + balance + card).
- `id uuid` PK · `booking_id uuid` FK · `invoice_id uuid` FK (nullable, SET NULL) · `amount_usd numeric(10,2)` (>0) · `method payment_method` · `status payment_status` (default `pending`) · `paid_at timestamptz` · `payhere_payment_id text` · `polar_order_id text`
- The former `payments_booking_id_key` UNIQUE was **dropped** so a booking can hold multiple payments. `idx_payments_polar_unique` remains UNIQUE on `booking_id WHERE method = card_polar`.

#### Inventory

**`room_categories`** — `id uuid` PK · `name text` **UNIQUE** · `base_price_usd numeric(10,2)` · `max_occupancy int` (>0) · `description text` · `image_url text`

**`rooms`** — `id uuid` PK · `category_id uuid` FK · `room_number text` **UNIQUE** · `operational_status room_operational_status` (default `active`) · `housekeeping_status room_housekeeping_status` (default `dirty`)

**`equipment_categories`** — `id uuid` PK · `name text` **UNIQUE** · `price_per_day_usd numeric(10,2)` · `tiered_pricing jsonb` (nullable; object with a `tiers` array)

**`equipment_units`** — `id uuid` PK · `category_id uuid` FK · `unit_label text` **UNIQUE** · `condition_status equipment_condition_status` (default `good`)

**`airport_transfer_routes`** — `id uuid` PK · `airport_name text` · `fixed_price_usd numeric(10,2)` · `estimated_duration_mins int` · `active boolean` (default true)

#### People, staff, ops

**`guests`** — `id uuid` PK · `full_name text` · `email text` · `phone text` · `nationality text` · `nic_or_passport text` · `created_at timestamptz`. *No unique constraint on email — duplicate guest rows are expected and are de-duplicated in the UI.*

**`profiles`** — 1:1 with `auth.users`.
- `id uuid` PK **FK→auth.users(id) ON DELETE CASCADE** · `full_name text` · `role staff_role` (default `receptionist`) · `active boolean` (default true) · `created_at timestamptz`

**`maintenance_requests`** — `id uuid` PK · `room_id uuid` FK · `description text` · `priority text` (low|normal|high|urgent) · `status text` (open|in_progress|resolved|closed) · `reported_by_staff_id uuid` FK · `resolved_at timestamptz` · `resolved_by_staff_id uuid` FK · `notes text` · `created_at timestamptz`

**`settings`** — single row enforced by PK on `id boolean` (default true).
- `check_in_time time` · `check_out_time time` · `surcharge_pct numeric(4,2)` (default 5) · `min_deposit_pct numeric(4,2)` (default 50)

**`shift_notes`** — `id uuid` PK · `content text` · `created_by_staff_id uuid` FK · `created_at timestamptz`

**`contact_messages`** — `id uuid` PK · `name text` · `email text` · `message text` · `created_at timestamptz` · `read boolean` (default false)

### 4.3 Enumerations

| Enum | Labels | Used by |
|---|---|---|
| `booking_status` | pending_payment, confirmed, checked_in, checked_out, cancelled, no_show, maintenance_block | `bookings.status` |
| `booking_source` | website, walk_in, ota_manual | `bookings.source` |
| `payment_method` | card_payhere, cash, bank_transfer, card_polar | `payments.method` |
| `payment_status` | pending, completed, failed, refunded | `payments.status` |
| `invoice_status` | draft, issued, paid | `invoices.status` |
| `charge_category` | room, late_checkout_fee, meal, transport, misc | `booking_charges.category` |
| `equipment_booking_status` | active, returned, cancelled, pending | `equipment_bookings.status` |
| `equipment_condition_status` | good, needs_maintenance, retired | `equipment_units.condition_status` |
| `room_housekeeping_status` | dirty, cleaning, ready | `rooms.housekeeping_status` |
| `room_operational_status` | active, retired | `rooms.operational_status` |
| `transfer_direction` | arrival, departure | `airport_transfers.direction` |
| `transfer_status` | scheduled, completed, cancelled | `airport_transfers.status` |
| `staff_role` | admin, receptionist, housekeeping | `profiles.role` |

### 4.4 Database functions

| Function | Args | Returns | Security | Purpose |
|---|---|---|---|---|
| `get_available_rooms` | `(p_category_id uuid, p_check_in date, p_check_out date)` | `TABLE(id, room_number, housekeeping_status)` | `SECURITY DEFINER`, EXECUTE to PUBLIC | Active rooms in a category with no overlapping booking in `confirmed, checked_in, pending_payment, maintenance_block`. Ranges compared as `daterange('[)')`. |
| `get_available_equipment_units` | `(p_category_id uuid, p_start_date date, p_end_date date)` | `TABLE(id, category_id, unit_label, condition_status)` | `SECURITY DEFINER`, EXECUTE to PUBLIC | Units with `condition_status='good'` and no overlapping `active` rental. |
| `get_calendar_bookings` | `(p_start date, p_end date)` | `TABLE(id, check_in, check_out, status, room_total_usd, room_id, guest_id, room_number, room_category_name, guest_full_name)` | `SECURITY INVOKER` | Calendar window query; RLS applies. |
| `global_search` | `(p_query text)` | `TABLE(result_type, id, guest_id, full_name, email, phone, check_in, check_out, status, room_number, group_booking_id)` | `SECURITY INVOKER`, EXECUTE to `authenticated` | Staff search: up to 6 guests + 8 bookings. |
| `get_staff_role` | — | `staff_role` | `STABLE SECURITY DEFINER`, EXECUTE to `authenticated` | The caller's role from `profiles` where `id = auth.uid() AND active = true`; NULL otherwise. The central RLS helper. |
| `lookup_booking_by_ref` | `(p_ref text, p_email text)` | booking + guest summary (deliberately omits `nic_or_passport`) | `SECURITY INVOKER`, EXECUTE to **`service_role` only** | Public "find my booking" — matches ref prefix against `group_booking_id`/`id` **and** requires an exact lowercase email match. |
| `handle_new_user` | — | trigger | `SECURITY DEFINER` | `AFTER INSERT ON auth.users` → creates `profiles` with role hard-coded to `housekeeping`. Role is never read from client metadata. |

### 4.5 Trigger & scheduled job

| Kind | Name | Behaviour |
|---|---|---|
| Trigger | `on_auth_user_created` | `AFTER INSERT ON auth.users` → `handle_new_user()` provisions a `profiles` row (role `housekeeping`, `active = true`). |
| pg_cron | `expire_pending_bookings` (jobid 2) | Every minute. Expires `pending_payment` bookings older than 15 minutes → `cancelled`; then releases `equipment_bookings` (`pending` → `cancelled`) and `airport_transfers` (`scheduled` → `cancelled`) for both the newly expired bookings **and** any already-cancelled booking. The second sweep clears historical orphans. |

> **Operational note:** this cron lives in the live Supabase project. It is **not** reproducible from `supabase/migrations/` — see [§16](#16-known-gaps--backlog) G-02.

### 4.6 Core invariants

| # | Invariant | Enforced by |
|---|---|---|
| I-1 | A room cannot be double-booked for overlapping dates | `bookings_no_overlap` + `no_double_booking` EXCLUDE constraints |
| I-2 | A unit cannot be rented twice for overlapping dates | `equipment_bookings_no_overlap` EXCLUDE constraint |
| I-3 | `check_out > check_in` | `chk_booking_dates` |
| I-4 | A booking may exist without a guest only when `status = maintenance_block` | `chk_guest_required_unless_maintenance` |
| I-5 | One invoice per booking | `invoices_booking_id_key` UNIQUE |
| I-6 | `settings` is a single row | PK on `id boolean` + `settings_single_row` CHECK |
| I-7 | The amount PayHere charges equals `computeBookingTotal(group_booking_id)` | Webhook recomputes and returns `400 Amount mismatch` otherwise |
| I-8 | A cancelled booking never leaves a `pending` equipment hold or `scheduled` transfer | Cron + `cancelBooking` + PayHere cancel route |
| I-9 | `num_guests > 0` and ≤ the summed `max_occupancy` of the booked rooms | `bookings_num_guests_check` + wizard client guard + server split |

---

## 5. Identity, Roles & Access Control

### 5.1 Roles

| Role | Scope |
|---|---|
| `admin` | Everything a receptionist can do, plus: staff accounts, room categories, pricing, hotel settings, rooms, equipment units, maintenance workflow, contact inbox. Cannot be self-assigned. |
| `receptionist` | Bookings, guests, calendar, operations, equipment, transfers, housekeeping board, all billing. No admin panel. |
| `housekeeping` | Housekeeping board only (auto-redirected from `/dashboard`), plus ⌘K search and maintenance reporting. No guest PII, no bookings, no billing. |

### 5.2 Staff lifecycle

1. Staff are created through **Supabase Auth** (email + password, or admin invite).
2. The `on_auth_user_created` trigger immediately provisions `public.profiles` with `role = 'housekeeping'`, `active = true`.
3. An admin escalates the role and can deactivate (`profiles.active = false`).
4. `get_staff_role()` filters on `active = true`, so deactivation **immediately revokes RLS access** — no logout required.
5. `requireStaff` / `requireAnyStaff` / `requireAdmin` additionally reject inactive profiles with `"Account deactivated"`.

### 5.3 Authorisation helpers (`src/lib/auth.ts`)

```ts
requireStaff()      // admin | receptionist only  →  { user: { id, role } } | { error }
requireAnyStaff()   // any active profile        →  { user: { id, role } } | { error }
requireAdmin()      // admin only                →  { user: { id, role } } | { error }
```

All three use the **request-scoped server client**, so RLS applies to the caller's own JWT. `requireAdmin()` delegates to `requireStaff()` first, so a housekeeping user sees `"Insufficient permissions"` rather than `"Admin access required"`.

### 5.4 RLS matrix

Legend: ✅ permitted · ❌ denied · 🔒 admin only · ⬜ no policy (impossible except via `service_role`).

| Table | anon | staff (admin/reception) | housekeeping | Notes |
|---|---|---|---|---|
| `bookings` | ❌ | ✅ select/insert/update | ❌ | ⬜ no DELETE |
| `booking_charges` | ❌ | ✅ select/insert | ❌ | 🔒 update (admin only) · ⬜ no DELETE |
| `invoices` | ❌ | ✅ select/insert/update | ❌ | ⬜ no DELETE |
| `payments` | ❌ | ✅ select/insert/update | ❌ | ⬜ no DELETE — refunds are status flips, not deletes |
| `equipment_bookings` | ❌ | ✅ select/insert/update | ❌ | ⬜ no DELETE |
| `airport_transfers` | ❌ | ✅ select/insert/update | ❌ | ⬜ no DELETE |
| `airport_transfer_routes` | ✅ select | ✅ select | ✅ select | 🔒 insert/update · ⬜ no DELETE |
| `room_categories` | ✅ select | ✅ select | ✅ select | 🔒 insert/update/delete |
| `rooms` | ✅ select | ✅ select | ✅ select | 🔒 insert · updates: admin + housekeeping + any staff (permissive OR) · ⬜ no DELETE |
| `equipment_categories` | ✅ select | ✅ select | ✅ select | 🔒 insert/update/delete |
| `equipment_units` | ❌ | ✅ select | ✅ select | 🔒 insert/update/delete |
| `guests` | ❌ | ✅ select/insert/update | ❌ | ⬜ no DELETE |
| `profiles` | ❌ | own row only; 🔒 all rows for admin | own row | 🔒 insert/update · ⬜ no DELETE |
| `maintenance_requests` | ❌ | ✅ select/insert | ✅ select/insert | 🔒 update (admin) · ⬜ no DELETE |
| `settings` | ✅ select | ✅ select | ✅ select | 🔒 update · ⬜ no INSERT/DELETE |
| `shift_notes` | ❌ | ✅ select/insert | ✅ select/insert | DELETE only by author (`auth.uid() = created_by_staff_id`) |
| `contact_messages` | ✅ insert | ✅ select/update/delete | ✅ select/update/delete | Full command coverage |

**Gaps worth recording:** DELETE is impossible on 10 tables; non-admins cannot UPDATE `maintenance_requests`; `shift_notes` are write-once; `settings` cannot be INSERTed by anyone but `service_role`.

### 5.5 Server-action guard distribution

| Guard | Count | Actions |
|---|---|---|
| `requireStaff` | 30 | All guest/booking/billing/room/equipment/transfer/maintenance reads+writes except the two below |
| `requireAnyStaff` | 2 | `updateRoomHousekeepingStatus`, `reportMaintenanceIssue` (+ `/api/search`) |
| `requireAdmin` | 6 | `deactivateStaff`, `updatePricing`, `createRoomCategory`, `updateRoomCategory`, `toggleRoomMaintenance`, `updateSettings` |
| **No guard** | 10 | Public by design: `createPayHereBooking`, `lookupBookingByRef`, `lookupBookingByGroupId`, `getRoomCategories`, `getAvailableRooms`, `getEquipmentCategories`, `getAvailableUnits`, `getTransferRoutes`, `getSettings` · **plus `createBooking` — an unguarded, service-role write path that is dead code (see G-03)** |

---

## 6. Public Website Specification

### 6.1 Route map

| Route | Rendering | Purpose | Key data |
|---|---|---|---|
| `/` | Static RSC | Home — hero + booking bar, welcome, intro, rooms, dining, experiences, events | Static content + `HeroSection` client island |
| `/about` | Static | Hotel story, 4 photos, guest-love stats, map iframe | `HOTEL_MAP_EMBED_URL` |
| `/dine` | Static | Meal hours, photography | CTA → `/contact?subject=Table%20Reservation` |
| `/experiences` | Static | 5 experiences (Surfing, Cycling & Nature, Wildlife & Safari, Cultural Tours, Skate Paths) | Each CTA → `/contact?experience=<title>` |
| `/contact` | Client (Suspense-wrapped) | Enquiry form; reads `?experience=` / `?subject=` for prefill | `contact_messages` insert via anon client |
| `/rooms` | RSC + DB | Room categories list | `room_categories` |
| `/rooms/[slug]` | RSC, `force-dynamic` | Category detail: price, occupancy, features, stay times | `room_categories` + `settings` |
| `/booking` | RSC, `noindex` | Booking wizard host; kill-switch aware | categories, equipment categories, route price, surcharge % |
| `/booking/lookup` | Static | Reference + email lookup form | — |
| `/booking/[ref]` | RSC (admin client) | Guest portal for a booking group | bookings + guests + rooms + equipment + transfers + settings |
| `/booking/confirmation/[id]` | RSC, `force-dynamic`, `noindex` | Post-payment confirmation, status-refreshing | booking group + `computeBookingTotal` |
| `/privacy-policy`, `/refund-policy`, `/terms-and-conditions` | Static | Legal | — |
| `/robots.ts`, `/sitemap.ts` | Metadata routes | robots.txt; sitemap (static routes + one per category) | `room_categories` |

### 6.2 Public components (25)

| Component | Role |
|---|---|
| `PublicNavbar` / `PublicFooter` | Chrome; both return `null` on `/dashboard`; mobile drawer with body scroll-lock |
| `HeroSection` | Full-screen hero + booking bar (check-in, check-out, guests 1–6) → pushes `/booking?...&guests=` |
| `WelcomeSection`, `HotelIntroSection`, `RoomShowcase`, `RestaurantSection`, `ExperiencesSection`, `EventsSection`, `AmenitiesSection`*, `ContactSection`*, `PhotoGallery`*, `NewsletterSection`* | Home page sections. * = currently unmounted (no page imports them) |
| `AnimatedSection` | Scroll-reveal wrapper (IntersectionObserver, threshold 0.1) |
| `RoomCategoryCard`, `RoomDetail` | `/rooms` listing and detail body |
| `BookingWizard`, `DateStep`, `BoardStep`, `ExtrasStep`, `GuestDetailsStep`, `PaymentReview` | The 5-step wizard |

### 6.3 SEO & metadata

| Concern | Implementation |
|---|---|
| Root metadata | Title template `%s \| Le Palme Ahangama`; `metadataBase` from `NEXT_PUBLIC_APP_URL`; OpenGraph (`website`, `en_US`, 1200×630 image); Twitter `summary_large_image`; `robots` index+follow with `max-image-preview: large` |
| Fonts | `next/font/google`: Inter → `--font-inter` (sans), Playfair Display → `--font-playfair` (serif), Geist Mono → `--font-geist-mono` (mono) |
| JSON-LD | `hotelSchema` (`Hotel`) site-wide in `src/app/layout.tsx` — address, geo, priceRange, starRating, 25 amenities, check-in/out times, currencies · `roomSchema` (`HotelRoom` + `Offer`) on `/rooms/[slug]` · `bookingOrderSchema` (`Order`) on the confirmation page |
| `noindex` | `/booking` (index:false, follow:true) and `/booking/confirmation/[id]` (index:false, follow:true) |
| Sitemap | `/`, `/rooms`, `/refund-policy`, `/privacy-policy`, `/terms-and-conditions` + `/rooms/{slugify(name)}`. *Deliberately excludes* `/about`, `/dine`, `/experiences`, `/contact`, `/booking*` |
| robots.txt | allow `/`, sitemap URL |

---

## 7. Booking & Payment Specification

### 7.1 Wizard steps

| # | Step | Component | Validates with | Carries |
|---|---|---|---|---|
| 1 | Dates & Rooms | `DateStep` | `dateStepSchema` + availability pass | `checkIn`, `checkOut`, `roomSelections[]` |
| 2 | Board Plan | `BoardStep` | — | `boardPlan` |
| 3 | Extras | `ExtrasStep` | `extrasSchema` + per-item date rules | surfboard/motorbike/car/transfer |
| 4 | Guest | `GuestDetailsStep` | `guestSchema` (react-hook-form + zodResolver) | guest details + `numGuests` |
| 5 | Review & Pay | `PaymentReview` | server re-validates | submits `createPayHereBooking` |

**Wizard state (`WizardData`)** is persisted to `sessionStorage` under `booking_wizard_data` as `{ step, data }` and restored on mount; cleared on successful payment.

**Room selection model** — `{ categoryId, categoryName, basePrice, maxOccupancy, quantity, availableCount, imageUrl }`. A category may be added multiple times to book several rooms of the same class.

**Availability check** — `DateStep` calls `getAvailableRooms(categoryId, checkIn, checkOut)` in a `useEffect` whenever dates or selections change. The effect **keeps the last known count while a refetch is in flight** (never falls back to "unlimited"), and the qty stepper stays disabled until a count is known. `PaymentReview` re-checks immediately before booking.

**Guest count** — `numGuests` is collected in step 4, capped at the summed `maxOccupancy` of the selected rooms, prefilled from the hero `?guests=` URL parameter. The server splits the party across rooms (even split, remainder to the first rooms, each capped by `maxOccupancy`, leftovers fill spare capacity) and stores the per-room split in `bookings.num_guests`.

### 7.2 Authoritative pricing

```
nights          = checkOut − checkIn
roomTotal       = Σ (category.base_price_usd × quantity × nights)
boardTotal      = BOARD_PRICE_PER_NIGHT(board_plan) × nights × totalRooms
equipmentTotal  = Σ equipment_bookings.price_usd        (server-computed per unit)
transferTotal   = Σ airport_transfers.price_usd          (route.fixed_price_usd)
subtotal        = roomTotal + boardTotal + equipmentTotal + transferTotal
grandTotal      = round(subtotal × (1 + settings.surcharge_pct / 100), 2)
```

- **Client** (`BookingWizard.tsx`) computes a display estimate with the same formula for the live price bar.
- **Server** (`src/lib/booking-pricing.ts`) computes the truth:
  - `equipmentItemPrice(unitId, startDate, endDate, fallbackNights)` — resolves the unit's category price and applies `tiered_pricing` tiers when present.
  - `transferPrice(routeId)` — `airport_transfer_routes.fixed_price_usd`.
  - `computeBookingTotal(groupBookingId)` — the grand total for a whole booking group.
- The client displays `serverGrandTotal` whenever it differs from the local estimate by more than $0.01. **What the guest sees is what PayHere charges.**

**Board plans** (per room, per night): `room_only` $0 · `half_board` $10 · `full_board` $20.

**Surfboard tier pricing** (`SURFBOARD_TIERS`, per day): 1–6 days $25 · 7–13 days $14 · 14–20 days $12 · 21+ days $11. `tiered_pricing` on the category overrides the fallback.

### 7.3 `createPayHereBooking` contract

```ts
createPayHereBooking({
  guest: { full_name, email?, phone?, nationality?, nic_or_passport?, numGuests? },
  roomSelections: [{ room_id, check_in, check_out, num_guests? }],
  numGuests?,
  board_plan?: "room_only" | "half_board" | "full_board",
  equipment?: [{ unit_id, start_date, end_date }],
  transfer?: { route_id, direction: "arrival" | "departure", flight_number?, transferTime? },
}): Promise<{ data: { bookingIds: string[], groupBookingId: string, orderId: string, grandTotal: number } } | { error: string }>
```

**Validation order:**
1. Kill-switch: `NEXT_PUBLIC_BOOKING_ENABLED === "false"` → `"Online booking is temporarily unavailable. Please contact us directly."`
2. `board_plan` validated against `BOARD_PLANS`.
3. Party size resolved: `numGuests` → `guest.numGuests` → `Σ roomSelections[].num_guests`.
4. Guest validated with `guestSchema` (server-side re-validation; all errors joined with `; `).
5. **Transfer datetime computed server-side** — `hotelLocalToUtcIso(`${stayDate}T${transferTime}`)` where `stayDate` is `check_out` for `departure` and `check_in` for `arrival`. Missing time → `"Please choose a transfer time."` The client never supplies the timestamp.
6. Per-room total recomputed from `room_categories.base_price_usd × nights`.
7. Per-room availability check → `"Room is no longer available for the selected dates…"`.
8. Equipment re-verified per `category_id|start|end` group via `get_available_equipment_units` → `"Only N of M <item> is available for the selected dates — please reduce the quantity."` **The order is never silently shrunk.**
9. Inserts: 1 `guests` row → N `bookings` rows sharing one `group_booking_id` (`pending_payment`, `source = website`, `room_total_usd`, `board_plan`, `board_total_usd`) → `equipment_bookings` on `bookingIds[0]` (`status = pending`) → one `airport_transfers` on `bookingIds[0]` (`status = scheduled`).
   - A `23P01` exclusion violation → `"Room was just booked by someone else…"`
10. `computeBookingTotal(groupBookingId)` → `grandTotal`; `orderId = "BOOK-<groupBookingId>"`.
11. On failure the inserted guest row is deleted (no orphan guest).
12. `revalidatePath("/dashboard/calendar")`.

### 7.4 PayHere checkout

**Hash** — `POST /api/payhere/hash` with `{ order_id, currency: "USD" }`:
- Validates `order_id` matches `BOOK-<uuid>`.
- Requires the group to still hold `pending_payment` bookings.
- Signs `computeBookingTotal(groupBookingId).total.toFixed(2)`.
- Returns `{ hash, merchant_id, amount }`.

**Signature** — `MD5_UPPER(merchantId + orderId + amount.toFixed(2) + currency + MD5_UPPER(merchantSecret))`. The webhook variant inserts `statusCode` into the chain.

**Form** — a hidden `<form method="POST">` built in `PaymentReview.handlePayhere()` and auto-submitted.

| Field | Value |
|---|---|
| `merchant_id` | `NEXT_PUBLIC_PAYHERE_MERCHANT_ID` |
| `order_id` | `BOOK-<groupBookingId>` |
| `items` | `Le Palme Ahangama — Room Booking` |
| `currency` | `USD` |
| `amount` | server total, `toFixed(2)` |
| `hash` | computed above |
| `first_name` / `last_name` | first token of the guest name / remainder (default `Guest`) |
| `email`, `phone` | guest details |
| `address` / `city` / `country` | `Le Palme Ahangama` / `Ahangama` / `Sri Lanka` |
| `custom_1` | `groupBookingId` |
| `custom_2` | `bookingIds[0]` |
| `return_url` | `${origin}/api/payhere/return?booking_id=<bookingIds[0]>` |
| `cancel_url` | `${origin}/api/payhere/cancel?group=<groupBookingId>` |
| `notify_url` | `${origin}/api/payhere/notify` |

> The checkout `action` is currently hard-coded to `https://sandbox.payhere.lk/pay/checkout`. `NEXT_PUBLIC_PAYHERE_MODE` exists in the environment but is **never read** — see G-04.

### 7.5 Webhook — `POST /api/payhere/notify`

**Verification order (strict):**

1. Read `merchant_id`, `order_id`, `payment_id`, `payhere_amount`, `payhere_currency`, `status_code`, `md5sig`, `custom_1`, `custom_2`.
2. Verify `md5sig` → invalid → `400 {"status":"error","message":"Invalid signature"}`.
3. **`status_code === "1"` (failure)** — resolve the booking (`custom_2`, else `custom_1` → first booking of the group). If no payment row for `payment_id` (and no existing failed row) → insert `payments {booking_id, amount_usd, method: card_payhere, status: failed, payhere_payment_id}` and send `sendPaymentFailedEmail`. The booking **stays** `pending_payment`. Returns `{"status":"ok"}`.
4. **`status_code !== "2"` (pending / other)** → `{"status":"ok"}`, no DB change.
5. `payhere_currency !== "USD"` → `400 {"message":"Currency mismatch"}`.
6. Resolve `groupBookingId` from `custom_1`, else from `custom_2`'s booking → `404 "Booking not found"` / `400 "Missing order reference"`.
7. **Reconcile** — recompute `computeBookingTotal(groupBookingId)` and compare with `payhere_amount`. Mismatch → `400 {"message":"Amount mismatch"}` and **the booking is not confirmed**.
8. **Success** — every `pending_payment` booking in the group → `confirmed`.
9. Insert `payments {booking_id: bookings[0].id, amount_usd, method: card_payhere, status: completed, paid_at, payhere_payment_id}` — idempotent on `payhere_payment_id`.
10. `equipment_bookings` for that booking with `status = pending` → `active`.
11. `sendBookingConfirmation(bookings[0].id)` — sent only when the payment row was newly inserted.
12. Return `{"status":"ok"}`. Uncaught errors → `500 {"status":"error"}`.

### 7.6 Cancel & return

| Route | Behaviour |
|---|---|
| `GET /api/payhere/cancel?group=<uuid>` | Cancels only `pending_payment` bookings in the group (confirmed bookings untouched); releases `pending` equipment holds and `scheduled` transfers; 302 → `/booking?payment=cancelled` (the wizard shows a "payment cancelled" banner). |
| `GET /api/payhere/return?booking_id=<uuid>` | 302 → `/booking/confirmation/<booking_id>` |

### 7.7 Confirmation page & status refresh

- Heading and copy are derived from the **live** status: `pending_payment` → *"Complete your payment to confirm"*; `cancelled` → *"Booking cancelled"*; otherwise the confirmed wording.
- While `pending_payment`, a client `<StatusRefresher/>` calls `router.refresh()` every 5 s, capped at ~24 refreshes (~2 min), stopping as soon as the status changes.
- Grand Total is computed across the **whole group** (all rooms + board + extras + surcharge), matching the charged amount.
- All datetimes are rendered with `formatHotelDateTime` (hotel-local); transfer times included.
- The page shows the configured `check_in_time` / `check_out_time` and links to `/booking/lookup` ("Look up your booking later").

### 7.8 Guest portal

- `/booking/lookup` → reference (≤50 chars) + email → `lookupBookingByRef` → RPC `lookup_booking_by_ref`.
- `/booking/[ref]?email=…` → no email ⇒ redirect to lookup; email mismatch ⇒ `notFound()`. Requires the **email** as well as the reference — possession of the reference alone is not sufficient.
- Read-only: rooms, guests, board plan, extras, transfers, totals, notes. **No guest-facing cancel, modify, or re-pay action exists.**

### 7.9 Email notifications

| Function | Trigger | Contents |
|---|---|---|
| `sendBookingConfirmation(bookingId)` | notify webhook, success path, only when a payment row was newly inserted | Reference (first 8 chars of `group_booking_id`, uppercased), rooms, dates, board plan, equipment, transfers, **Total** from `computeBookingTotal`, CTA, hotel footer |
| `sendPaymentFailedEmail(bookingId)` | notify webhook, `status_code === "1"` | "Payment unsuccessful", reference, "Your booking is still held for you but is not yet confirmed", CTA to `/booking/lookup`, contact details |

Both send from `Le Palme Ahangama <noreply@info.lepalmeahangama.com>`, catch their own errors and never throw — a webhook must always answer.

---

## 8. Staff Dashboard Specification

### 8.1 Shell & navigation

```
src/app/dashboard/layout.tsx            → auth gate only
src/app/dashboard/(main)/layout.tsx      → auth + profile; housekeeping ⇒ /dashboard/housekeeping
src/app/dashboard/housekeeping/layout.tsx→ auth + profile; no role redirect
src/app/dashboard/(main)/admin/layout.tsx→ admin only
```

`DashboardShell` renders a role-filtered `AppSidebar` + `DashboardHeader` + content. The header carries a live clock, the ⌘K `GlobalSearch` palette, the theme toggle, and the staff name + role badge.

| Nav item | Route | Roles |
|---|---|---|
| Overview | `/dashboard` | admin, receptionist |
| Calendar | `/dashboard/calendar` | admin, receptionist |
| Bookings | `/dashboard/bookings` | admin, receptionist |
| Guests | `/dashboard/guests` | admin, receptionist |
| Operations | `/dashboard/operations` | admin, receptionist |
| Housekeeping | `/dashboard/housekeeping` | all |
| Equipment | `/dashboard/equipment` | admin, receptionist |
| Transfers | `/dashboard/transfers` | admin, receptionist |
| Admin | `/dashboard/admin` | admin |

**⌘K / Ctrl+K** opens the command palette: 250 ms debounced fetch to `GET /api/search` (staff-only, RPC `global_search`), grouped into guests and bookings, with `AbortController` cleanup. A booking result label is `Room N · REF · status` where `REF` = the first 8 characters of `group_booking_id`.

### 8.2 Module specifications

| Module | Route | Panels | Data | Notable |
|---|---|---|---|---|
| **Overview** | `/dashboard` | `OverviewCards`, `RoomStatusBoard`, `RevenueCard`, `ShiftNotes`, `QuickCheckinSheet`, `QuickCheckoutSheet`, `MarkCleanSheet` | 13 parallel queries | Pending check-ins counts only `confirmed AND check_in <= today AND check_out >= today` (stale past stays excluded). Room cards link to the current booking, else the calendar. Revenue rows drill down to a payments dialog with CSV export. |
| **Bookings** | `/dashboard/bookings` | `BookingsFilters` + table + pager | `bookings` + `guests!inner`, `count: exact`, 50/page | Status chips (all 7 statuses), guest name/email search, CSV export, prev/next pagination preserving `?status` & `?q`. |
| **New booking** | `/dashboard/bookings/new` | `BookingForm` | `room_categories`, active `rooms` | Multi-room selection; `?source=walk_in|ota_manual`; `?guestId=` prefills the guest and reuses the existing row. Availability filtered client-side; the DB constraint is the real guard. Equipment blocks with tiered surfboard pricing. |
| **Booking detail** | `/dashboard/bookings/[id]` | `BookingDetail`, `ChargeForm`, `InvoiceView` | `bookings` + `guests` + `rooms` + `charges` + `invoices` + `payments` | Status-driven action bar, deposit progress card, charges table with inline edit/delete, invoice card with balance remaining, payments table with per-row refund, move-room dialog with price delta, printable invoice. |
| **Calendar** | `/dashboard/calendar` | `CalendarGrid` | `bookings` overlapping [today, today+30] | 30-day room grid grouped by category; booking bars are links with tooltips; legend chips toggle status visibility (cancelled / no_show included). |
| **Guests** | `/dashboard/guests` | `GuestTable` | `guests` | In-memory search over name/email/phone; CSV export. **No pagination.** |
| **Guest profile** | `/dashboard/guests/[id]` | `GuestProfile` | `guests`, `bookings`, `invoices`, `booking_charges`, `payments` | Total Spent uses the invoice grand total when present, else room + board + charges; cancelled and no_show excluded; Outstanding = Spent − Paid. "New Booking for {name}" → `?guestId=`. |
| **Operations** | `/dashboard/operations` | `OperationsTimeline` | arrivals, departures, transfers, equipment returns, `settings` times | `?date=YYYY-MM-DD` (regex-validated) to view any day. Timeline rows show the **time** (hotel-local for transfers, settings times for arrivals/departures, 12:00 for equipment returns) and link to bookings/transfers. |
| **Housekeeping** | `/dashboard/housekeeping` | `HousekeepingCard` | active `rooms`, open `maintenance_requests` | Dirty → Cleaning → Ready progression, open-issue badge per room, board-level open-issues list, Report Issue dialog. |
| **Equipment** | `/dashboard/equipment` | `EquipmentPanel` | `equipment_bookings` + units + categories + guests | Status filter (active/pending/returned/all), active-only counter, availability pre-check before creating a rental, Return with confirm dialog + toast **Undo**. Guests de-duplicated by email. |
| **Transfers** | `/dashboard/transfers` | `TransferPanel` | `airport_transfers` + routes + guests | Hotel-local date filter, optional **Link to stay** (auto-selected when the guest has exactly one stay), `datetime-local` converted with `hotelLocalToUtcIso`, Done / Cancel status buttons. |
| **Admin** | `/dashboard/admin` | `AdminPanel` (7 cards) | `profiles`, `room_categories`, `equipment_categories`, `settings`, `rooms`, `equipment_units`, `maintenance_requests`, `contact_messages` | Staff Accounts (activate/deactivate) · Room Categories (pricing editor + Add/Edit Category dialog) · Rooms (add with duplicate pre-check, retire/activate) · Hotel Settings (times, surcharge %, deposit %) · Maintenance Requests (filter chips + Start/Resolve/Reopen/Close) · Equipment Units (add, retire, restore) · Contact Messages (view dialog, reply mailto, mark read/unread, delete). |

### 8.3 Key workflows

**Create a booking (staff)** — `New Booking` or `Walk-in` → the form inserts a `guests` row (unless a guest is pre-selected) → per selected room: re-check conflicts → insert a `bookings` row (`status = confirmed`, `source`, `ota_name` for OTA, `created_by_staff_id`, `num_guests`, `board_plan`, `board_total_usd`, `room_total_usd`, shared `group_booking_id`) → insert `equipment_bookings` (`status = active`) priced with tier rules → toast + redirect to the booking detail.

**Check in** — Overview sheet or the booking-detail dialog → `status = checked_in` (+ optional NIC/passport written to the guest, ≤100 chars enforced server-side).

**Check out** — one shared `checkOut(bookingId)` action used by **both** the overview sheet and the booking detail:
1. Read `room_id`.
2. If no invoice exists → `generateInvoice(bookingId)`; a failure aborts the check-out.
3. `status = checked_out`.
4. `rooms.housekeeping_status = 'dirty'` — the room changed hands.
5. `revalidatePath('/dashboard/bookings/{id}')`.

**Charge / payment / invoice / refund / deposit**
| Action | Behaviour |
|---|---|
| Post charge | `postCharge` → `booking_charges` row with `line_total_usd = qty × unit_price` and `added_by_staff_id` |
| Edit / delete charge | `updateCharge` (recomputes the line total) / `deleteCharge` (confirm dialog warns if an invoice was already issued) |
| Record payment | `recordPayment` → completed `payments` row; the invoice becomes `paid` **only** when completed payments ≥ `grand_total_usd`, otherwise it stays `issued`. A paid invoice is never downgraded. The dialog shows "Balance remaining: $X of $Y". |
| Generate invoice | `generateInvoice(bookingId, force)` → room + board + active equipment + transfers + charges, surcharge from settings. If an invoice exists, a confirm dialog is shown and the action is retried with `force = true`. The invoice can be printed (`window.open` + `window.print()`). |
| Refund | The Refund button appears only for `card_payhere` + `completed` rows. `refundBookingPayment(payment.id)` → the PayHere refund API → `status = refunded`. **The invoice status is not recalculated** (see G-08). |
| Record deposit | `recordDeposit(bookingId, amount, method)` → a completed `payments` row with **no** `invoice_id`, so it never advances the invoice. Deposit due = `room_total_usd × min_deposit_pct/100`. |

**Move a guest to another room** — the dialog loads conflicting bookings and all active rooms, previews the recomputed total and the delta, then `moveGuestToRoom(bookingId, newRoomId)` → conflict check → `room_id` **and** `room_total_usd` updated → toast "Room moved — total updated to $X".

**Equipment rental** — the dialog checks availability via `getAvailableUnits` before inserting ("…already rented for these dates — pick another unit."); Return asks for confirmation and the toast offers an **Undo** that flips the row back to `active`.

**Airport transfer** — route → guest → optional stay link → direction/flight/date-time → insert with `hotelLocalToUtcIso(datetime)` and `price_usd = route.fixed_price_usd`.

**Maintenance** — Report (housekeeping) → `reportMaintenanceIssue` stamps `reported_by_staff_id`; Resolve (admin) → `updateMaintenanceStatus` stamps `resolved_at` + `resolved_by_staff_id` on `resolved`/`closed` and clears them on `open`.

### 8.4 State, refresh and feedback conventions

- Server actions call `revalidatePath` narrowly (`/dashboard/bookings/{id}`, `/dashboard/equipment`, `/dashboard/transfers`, `/dashboard/admin`, `/dashboard/housekeeping`, `/dashboard`, `/dashboard/calendar`); client components then call `router.refresh()`.
- `BookingDetail`, `EquipmentPanel`, `TransferPanel` and `AdminPanel` keep local copies patched after each mutation. `ShiftNotes` deliberately keeps **no** local copy — the list comes straight from the server component.
- Toasts (`sonner`) on every mutation; the equipment Return toast carries an **Undo** action.
- Confirmation dialogs exist for: logout, delete charge, replace invoice, mark equipment returned, delete contact message (two-step), move room, check in, record deposit, record payment. There is **no** confirmation for: cancel booking, no-show, check out, transfer status change, staff activate/deactivate, room or unit retire, add room/category, save settings/pricing, delete shift note.
- CSV export (client-side Blob): `bookings.csv` (current filtered page only), `guests.csv` (filtered rows), `revenue-<period>.csv`.
- Keyboard: ⌘K/Ctrl+K opens search; Enter (without Shift) posts a shift note.

---

## 9. Server Action Catalogue

### 9.1 `src/lib/actions/bookings.ts`

| Action | Guard | Inputs → Returns | Effect |
|---|---|---|---|
| `createBooking` | **none** ⚠ | rich payload → `{data:{booking}}` | Guest/booking/equipment/transfer insert, server-priced, **no availability check**. Dead code — see G-03. |
| `createPayHereBooking` | public | see [§7.3](#73-createpayherebooking-contract) | The public booking path. |
| `getBooking` | staff | `id` → booking + joins | Read. |
| `getBookingsByGroup` | staff | `groupBookingId` → bookings | Read. |
| `checkIn` | staff | `id`, `nicPassport` → null | `status = checked_in`; writes `guests.nic_or_passport`. |
| `checkOut` | staff | `bookingId` → null | Invoice if absent → `checked_out` → room `dirty`. |
| `cancelBooking` | staff | `id` → null | `cancelled`; releases `pending` equipment + `scheduled` transfers. |
| `updateBookingStatus` | staff | `id`, `status` → null | Generic status setter (e.g. `no_show`). |
| `getTodayArrivals` / `getTodayDepartures` | staff | — → rows | Today = **UTC** date (`toISOString().split('T')[0]`) — see G-06. |
| `lookupBookingByRef` | public | `refCode`, `email` → rows | RPC `lookup_booking_by_ref`. |
| `lookupBookingByGroupId` | public | `groupBookingId`, `email` → group | Email must match the first booking's guest. |
| `recordDeposit` | staff | `bookingId`, `amount`, `method` → null | Completed `payments` row, no invoice link. |
| `refundBookingPayment` | staff | `paymentId` → null | PayHere refund → `status = refunded`. |

### 9.2 `src/lib/actions/billing.ts`

| Action | Guard | Effect |
|---|---|---|
| `postCharge` | staff | Inserts `booking_charges` with `added_by_staff_id`. |
| `updateCharge` | staff | Updates a charge; recomputes `line_total_usd`; accepts `unit_price_usd` or `unitPrice`. |
| `deleteCharge` | staff | Deletes a charge; revalidates the owning booking. |
| `generateInvoice` | staff | `generateInvoice(bookingId, force = false)`. Returns `{data:{roomTotal, addonTotal, surchargePct, grandTotal}}`. Errors if an invoice exists and `force` is false. |
| `getInvoice` | staff | `maybeSingle()` invoice. |
| `recordPayment` | staff | Inserts a completed payment; sets the invoice `paid` only when covered. |
| `confirmBankTransfer` | staff | Marks a pending bank transfer completed and confirms the booking. |

### 9.3 Other modules

| File | Actions | Guard |
|---|---|---|
| `guests.ts` | `createGuest`, `searchGuests`, `getGuestRegister`, `getGuest`, `updateGuest`, `getGuestWithBookings` | staff |
| `rooms.ts` | `getRoomCategories`*, `getAvailableRooms`*, `getCalendarBookings`, `getAllRooms`, `getAllAvailableRooms`, `moveGuestToRoom`, `updateRoomHousekeepingStatus` | staff, except `updateRoomHousekeepingStatus` = **any staff**, and the two `*` = public read |
| `equipment.ts` | `getEquipmentCategories`*, `getAvailableUnits`*, `createRental`, `returnUnit`, `getActiveRentals` | staff, except the two `*` = public read |
| `transfers.ts` | `getTransferRoutes`*, `createTransfer`, `updateTransferStatus`, `getSchedule` | staff, except `*` = public read |
| `maintenance.ts` | `reportMaintenanceIssue`, `getMaintenanceRequests`, `updateMaintenanceStatus` | **any staff** / staff / staff |
| `admin.ts` | `getStaffList`, `deleteContactMessage`, `deactivateStaff`, `updatePricing`, `createRoomCategory`, `updateRoomCategory`, `toggleRoomMaintenance` | staff, staff, then **admin** |
| `settings.ts` | `getSettings`*, `updateSettings` | public read, **admin** write |
| `shiftnotes.ts` | `addShiftNote`, `deleteShiftNote`, `getShiftNotes` | staff |

`*` = intentionally public read.

### 9.4 Dead server actions

The following are exported but never called from any component: `createBooking`, `createRental`, `returnUnit`, `createTransfer`, `updateTransferStatus`, `deactivateStaff`, `updatePricing`, `toggleRoomMaintenance`, `updateSettings`, `getBooking`, `getBookingsByGroup`, `getTodayArrivals`, `getTodayDepartures`, `getGuestRegister`, `getGuestWithBookings`, `getAllRooms`, `getAllAvailableRooms`, `getCalendarBookings`, `getEquipmentCategories`, `getActiveRentals`, `getStaffList`, `getMaintenanceRequests`, `getInvoice`, `getShiftNotes`, `getSettings`, `getRoomCategories`, `getTransferRoutes`, `getSchedule`. Their UI equivalents write directly from the browser client instead — see G-01.

---

## 10. Validation & Pricing Rules

### 10.1 Zod schemas (`src/lib/validations.ts`)

| Schema | Shape | Used by |
|---|---|---|
| `guestSchema` | `fullName` 1–100 · `email` valid, ≤255 · `phone` 1–50, `/^[\d\s\+\-\(\)]{7,}$/` · `nationality` 1–100, letters/spaces/· · `nic_passport` 5–20, alphanumeric+hyphen · `numGuests` coerce int 1–20 | `GuestDetailsStep`, `createPayHereBooking` |
| `dateStepSchema` | `checkIn`, `checkOut` required · `roomSelections[]` min 1 (uuid category, positive price, int quantity, non-negative availability) · refine `checkOut > checkIn` | `DateStep` |
| `extrasSchema` (+ `extrasItemSchema`) | `surfboardQty` 0–20, dates, `end > start` · `items[]` (qty 1–20, dates) · `transferNeeded` bool · `transferDirection` enum · `flightNumber` ≤50 · `transferTime` (required when a transfer is needed) | `ExtrasStep` |
| `bookingLookupSchema` | `referenceCode` 1–50 · `email` valid | `/booking/lookup` |
| `loginSchema` | `email` valid · `password` ≥6 | Staff login |
| `dashboardBookingSchema` | dates, `roomId`, `source` enum, `otaName` (required for OTA), optional guest fields, `numGuests` 1–20, `notes`; refines `checkOut > checkIn` | `BookingForm` |
| `chargeSchema` | `description` 1–500 · `category` enum · `quantity` ≥1 · `unitPrice` ≥0.01 | `ChargeForm` |
| `equipmentRentalSchema` | `categoryId`, `unitId`, `guestId`, `startDate`, `endDate`; refine `endDate >= startDate` | `createRental` |
| `transferSchema` | `routeId`, `guestId`, optional `bookingId` (uuid), `direction` enum, `flightNumber` ≤50, `datetime` | `createTransfer` |
| `roomCategorySchema` | `name` 1–100 · `description` ≤2000 · `maxOccupancy` 1–20 · `basePriceUsd` ≥0 · `imageUrl` url | Admin category CRUD |
| `recordPaymentSchema` | `amount` positive · `method` enum | `recordPayment` |
| `settingsSchema` | `checkInTime`, `checkOutTime`, `surchargePct` 0–100, `minDepositPct` 0–100 | Admin settings |
| `addUnitSchema` | `unitLabel` 1–100 · `categoryId` | Admin units |
| `pricingUpdateSchema` | `basePriceUsd` ≥0 | Admin pricing |
| `boardPlanSchema` | `room_only \| half_board \| full_board` | Exported; unused in-app |

### 10.2 Pricing constants (`src/lib/constants.ts`)

| Constant | Value |
|---|---|
| `BOARD_PLANS` | room_only $0 · half_board $10 · full_board $20 (per room, per night) |
| `SURFBOARD_TIERS` | 1–6 d $25/day · 7–13 d $14 · 14–20 d $12 · 21+ d $11 |
| `CATEGORY_BUDGET` / `CATEGORY_DELUXE` | fixed UUIDs (Budget $20/night, max 2 · Deluxe $40/night, max 3) |
| `ROUTE_CMB` | fixed UUID — the Colombo airport transfer route |
| `EQUIPMENT_SURFBOARD` / `EQUIPMENT_BICYCLE` | fixed UUIDs |
| `MOTORBIKE_CATEGORIES` / `CAR_CATEGORIES` | 3 motorbike + 8 car UUIDs |
| `BOOKING_STATUSES` | all 7 `booking_status` labels |
| `APP_URL` | `NEXT_PUBLIC_APP_URL` or `http://localhost:3000` |

### 10.3 Time and money conventions

| Concern | Rule |
|---|---|
| Hotel timezone | `Asia/Colombo` (UTC+05:30), pinned in `src/lib/datetime.ts` |
| Storing a local time | `hotelLocalToUtcIso("YYYY-MM-DDTHH:mm")` → UTC ISO |
| Displaying a timestamp | `formatHotelDateTime(iso)` → `Oct 29, 2026, 6:45 PM`; `formatHotelTime(iso)` → `6:45 PM`; `hotelDate(iso)` → `2026-10-29` |
| Filtering by day | Compare `hotelDate(timestamp)` against the selected date — never the raw UTC value |
| Currency | USD everywhere (`*_usd` columns, `Intl.NumberFormat` en-US) |
| Rounding | 2 decimal places (`roundTo`) |

---

## 11. Non-Functional Requirements

### 11.1 Security headers (`next.config.ts`)

Applied to `/(.*)`:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy-Report-Only` | `default-src 'self'; img-src 'self' data: https:; connect-src 'self' <SUPABASE_URL> https:; style-src 'self' 'unsafe-inline'; script-src 'self'` — **report-only, not enforced** (G-05) |

### 11.2 Accessibility

- Every icon-only control has an `aria-label`.
- Form fields have an associated `<label htmlFor>` (shadcn `Label` where used).
- Tables use `<th scope="col">` for header cells.
- Dialogs use Base UI focus trapping; `aria-invalid` + `aria-describedby` on invalid fields.
- Skeletons carry `aria-busy` and an `aria-label`.
- Minimum touch target ≈44 px on mobile.
- Known gaps: the ⌘K palette's results are not fully exposed to the accessibility tree; the "Reserve a Table" and experience links rely on colour for contrast.

### 11.3 Performance

- Server Components by default; client islands only where interactivity is required.
- `next/image` with `remotePatterns` for Supabase Storage and Unsplash; several components still use raw `<img>` (ESLint warns).
- Target routes are `force-dynamic`: `/rooms/[slug]`, `/booking/confirmation/[id]`.
- Supabase `max_rows = 1000` per request.

### 11.4 SEO

See [§6.3](#63-seo--metadata).

### 11.5 Reliability & data integrity

- The exclusion constraints are the ultimate authority against double-booking; every UI path surfaces `23P01` as a friendly message.
- Webhook idempotency is keyed on `payhere_payment_id`.
- The webhook recomputes the expected amount and refuses to confirm on mismatch.
- Orphan-hold release is implemented at three independent layers.

---

## 12. Design System

### 12.1 Two tracks

| Track | Canvas | Use |
|---|---|---|
| **Cinematic / marketing** | `canvas-night` `#000000` | Home, about, dining, experiences — full-bleed photography, thin display type, one CTA |
| **Transactional / light** | `canvas-light` `#ffffff`, `canvas-cream` `#faf8f5` | Rooms, booking wizard, dashboard — data-dense, functional |

### 12.2 Implemented tokens (`src/app/globals.css`)

> **Important:** `DESIGN.md` in the repo describes a *different* product ("Shopifi": Neue Haas Grotesk Display, aloe/pistachio greens, `#fbfbf5` cream) and diverges materially from the shipped implementation. The tokens below are what the code actually renders. `DESIGN.md` should be reconciled or replaced — see G-09.

**Light** — `--background #ffffff` · `--foreground #1a1a1a` · `--primary #1a1a1a` / `--primary-foreground #ffffff` · `--secondary #f5f0eb` · `--muted #f5f0eb` · `--muted-foreground #8a7f74` · `--accent #f3e6e2` · `--destructive oklch(0.577 0.245 27.325)` · `--border`/`--input #e8e3de` · `--ring #c5bdb3`

**Dark** — `--background #1a1a1a` · `--foreground oklch(0.985 0 0)` · `--card #222222` · `--secondary`/`--muted #2a2825` · `--muted-foreground #8a7f74` · `--accent #3a2e28` · `--destructive oklch(0.704 0.191 22.216)` · `--border #2a2825` · `--ring #5a524a`

**Semantic extras** — `canvas-night #000000` · `canvas-night-elevated #0a0a0a` · `surface-elevated-dark #1e2c31` · `canvas-light #ffffff` · `canvas-cream #faf8f5` · `canvas-warm #f5f0eb` · `canvas-blush #f3e6e2` · `ink #1a1a1a` · `on-primary #ffffff` · `muted-text #8a7f74` · `border-light #e8e3de`

**Radius** — `xs 2px` · `sm 3px` · `md 4px` · `lg 6px` · `xl 8px` · `pill 9999px`

**Shadows** — `2xs`/`xs` `0 1px 2px hsl(0 0% 0% / 0.04)` · `sm`/`shadow` `0 1px 3px …0.06` · `md` `0 2px 6px …0.06` · `lg` `0 4px 12px …0.06` · `xl` `0 8px 24px …0.06` · `2xl` `0 12px 32px …0.08`

**Typography** — Inter (sans, UI) · Playfair Display (serif, display) · Geist Mono (mono). Dark mode via `@custom-variant dark (&:is(.dark *))` and `next-themes` (`attribute="class"`, `defaultTheme="system"`).

### 12.3 Rules carried from `DESIGN.md` that still apply

- Display type is always rendered thin; body type never cross-promotes.
- Photography is full-bleed on marketing surfaces, never inset in a card.
- One canvas per surface; greens/beiges/blues are not third canvases.
- New button variants vary fill/border/canvas, never shape.
- Focus on one component per iteration; default body to the standard body size.

### 12.4 Responsive behaviour

| Breakpoint | Behaviour |
|---|---|
| ≥ 1440 px | Full cinematic hero, wide container, 4-up pricing |
| 1024–1440 px | Default content max-width |
| 768–1023 px | 2-up grids, hero photography crops, tablet nav |
| < 768 px | Single column, hamburger nav, display type steps down to ~56–64 px, ≥44 px touch targets |

---

## 13. Infrastructure, Build & Deployment

### 13.1 Commands

| Command | Action |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build (also the type gate) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint 9 flat config — `core-web-vitals` + `typescript` |
| `npm test` | Vitest run |
| `npm run test:watch` / `npm run test:coverage` | Watch mode / coverage (v8) |

### 13.2 Environment variables

> Names only. `NEXT_PUBLIC_*` values are inlined at **build** time — changing them requires a rebuild.

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✔ | Supabase project URL | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✔ | Anon / publishable key | — |
| `SUPABASE_SERVICE_ROLE_KEY` | ✔ | Service-role client (RLS bypass) | — |
| `NEXT_PUBLIC_APP_URL` | recommended | Canonical URL (metadataBase, sitemap, robots, emails) | `http://localhost:3000` |
| `NEXT_PUBLIC_PAYHERE_MERCHANT_ID` | ✔ (live) | PayHere merchant id | `""` |
| `PAYHERE_MERCHANT_SECRET` | ✔ (live) | Hash signing + webhook verification | `""` |
| `PAYHERE_APP_ID` | ✔ (refunds) | PayHere Refund API client id | `""` |
| `PAYHERE_APP_SECRET` | ✔ (refunds) | PayHere Refund API client secret | `""` |
| `NEXT_PUBLIC_PAYHERE_MODE` | — | **Declared but never read** — G-04 | — |
| `RESEND_API_KEY` | ✔ | Transactional email | — |
| `NEXT_PUBLIC_BOOKING_ENABLED` | optional | Kill-switch; booking is enabled unless the value is `"false"` | enabled |

### 13.3 Supabase project

| Aspect | Value |
|---|---|
| Project ref | `emurxsoksddmoghodplv` |
| Postgres | 17.6 · region `aws-1-ap-northeast-1` (Tokyo) |
| Extensions | `btree_gist`, `pg_cron`, `pgcrypto`, `uuid-ossp`, `supabase_vault`, `pg_stat_statements` |
| Auth | Email+password, PKCE, JWT 3600 s, refresh rotation (10 s reuse interval), min password length 6, signup enabled, anonymous sign-ins disabled, MFA off |
| Auth rate limits | sign-in/sign-up 30 · token refresh 150 · email 2/h · OTP 30 |
| Storage | enabled, 50 MiB limit, **no buckets configured** |
| Realtime | enabled |
| Edge functions | enabled (Deno 2) — **none deployed** |

### 13.4 Migrations in the repository

| File | Purpose |
|---|---|
| `20260907000000_security_fixes.sql` | Round 1 — `handle_new_user` as `SECURITY DEFINER` (role never from client metadata); RLS tightening on `contact_messages`, `shift_notes`, `maintenance_requests`, `profiles`, `rooms`; EXECUTE grants revoked on `global_search` and `handle_new_user`; `lookup_booking_by_ref` restricted to `service_role` |
| `20260909000000_fix_profiles_rls_recursion.sql` | Fixes infinite RLS recursion on `profiles`; `read profiles` → `auth.uid() = id` |
| `20261010000000_admin_policies_and_payments_idempotency.sql` | Adds `admin insert rooms` + `admin select profiles`; **drops** `payments_booking_id_key` so a booking can hold multiple payments |
| `20261010000001_security_fixes_round2.sql` | New signups default to `housekeeping` (least privilege); `get_staff_role()` filters on `active = true` so deactivation revokes access immediately |
| `20261010000002_get_staff_role_security_definer.sql` | Re-creates `get_staff_role()` as `SECURITY DEFINER` to stop PostgREST `54001 stack depth limit exceeded` |

> **The base schema is not in the repository.** `supabase db reset` produces an empty database. `src/lib/supabase/database.types.ts` (generated from the live project) is the only schema artifact in git — see G-02.

### 13.5 Deployment topology

```
Browser
  │  HTTPS
  ▼
Next.js 16 host (Node runtime)          ← Vercel-shaped, but no vercel.json/Dockerfile in repo
  │  ├─ Supabase REST (PostgREST)  ──►  Postgres 17 (RLS enforced)   [aws-1-ap-northeast-1]
  │  ├─ Supabase Auth  ───────────►  auth.users / sessions
  │  ├─ PayHere checkout ◄────────►  sandbox.payhere.lk
  │  │       └─ webhook ──────────►  POST /api/payhere/notify
  │  └─ Resend API ◄──────────────  confirmation & failure email
```

Runtime assumptions: Node.js (no `engines`/`.nvmrc` declared), no Edge runtime routes, `NEXT_PUBLIC_*` inlined at build, single region for the app (not pinned).

### 13.6 CI/CD

**None.** No `.github/workflows`, no hooks, no branch protection, no health endpoint, no structured logging or error tracking, no application-level rate limiting on public endpoints.

---

## 14. Testing Strategy

### 14.1 Current state

| Aspect | Status |
|---|---|
| Framework | Vitest 4 + happy-dom + Testing Library, `globals: true`, alias `@ → src` |
| Setup | `src/__tests__/setup.ts` → `@testing-library/jest-dom/vitest` |
| Include glob | `src/__tests__/**/*.test.{ts,tsx}` |
| Coverage config | v8, `include: [src/lib/utils.ts, src/lib/validations.ts, src/lib/auth.ts, src/lib/actions/*.ts]`, **80 % thresholds** on statements/branches/functions/lines |
| Test files | 2 — `pricing.test.ts` (board plans, zod schemas, `rentalDays`, surfboard tiers) and `setup.ts` |
| Passing | 15 / 15 |

**Covered:** pricing maths, date-night arithmetic, zod schema shapes.
**Not covered:** every server action, every route handler, the proxy's auth redirects, PayHere hash generation/verification, `computeBookingTotal`, the email module, the refund client, role gating in `auth.ts`, `datetime.ts`, `seo.ts`, every React component (no RTL component tests), `sitemap.ts`, `robots.ts`.

> `msw` is installed but unused. Because the coverage `include` list names files that no test imports, **`npm run test:coverage` currently fails the 80 % thresholds**.

### 14.2 Required test layers (target)

| Layer | Scope | Priority |
|---|---|---|
| Unit | pricing, datetime, validation schemas, PayHere hash/verify | P0 |
| Server-action | role gating, price recomputation, shortfall rejection, hold release | P0 |
| Route handler | webhook signature verification, idempotency, amount reconciliation, cancel release | P0 |
| Component (RTL) | wizard steps, admin cards, panels | P1 |
| End-to-end (Playwright) | book → pay (sandbox) → confirm → check-in → check-out → invoice | P1 |

---

## 15. Operations & Observability

### 15.1 Day-to-day

| Task | Where |
|---|---|
| Confirm a payment | Admin panel → Bookings → booking → Confirm Payment |
| Check a guest in / out | Overview quick sheets, or the booking detail action bar |
| Issue an invoice / take payment | Booking detail → Generate Invoice / Record Payment |
| Refund a card payment | Booking detail → Payments → Refund (PayHere API) |
| Mark a room clean | Housekeeping board → Ready |
| Report / resolve a maintenance issue | Housekeeping → Report Issue; Admin → Maintenance Requests |
| Manage room categories & pricing | Admin → Room Categories |
| Change hotel settings (times, surcharge, deposit %) | Admin → Hotel Settings |
| Read enquiries | Admin → Contact Messages |
| Hand over the shift | Overview → Shift Notes |

### 15.2 Background jobs

One pg_cron job (`expire_pending_bookings`, every minute). No application-level scheduler, no queue, no edge function.

### 15.3 Monitoring

`console.error` / `console.warn` only. No error tracking, no structured logging, no metrics, no uptime check. `supabase` has `[analytics]` enabled (Postgres backend).

---

## 16. Known Gaps & Backlog

| ID | Gap | Impact | Recommendation |
|---|---|---|---|
| **G-01** | Dashboard panels (`BookingForm`, `EquipmentPanel`, `TransferPanel`, `AdminPanel`, `QuickCheckinSheet`, `QuickCheckoutSheet`, `MarkCleanSheet`) still **write directly from the browser client** instead of through the server actions that exist for them | Authorisation rests entirely on RLS; ~30 server actions are dead code; pricing computed in the browser | Migrate each panel to its existing server action and delete the duplicates. Highest-value cleanup in the codebase. |
| **G-02** | The **base schema is not in git**; `supabase db reset` yields an empty DB; `supabase/seed.sql` referenced by `config.toml` does not exist | No reproducible environment; schema drift is invisible to review | Capture the live schema as an initial migration; add a seed file; regenerate `database.types.ts` from the applied migrations |
| **G-03** | `createBooking` is an **unguarded, service-role** write path that is never called | Any visitor able to invoke the action could create guests, bookings, equipment and transfers | Delete it (G-01 removes the need for it) |
| **G-04** | The PayHere checkout URL is **hard-coded to sandbox**; `NEXT_PUBLIC_PAYHERE_MODE` is dead config | Live payments require a code change | Read the env var and select the endpoint; default to sandbox in development |
| **G-05** | CSP is **report-only**; no enforced `Content-Security-Policy` | Defence-in-depth gap (owner-deferred) | Triage the report-only violations, then enforce |
| **G-06** | **Mixed date/timezone sources**: overview & quick sheets use the UTC date (`toISOString().split('T')[0]`), while `getTodayArrivals`/`Departures` and the transfer/timeline code use hotel-local time | Around 00:00–05:30 local, "today" differs between panels | Route every "today" through a single `hotelToday()` helper |
| **G-07** | `moveGuestToRoom` checks conflicts only against `confirmed`/`checked_in` (a `pending_payment` overlap is missed) and **overwrites** `room_total_usd` instead of raising a credit line | A room can be double-allocated against an online hold; the price change is invisible on an issued invoice | Extend the conflict check to `pending_payment`; record the delta as a `booking_charge` instead of overwriting |
| **G-08** | `refundBookingPayment` does not recompute the invoice status | An invoice can stay `paid` after a refund | Recompute the invoice status after a refund |
| **G-09** | `DESIGN.md` describes a **different product** ("Shopifi") and contradicts the shipped tokens, fonts and radii | Any designer following it builds the wrong UI | Rewrite `DESIGN.md` from `src/app/globals.css` |
| **G-10** | `database.types.ts` is hand-generated and can drift | Compile-time types may not match the live schema | Regenerate via `supabase gen types` after every migration |
| **G-11** | No CI, no deploy config, no `engines`/`.nvmrc`, no health endpoint, no error tracking, no application rate limiting | Operational risk on every deploy | Add a minimal CI (lint + test + build), pin the Node version, add `/api/health` |
| **G-12** | `npm run test:coverage` fails its own 80 % thresholds; only 15 unit tests exist | Regressions in money logic are undetectable | Implement the test layers in [§14.2](#142-required-test-layers-target) |
| **G-13** | 29 dead server actions; `/dashboard/bookings/[id]` missing from the shell's title map; `AmenitiesSection`, `ContactSection`, `NewsletterSection`, `PhotoGallery` unmounted | Noise and confusion | Delete or wire up |
| **G-14** | `DELETE` is impossible on 10 tables; non-admins cannot UPDATE `maintenance_requests` | Operational friction (e.g. a receptionist cannot resolve a ticket) | Add narrowly-scoped policies where the business needs them |
| **G-15** | Guest self-service is read-only — no cancel, no re-pay | Support load; a guest who fails to pay must phone | Build the retry-payment and guest-cancel flows the owner has already scoped |

---

## 17. Glossary

| Term | Meaning |
|---|---|
| **Booking group** | The set of bookings sharing one `group_booking_id`. One guest stay across several rooms. The reference a guest quotes is the first 8 characters of that id, uppercased. |
| **Board plan** | Meal inclusion per room per night: `room_only`, `half_board`, `full_board`. |
| **Hold** | A provisional inventory reservation — `equipment_bookings` with `status = pending` or `airport_transfers` with `status = scheduled` — attached to a booking that has not yet been paid. |
| **Charge** | A `booking_charges` line item (meal, late checkout fee, transport, misc) added to a booking. |
| **Invoice** | The consolidated bill for one booking: room + board + add-ons + surcharge. Exactly one per booking. |
| **Surcharge** | `settings.surcharge_pct` (default 5 %), applied on top of the subtotal at invoice and checkout time. |
| **Deposit** | `room_total_usd × settings.min_deposit_pct/100` (default 50 %), tracked as a `payments` row with no invoice link. |
| **Release** | The act of returning held equipment/transfer inventory to bookable status when a booking is cancelled or expires. |
| **Server action** | A `"use server"` async function invoked directly from a component; the primary mutation mechanism. |
| **Admin client** | The service-role Supabase client; bypasses RLS entirely. |
| **RPC** | A Postgres function exposed through PostgREST (`supabase.rpc(...)`). |
| **Hotel local time** | `Asia/Colombo` (UTC+05:30). The only wall clock that matters to the property. |
| **PayHere** | The Sri Lankan payment gateway used for card checkout, webhook confirmation and refunds. |
| **Reference** | The guest-facing booking identifier: the first 8 characters of `group_booking_id`, uppercased. |
