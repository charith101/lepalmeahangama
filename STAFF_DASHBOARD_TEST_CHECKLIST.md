# Le Palme Ahangama — Staff Dashboard Test Checklist

> **How to use:** Check each box as you complete it. Add notes in the `Notes:` line under any test.
> **Status keys:** ✅ Pass | ❌ Fail | ⚠️ Needs retest | 🚫 Blocked

**Tested by:** ______________________ **Date:** ______________________ **Environment:** Local / Staging / Prod (circle)

---

## 0. Test Data Prerequisites

> Seed these before starting so every test has real data to hit.

- [ ] 3 room categories with different base prices (e.g. Deluxe \$80, Suite \$150, Standard \$50)
- [ ] 6+ rooms (2 per category) — mix of `active` and `retired`
- [ ] 8+ guests — mix of local/international, with NIC/passport, email, phone
- [ ] 12+ bookings covering **all 7 statuses**: `pending_payment`, `confirmed`, `checked_in`, `checked_out`, `cancelled`, `no_show`, `maintenance_block`
- [ ] 5+ booking charges across all categories: `meal`, `transport`, `late_checkout_fee`, `misc`
- [ ] 3 invoices: `draft`, `issued`, `paid`
- [ ] 8+ payments — all methods (`cash`, `bank_transfer`, `card_payhere`) and statuses (`pending`, `completed`, `refunded`)
- [ ] 2+ airport transfer routes (e.g. CMB Airport, KDW Airport)
- [ ] 5+ transfers — both directions, all 3 statuses
- [ ] 4 equipment categories (surfboard, bicycle, motorbike, car)
- [ ] 6+ equipment units — all conditions (`good`, `needs_maintenance`, `retired`)
- [ ] 4+ equipment bookings — `active`, `returned`, `pending`
- [ ] 3+ maintenance requests — `open`, `in_progress`, `resolved`
- [ ] 3+ contact messages — read and unread
- [ ] Settings row exists with check-in time, check-out time, surcharge %, min deposit %
- [ ] 3+ shift notes from different staff
- [ ] 3 test accounts created with correct roles:
  - [ ] `admin@test.com` → role **admin**
  - [ ] `reception@test.com` → role **receptionist**
  - [ ] `housekeeping@test.com` → role **housekeeping**

**Notes:** ________________________________________________

---

## 1. Authentication & Access Control

### Login / Logout

- [ ] **AUTH-01** Valid credentials → redirects to `/dashboard`
  - Notes: ________________________________________________

- [ ] **AUTH-02** Invalid credentials → error shown, no redirect
  - Notes: ________________________________________________

- [ ] **AUTH-03** Unauthenticated visit to `/dashboard` → redirected to `/auth/login`
  - Notes: ________________________________________________

- [ ] **AUTH-04** Refresh page while logged in → session persists
  - Notes: ________________________________________________

- [ ] **AUTH-05** Logout button → confirmation dialog → signs out → `/auth/login`
  - Notes: ________________________________________________

### Role Gatekeeping

- [ ] **AC-01** Housekeeping user visits `/dashboard` → redirected to `/dashboard/housekeeping`
  - Notes: ________________________________________________

- [ ] **AC-02** Receptionist visits `/dashboard/admin` → blocked (403 or redirect)
  - Notes: ________________________________________________

- [ ] **AC-03** Housekeeping sidebar shows **only** the Housekeeping nav item (plus logout)
  - Notes: ________________________________________________

- [ ] **AC-04** Receptionist sidebar shows all items **except** Admin
  - Notes: ________________________________________________

- [ ] **AC-05** Admin sidebar shows all 9 items
  - Notes: ________________________________________________

- [ ] **AC-06** Housekeeping tries direct URL to `/dashboard/bookings` → blocked
  - Notes: ________________________________________________

- [ ] **AC-07** Receptionist tries direct URL to `/dashboard/admin` → blocked
  - Notes: ________________________________________________

- [ ] **AC-08** Server actions (`requireStaff`, `requireAdmin`) reject wrong role when called directly (not just via UI)
  - Notes: ________________________________________________

- [ ] **AC-09** Deactivated staff member (`profiles.active = false`) cannot log in or is blocked
  - Notes: ________________________________________________

---

## 2. Overview Dashboard (`/dashboard`)

### Statistics Cards

- [ ] **OV-01** Page loads showing 5 stat cards: Arrivals, Departures, Occupancy %, Dirty Rooms, Pending Check-ins
  - Notes: ________________________________________________

- [ ] **OV-02** Arrivals count = bookings with `check_in = today` and status `confirmed` or `checked_in`
  - Notes: ________________________________________________

- [ ] **OV-03** Departures count = bookings with `check_out = today` and status `checked_in` or `checked_out`
  - Notes: ________________________________________________

- [ ] **OV-04** Occupancy = (occupied rooms / active rooms) × 100, rounded
  - Notes: ________________________________________________

- [ ] **OV-05** Dirty rooms count = active rooms with housekeeping `dirty` or `cleaning`
  - Notes: ________________________________________________

- [ ] **OV-06** Pending check-ins = bookings with status `confirmed` and `check_in <= today`
  - Notes: ________________________________________________

- [ ] **OV-07** With zero bookings: all counts show 0, occupancy shows 0%
  - Notes: ________________________________________________

- [ ] **OV-08** With all rooms retired: total rooms = 0, occupancy = 0% (no divide-by-zero crash)
  - Notes: ________________________________________________

- [ ] **OV-09** Counts update after performing check-in/check-out actions (page refresh)
  - Notes: ________________________________________________

### Room Status Board

- [ ] **OV-10** All active rooms displayed as cards with room number and category
  - Notes: ________________________________________________

- [ ] **OV-11** Retired room shows "Retired" badge (outline) and is dimmed (opacity-50)
  - Notes: ________________________________________________

- [ ] **OV-12** No booking + housekeeping `dirty` → shows "Dirty" (destructive)
  - Notes: ________________________________________________

- [ ] **OV-13** No booking + housekeeping `cleaning` → shows "Cleaning" (secondary)
  - Notes: ________________________________________________

- [ ] **OV-14** No booking + housekeeping `ready` → shows "Vacant" (outline)
  - Notes: ________________________________________________

- [ ] **OV-15** Booking status `checked_in` → shows "Occupied" (default)
  - Notes: ________________________________________________

- [ ] **OV-16** Booking check-in is today (but not checked in) → shows "Arriving" (default)
  - Notes: ________________________________________________

- [ ] **OV-17** Booking check-out is today → shows "Departing" (secondary)
  - Notes: ________________________________________________

- [ ] **OV-18** Booking on other dates → shows "Booked" (secondary)
  - Notes: ________________________________________________

- [ ] **OV-19** Guest name shown on cards where a current booking exists
  - Notes: ________________________________________________

### Quick Actions

- [ ] **OV-20** "Quick Check-in" opens a side sheet listing confirmed bookings with `check_in <= today`
  - Notes: ________________________________________________

- [ ] **OV-21** "Quick Check-out" opens a side sheet listing checked-in bookings
  - Notes: ________________________________________________

- [ ] **OV-22** "Mark Room Clean" opens a side sheet listing dirty/cleaning rooms
  - Notes: ________________________________________________

- [ ] **OV-23** "Walk-in" button navigates to `/dashboard/bookings/new`
  - Notes: ________________________________________________

- [ ] **OV-24** "New Booking" button navigates to `/dashboard/bookings/new`
  - Notes: ________________________________________________

- [ ] **OV-25** "Calendar" button navigates to `/dashboard/calendar`
  - Notes: ________________________________________________

### Revenue Card

- [ ] **OV-26** "Today" revenue = sum of `completed` payments paid today
  - Notes: ________________________________________________

- [ ] **OV-27** "Month-to-date" = sum of `completed` payments from 1st of current month
  - Notes: ________________________________________________

- [ ] **OV-28** "Outstanding" = issued invoices total − completed payments on those invoices (never negative)
  - Notes: ________________________________________________

- [ ] **OV-29** Cross-check: manually sum payments in DB for today → card matches
  - Notes: ________________________________________________

### Shift Notes

- [ ] **OV-30** Shows up to 10 most recent notes, newest first
  - Notes: ________________________________________________

- [ ] **OV-31** Each note shows author name and timestamp
  - Notes: ________________________________________________

- [ ] **OV-32** With zero notes: shows empty state gracefully
  - Notes: ________________________________________________

---

## 3. Calendar (`/dashboard/calendar`)

- [ ] **CAL-01** Grid loads: first column = rooms, 30 columns = dates starting today
  - Notes: ________________________________________________

- [ ] **CAL-02** Rooms grouped under category headers
  - Notes: ________________________________________________

- [ ] **CAL-03** Only active rooms shown
  - Notes: ________________________________________________

- [ ] **CAL-04** `pending_payment` bookings render with secondary color
  - Notes: ________________________________________________

- [ ] **CAL-05** `confirmed` bookings render with primary/10 color
  - Notes: ________________________________________________

- [ ] **CAL-06** `checked_in` bookings render with solid primary color
  - Notes: ________________________________________________

- [ ] **CAL-07** `maintenance_block` bookings render with muted color
  - Notes: ________________________________________________

- [ ] **CAL-08** Hovering a booking bar shows tooltip: guest name, room, category, dates, status badge
  - Notes: ________________________________________________

- [ ] **CAL-09** Maintenance block tooltip shows "Maintenance" instead of guest name
  - Notes: ________________________________________________

- [ ] **CAL-10** Clicking a booking bar navigates to `/dashboard/bookings/{id}`
  - Notes: ________________________________________________

- [ ] **CAL-11** Cancelled / no-show / checked-out bookings do **not** appear
  - Notes: ________________________________________________

- [ ] **CAL-12** Booking starting before today still appears (clipped to grid)
  - Notes: ________________________________________________

- [ ] **CAL-13** Booking ending after day 30 still appears (clipped)
  - Notes: ________________________________________________

- [ ] **CAL-14** Horizontal scroll works on narrow screens
  - Notes: ________________________________________________

- [ ] **CAL-15** Room number column stays sticky when scrolling right
  - Notes: ________________________________________________

- [ ] **CAL-16** Double-booked room (data integrity issue) does not crash the calendar
  - Notes: ________________________________________________

---

## 4. Bookings List (`/dashboard/bookings`)

- [ ] **BK-L-01** Loads up to 50 bookings, newest first (by `created_at`)
  - Notes: ________________________________________________

- [ ] **BK-L-02** Columns: Guest, Check-in, Check-out, Status, Total, Source, Actions
  - Notes: ________________________________________________

- [ ] **BK-L-03** Status badges use correct variants for all 7 statuses
  - Notes: ________________________________________________

- [ ] **BK-L-04** Room total shows formatted currency (e.g. \$120.00)
  - Notes: ________________________________________________

- [ ] **BK-L-05** Source shows correctly: website, walk-in, ota-manual
  - Notes: ________________________________________________

- [ ] **BK-L-06** "View" button navigates to detail page
  - Notes: ________________________________________________

- [ ] **BK-L-07** "New Booking" button navigates to `/dashboard/bookings/new`
  - Notes: ________________________________________________

- [ ] **BK-L-08** Empty state shows "No bookings yet."
  - Notes: ________________________________________________

---

## 5. New Booking Form (`/dashboard/bookings/new`)

### Date Selection

- [ ] **BK-N-01** Check-in calendar disables past dates
  - Notes: ________________________________________________

- [ ] **BK-N-02** Check-out calendar disables dates on/before check-in
  - Notes: ________________________________________________

- [ ] **BK-N-03** Setting check-in then check-out: check-out must be after check-in
  - Notes: ________________________________________________

- [ ] **BK-N-04** Validation error if check-out <= check-in: "Check-out must be after check-in"
  - Notes: ________________________________________________

### Room Selection

- [ ] **BK-N-05** Category dropdown lists all room categories
  - Notes: ________________________________________________

- [ ] **BK-N-06** Room dropdown filters by selected category
  - Notes: ________________________________________________

- [ ] **BK-N-07** Rooms already booked for selected dates are excluded
  - Notes: ________________________________________________

- [ ] **BK-N-08** Already-selected rooms excluded from dropdown
  - Notes: ________________________________________________

- [ ] **BK-N-09** Adding a room shows it in the list with room number + category
  - Notes: ________________________________________________

- [ ] **BK-N-10** Remove button (trash icon) removes a selected room
  - Notes: ________________________________________________

- [ ] **BK-N-11** Retired rooms do not appear in the selector
  - Notes: ________________________________________________

- [ ] **BK-N-12** Cannot submit with zero rooms: error "Please add at least one room"
  - Notes: ________________________________________________

- [ ] **BK-N-13** Multi-room: add 2+ rooms, submit creates a `group_booking_id` linking them
  - Notes: ________________________________________________

### Source & Board Plan

- [ ] **BK-N-14** Source defaults to "Walk-in"
  - Notes: ________________________________________________

- [ ] **BK-N-15** Switching to "OTA (Manual)" reveals OTA Name field (required)
  - Notes: ________________________________________________

- [ ] **BK-N-16** Submitting OTA source without OTA name → validation error
  - Notes: ________________________________________________

- [ ] **BK-N-17** Board plan options: Room Only (included), Half Board, Full Board (with per-night prices)
  - Notes: ________________________________________________

- [ ] **BK-N-18** Selected board plan is highlighted
  - Notes: ________________________________________________

- [ ] **BK-N-19** `board_total_usd` saved = price_per_night × nights
  - Notes: ________________________________________________

### Equipment Rental (in booking form)

- [ ] **BK-N-20** Surfboard: qty stepper works (0–20), date pickers appear when qty > 0
  - Notes: ________________________________________________

- [ ] **BK-N-21** Surfboard pricing loads from DB (tiered pricing applied)
  - Notes: ________________________________________________

- [ ] **BK-N-22** Bicycle: qty stepper and dates work
  - Notes: ________________________________________________

- [ ] **BK-N-23** Motorbike: model select shows 3 models with live prices (TVS Ntorq, Honda Dio, Honda Navi)
  - Notes: ________________________________________________

- [ ] **BK-N-24** Car: model select shows 8 models with live prices
  - Notes: ________________________________________________

- [ ] **BK-N-25** Equipment start/end date validation: end > start
  - Notes: ________________________________________________

- [ ] **BK-N-26** Equipment dates required when qty > 0: "Rental dates are required"
  - Notes: ________________________________________________

- [ ] **BK-N-27** Requesting more units than available → error "Only X unit(s) available for these dates"
  - Notes: ________________________________________________

- [ ] **BK-N-28** Equipment bookings created linked to the first room booking via `booking_id`
  - Notes: ________________________________________________

- [ ] **BK-N-29** Retired equipment units do not appear
  - Notes: ________________________________________________

### Guest Fields

- [ ] **BK-N-30** Full Name is required — empty submit shows error
  - Notes: ________________________________________________

- [ ] **BK-N-31** Email validated with regex if provided (can be left empty)
  - Notes: ________________________________________________

- [ ] **BK-N-32** Phone, Nationality, NIC/Passport optional
  - Notes: ________________________________________________

- [ ] **BK-N-33** Num Guests: min 1, max 20 enforced
  - Notes: ________________________________________________

- [ ] **BK-N-34** Notes textarea accepts text and saves
  - Notes: ________________________________________________

### Submission

- [ ] **BK-N-35** Successful submit → toast "Booking created" → redirects to detail page
  - Notes: ________________________________________________

- [ ] **BK-N-36** Multi-room submit → toast "Booking created (N rooms)"
  - Notes: ________________________________________________

- [ ] **BK-N-37** Room taken between load and submit → error "Room X was just booked by someone else"
  - Notes: ________________________________________________

- [ ] **BK-N-38** Guest created in `guests` table with all fields
  - Notes: ________________________________________________

- [ ] **BK-N-39** Booking status = `confirmed`, source = selected source
  - Notes: ________________________________________________

- [ ] **BK-N-40** `created_by_staff_id` = current logged-in user
  - Notes: ________________________________________________

- [ ] **BK-N-41** Double-click submit does not create duplicate bookings (button disabled while submitting)
  - Notes: ________________________________________________

---

## 6. Booking Detail (`/dashboard/bookings/[id]`)

> **This is the most complex page — test every status transition.**

### Header & Info

- [ ] **BK-D-01** Page loads with room number, category name, guest card, stay card
  - Notes: ________________________________________________

- [ ] **BK-D-02** Status badge shows correct variant for current status
  - Notes: ________________________________________________

- [ ] **BK-D-03** Guest card: name, email, phone, NIC/passport (or "—" if null)
  - Notes: ________________________________________________

- [ ] **BK-D-04** Stay card: check-in, check-out dates, source (with OTA name), room total, board plan
  - Notes: ________________________________________________

- [ ] **BK-D-05** Notes card shown only when notes exist; hidden when null
  - Notes: ________________________________________________

- [ ] **BK-D-06** Invalid/nonexistent booking ID → 404 page
  - Notes: ________________________________________________

### Deposit Tracking (pending_payment & confirmed only)

- [ ] **BK-D-07** Deposit card visible for `pending_payment` and `confirmed`
  - Notes: ________________________________________________

- [ ] **BK-D-08** Deposit card hidden for `checked_in`, `checked_out`, `cancelled`
  - Notes: ________________________________________________

- [ ] **BK-D-09** Required deposit = room_total × min_deposit_pct% (e.g. 50% of \$200 = \$100)
  - Notes: ________________________________________________

- [ ] **BK-D-10** "Received" = sum of completed payments
  - Notes: ________________________________________________

- [ ] **BK-D-11** "Remaining" shown only when not met (in red)
  - Notes: ________________________________________________

- [ ] **BK-D-12** Progress bar width = (received / required) × 100, capped at 100%
  - Notes: ________________________________________________

- [ ] **BK-D-13** "Met" badge appears when received >= required
  - Notes: ________________________________________________

- [ ] **BK-D-14** "Mark Received" button hidden when deposit met
  - Notes: ________________________________________________

- [ ] **BK-D-15** Record Deposit: enter amount > 0 → success toast, progress updates
  - Notes: ________________________________________________

- [ ] **BK-D-16** Record Deposit: enter 0 or negative → error "Enter a valid amount"
  - Notes: ________________________________________________

- [ ] **BK-D-17** Cross-check deposit math against DB payments manually
  - Notes: ________________________________________________

### Status Transitions

> Test each action from its correct starting status.

**From `pending_payment`:**

- [ ] **BK-D-18** Confirm Payment button appears **only** when a pending `bank_transfer` payment exists
  - Notes: ________________________________________________

- [ ] **BK-D-19** Confirm Payment → payment status `completed`, booking → `confirmed`
  - Notes: ________________________________________________

- [ ] **BK-D-20** Cancel button → booking → `cancelled`, toast success
  - Notes: ________________________________________________

**From `confirmed`:**

- [ ] **BK-D-21** Check In button opens dialog with optional NIC/Passport field
  - Notes: ________________________________________________

- [ ] **BK-D-22** Check In → booking → `checked_in`
  - Notes: ________________________________________________

- [ ] **BK-D-23** Check In with NIC/Passport entered → guest record updated with NIC
  - Notes: ________________________________________________

- [ ] **BK-D-24** Check In with empty NIC → booking checked in, guest NIC unchanged (or set to empty — verify)
  - Notes: ________________________________________________

- [ ] **BK-D-25** Cancel → booking → `cancelled`
  - Notes: ________________________________________________

- [ ] **BK-D-26** No-show → booking → `no_show`
  - Notes: ________________________________________________

**From `checked_in`:**

- [ ] **BK-D-27** "Post Charge" button opens ChargeForm inline
  - Notes: ________________________________________________

- [ ] **BK-D-28** "Move Room" button opens dialog
  - Notes: ________________________________________________

- [ ] **BK-D-29** "Generate Invoice" button visible and works
  - Notes: ________________________________________________

- [ ] **BK-D-30** "Check Out" → booking → `checked_out`
  - Notes: ________________________________________________

**From `checked_out`:**

- [ ] **BK-D-31** "Generate Invoice" shown only if no invoice exists yet
  - Notes: ________________________________________________

- [ ] **BK-D-32** After invoice exists, no action buttons shown
  - Notes: ________________________________________________

**From `cancelled` / `no_show` / `maintenance_block`:**

- [ ] **BK-D-33** No action buttons rendered (default case in renderActions)
  - Notes: ________________________________________________

### Charges

- [ ] **BK-D-34** ChargeForm: description required, shows error if empty
  - Notes: ________________________________________________

- [ ] **BK-D-35** Category dropdown: meal, late_checkout_fee, transport, misc
  - Notes: ________________________________________________

- [ ] **BK-D-36** Quantity must be whole number >= 1
  - Notes: ________________________________________________

- [ ] **BK-D-37** Unit price must be > 0
  - Notes: ________________________________________________

- [ ] **BK-D-38** Line total = qty × unit price (shows live as you type)
  - Notes: ________________________________________________

- [ ] **BK-D-39** Save Charge → success toast, charge appears in charges table
  - Notes: ________________________________________________

- [ ] **BK-D-40** Cancel closes form without saving
  - Notes: ________________________________________________

- [ ] **BK-D-41** Charges table shows: description, category, qty, unit price, line total
  - Notes: ________________________________________________

- [ ] **BK-D-42** Empty charges: "No charges yet"
  - Notes: ________________________________________________

- [ ] **BK-D-43** "Add Charge" button visible only when status = `checked_in`
  - Notes: ________________________________________________

### Invoice Generation

- [ ] **BK-D-44** Generate Invoice → success → print dialog opens with invoice preview
  - Notes: ________________________________________________

- [ ] **BK-D-45** Invoice shows: guest name, room, check-in, check-out dates
  - Notes: ________________________________________________

- [ ] **BK-D-46** Invoice shows: room charges, add-on charges, surcharge (if > 0), grand total
  - Notes: ________________________________________________

- [ ] **BK-D-47** Grand total = (room + addon) × (1 + surcharge% / 100) — **verify with manual calculation**
  - Notes: ________________________________________________

- [ ] **BK-D-48** Surcharge line hidden when surcharge = 0%
  - Notes: ________________________________________________

- [ ] **BK-D-49** "Print Invoice" button opens print-ready HTML in new tab
  - Notes: ________________________________________________

- [ ] **BK-D-50** Pop-up blocker case: toast "Pop-up blocked. Allow pop-ups and try again."
  - Notes: ________________________________________________

- [ ] **BK-D-51** Invoice status = `issued`, `issued_at` set to current time
  - Notes: ________________________________________________

- [ ] **BK-D-52** Second "Generate Invoice" on same booking updates existing invoice (not duplicate)
  - Notes: ________________________________________________

- [ ] **BK-D-53** Invoice card appears below charges after generation
  - Notes: ________________________________________________

- [ ] **BK-D-54** Invoice add-on total includes: board_total + equipment + transfers + charges — **cross-check with manual sum**
  - Notes: ________________________________________________

### Payments

- [ ] **BK-D-55** Record Payment button hidden when status = `checked_out`
  - Notes: ________________________________________________

- [ ] **BK-D-56** Record Payment dialog: amount > 0 validated
  - Notes: ________________________________________________

- [ ] **BK-D-57** Method options: cash, bank_transfer, card_payhere
  - Notes: ________________________________________________

- [ ] **BK-D-58** Record Payment → success toast, payment appears in table
  - Notes: ________________________________________________

- [ ] **BK-D-59** Payments table: amount, method, status, date
  - Notes: ________________________________________________

- [ ] **BK-D-60** Payment with `invoice_id` → invoice status becomes `paid`
  - Notes: ________________________________________________

- [ ] **BK-D-61** "No payments recorded" shown when empty
  - Notes: ________________________________________________

- [ ] **BK-D-62** Refund button visible only for `card_payhere` + `completed` payments
  - Notes: ________________________________________________

- [ ] **BK-D-63** Refund PayHere → payment status → `refunded`, toast success
  - Notes: ________________________________________________

- [ ] **BK-D-64** Refund when no PayHere payment ID → error "PayHere payment ID missing"
  - Notes: ________________________________________________

- [ ] **BK-D-65** Double-click refund does not process twice (loading state disables button)
  - Notes: ________________________________________________

### Move Room

- [ ] **BK-D-66** Move Room dialog shows current room number and category
  - Notes: ________________________________________________

- [ ] **BK-D-67** Available rooms: excludes current room, excludes rooms booked for overlapping dates
  - Notes: ________________________________________________

- [ ] **BK-D-68** Only active rooms shown
  - Notes: ________________________________________________

- [ ] **BK-D-69** Select a room → "Confirm Move" enabled
  - Notes: ________________________________________________

- [ ] **BK-D-70** Confirm without selection → error "Select a room"
  - Notes: ________________________________________________

- [ ] **BK-D-71** Successful move → toast "Room changed", page refreshes with new room
  - Notes: ________________________________________________

- [ ] **BK-D-72** No available rooms → "No available rooms for these dates"
  - Notes: ________________________________________________

- [ ] **BK-D-73** Room occupied by cancelled/no-show booking → still shows as available (only confirmed/checked_in/pending block)
  - Notes: ________________________________________________

- [ ] **BK-D-74** Cross-check: new room_id saved in DB
  - Notes: ________________________________________________

---

## 7. Quick Check-in Sheet (Overview)

- [ ] **QC-01** Opens with confirmed bookings where check_in <= today, ordered by check_in
  - Notes: ________________________________________________

- [ ] **QC-02** Dropdown shows "Room — Guest Name"
  - Notes: ________________________________________________

- [ ] **QC-03** NIC/Passport field is optional
  - Notes: ________________________________________________

- [ ] **QC-04** Confirm Check-in → booking status → `checked_in`, toast success
  - Notes: ________________________________________________

- [ ] **QC-05** NIC/Passport entered → guest record updated
  - Notes: ________________________________________________

- [ ] **QC-06** Empty NIC → check-in still succeeds
  - Notes: ________________________________________________

- [ ] **QC-07** No pending check-ins → "No pending check-ins"
  - Notes: ________________________________________________

- [ ] **QC-08** Without selecting booking → error "Select a booking"
  - Notes: ________________________________________________

- [ ] **QC-09** After check-in, overview stats update (arrivals decrease, occupancy changes)
  - Notes: ________________________________________________

- [ ] **QC-10** Sheet resets on close (selection and NIC cleared)
  - Notes: ________________________________________________

---

## 8. Quick Check-out Sheet (Overview)

- [ ] **QCO-01** Opens with checked-in bookings where check_in <= today
  - Notes: ________________________________________________

- [ ] **QCO-02** Selecting booking loads invoice/charges/payments summary
  - Notes: ________________________________________________

- [ ] **QCO-03** Shows room charges, add-on charges, surcharge, grand total
  - Notes: ________________________________________________

- [ ] **QCO-04** Shows paid total and balance due
  - Notes: ________________________________________________

- [ ] **QCO-05** Balance due shown in red when > 0
  - Notes: ________________________________________________

- [ ] **QCO-06** "Collect Payment" button appears only when balance > 0
  - Notes: ________________________________________________

- [ ] **QCO-07** Collect Payment: enter amount, choose method, process
  - Notes: ________________________________________________

- [ ] **QCO-08** Payment recorded with status `completed`, paid_at set
  - Notes: ________________________________________________

- [ ] **QCO-09** Complete Check-out → booking status → `checked_out`, toast success
  - Notes: ________________________________________________

- [ ] **QCO-10** Check-out with balance due (no payment collected) → still allowed (hotel policy?)
  - Notes: ________________________________________________

- [ ] **QCO-11** Without selecting booking → button disabled or error
  - Notes: ________________________________________________

- [ ] **QCO-12** No checked-in guests → "No checked-in guests"
  - Notes: ________________________________________________

- [ ] **QCO-13** Cross-check: balance math matches invoice total minus payments
  - Notes: ________________________________________________

- [ ] **QCO-14** Room becomes "Dirty" after check-out (housekeeping status)
  - Notes: ________________________________________________

---

## 9. Mark Room Clean Sheet (Overview)

- [ ] **MC-01** Opens with rooms where housekeeping is `dirty` or `cleaning`
  - Notes: ________________________________________________

- [ ] **MC-02** Dropdown shows room number, category, current status badge
  - Notes: ________________________________________________

- [ ] **MC-03** "Mark as Ready" → room housekeeping → `ready`, toast success
  - Notes: ________________________________________________

- [ ] **MC-04** Without selection → error "Select a room"
  - Notes: ________________________________________________

- [ ] **MC-05** All rooms clean → "All rooms are clean"
  - Notes: ________________________________________________

- [ ] **MC-06** Retired rooms not shown
  - Notes: ________________________________________________

- [ ] **MC-07** Sheet resets on close/reopen
  - Notes: ________________________________________________

---

## 10. Guests List (`/dashboard/guests`)

- [ ] **GS-01** Table loads all guests, newest first
  - Notes: ________________________________________________

- [ ] **GS-02** Columns: Full Name, NIC/Passport, Nationality, Email, Phone, Created At
  - Notes: ________________________________________________

- [ ] **GS-03** Search filters by name (case-insensitive, partial match)
  - Notes: ________________________________________________

- [ ] **GS-04** Search filters by email
  - Notes: ________________________________________________

- [ ] **GS-05** Search filters by phone
  - Notes: ________________________________________________

- [ ] **GS-06** Search with no results → "No guests found."
  - Notes: ________________________________________________

- [ ] **GS-07** Export CSV → downloads `guests.csv` with correct headers
  - Notes: ________________________________________________

- [ ] **GS-08** CSV includes only currently filtered results (if search active)
  - Notes: ________________________________________________

- [ ] **GS-09** CSV handles null fields (NIC, email, phone) as empty strings
  - Notes: ________________________________________________

- [ ] **GS-10** CSV escapes quotes in names correctly
  - Notes: ________________________________________________

- [ ] **GS-11** Clicking guest name → navigates to profile page
  - Notes: ________________________________________________

- [ ] **GS-12** Null fields show "—" in table
  - Notes: ________________________________________________

---

## 11. Guest Profile (`/dashboard/guests/[id]`)

- [ ] **GP-01** Page loads with guest name and "Guest since [date]"
  - Notes: ________________________________________________

- [ ] **GP-02** Contact card: email, phone, NIC/passport, nationality (nulls show "—")
  - Notes: ________________________________________________

- [ ] **GP-03** Total Spent card = sum of all booking room_total_usd
  - Notes: ________________________________________________

- [ ] **GP-04** Total Paid card = sum of completed payments across all bookings
  - Notes: ________________________________________________

- [ ] **GP-05** Outstanding card = Total Spent − Total Paid
  - Notes: ________________________________________________

- [ ] **GP-06** Outstanding > 0 → shown in red (destructive color)
  - Notes: ________________________________________________

- [ ] **GP-07** Outstanding = 0 → not red
  - Notes: ________________________________________________

- [ ] **GP-08** Booking history table shows count in title "(N)"
  - Notes: ________________________________________________

- [ ] **GP-09** Each booking row: room, dates, status badge, total
  - Notes: ________________________________________________

- [ ] **GP-10** Clicking booking row → navigates to booking detail
  - Notes: ________________________________________________

- [ ] **GP-11** No bookings → "No previous bookings"
  - Notes: ________________________________________________

- [ ] **GP-12** "Back to Guests" → returns to guest list
  - Notes: ________________________________________________

- [ ] **GP-13** "New Booking for [Name]" → navigates to `/dashboard/bookings/new`
  - Notes: ________________________________________________

- [ ] **GP-14** Invalid guest ID → 404
  - Notes: ________________________________________________

- [ ] **GP-15** Cross-check: Total Spent matches sum of `room_total_usd` in DB
  - Notes: ________________________________________________

---

## 12. Operations Timeline (`/dashboard/operations`)

- [ ] **OP-01** Page loads with "Today's Operations" header
  - Notes: ________________________________________________

- [ ] **OP-02** Arrivals section: bookings checking in today (confirmed/checked_in), time = 14:00
  - Notes: ________________________________________________

- [ ] **OP-03** Departures section: bookings checking out today (checked_in/checked_out), time = 11:00
  - Notes: ________________________________________________

- [ ] **OP-04** Transfers: scheduled transfers today, actual datetime shown
  - Notes: ________________________________________________

- [ ] **OP-05** Equipment returns: active rentals with end_date = today, time = 12:00
  - Notes: ________________________________________________

- [ ] **OP-06** All events sorted by time ascending
  - Notes: ________________________________________________

- [ ] **OP-07** Correct icons: arrival (arrow down), departure (arrow up), transfer (car), equipment (bike)
  - Notes: ________________________________________________

- [ ] **OP-08** Transfer shows airport name and flight number (if present)
  - Notes: ________________________________________________

- [ ] **OP-09** Equipment shows guest name and unit label
  - Notes: ________________________________________________

- [ ] **OP-10** No events today → "No events today"
  - Notes: ________________________________________________

- [ ] **OP-11** More than 15 events → shows first 15 + "+N more events"
  - Notes: ________________________________________________

- [ ] **OP-12** Completed/cancelled transfers not shown (only `scheduled`)
  - Notes: ________________________________________________

- [ ] **OP-13** Returned equipment not shown (only `active`)
  - Notes: ________________________________________________

---

## 13. Housekeeping (`/dashboard/housekeeping`)

### Room Cards

- [ ] **HK-01** All active rooms displayed as cards in responsive grid (2/3/5 columns)
  - Notes: ________________________________________________

- [ ] **HK-02** Each card: room number, status badge, category name
  - Notes: ________________________________________________

- [ ] **HK-03** Status badge colors: Dirty (destructive), Cleaning (secondary), Ready (default)
  - Notes: ________________________________________________

- [ ] **HK-04** Retired rooms not shown
  - Notes: ________________________________________________

### Status Updates

- [ ] **HK-05** Dirty room: can click "Cleaning" and "Ready" buttons
  - Notes: ________________________________________________

- [ ] **HK-06** Dirty room: "Dirty" button disabled (already dirty)
  - Notes: ________________________________________________

- [ ] **HK-07** Cleaning room: can click "Ready" and "Dirty"
  - Notes: ________________________________________________

- [ ] **HK-08** Ready room: can click "Dirty" and "Cleaning"
  - Notes: ________________________________________________

- [ ] **HK-09** Status update → toast "Room X marked as [status]"
  - Notes: ________________________________________________

- [ ] **HK-10** Status update → page refreshes, badge changes
  - Notes: ________________________________________________

- [ ] **HK-11** Double-click does not send duplicate requests (button disabled during update)
  - Notes: ________________________________________________

- [ ] **HK-12** Housekeeping role can update statuses (server action accepts any staff)
  - Notes: ________________________________________________

### Report Issue

- [ ] **HK-13** "Report Issue" button opens dialog with room number in title
  - Notes: ________________________________________________

- [ ] **HK-14** Description field required — submit disabled when empty
  - Notes: ________________________________________________

- [ ] **HK-15** Priority options: Low, Normal, High, Urgent
  - Notes: ________________________________________________

- [ ] **HK-16** Submit → creates `maintenance_requests` row with status `open`
  - Notes: ________________________________________________

- [ ] **HK-17** Toast "Maintenance issue reported"
  - Notes: ________________________________________________

- [ ] **HK-18** Cancel closes dialog and clears description
  - Notes: ________________________________________________

- [ ] **HK-19** Cross-check: new request appears in Admin panel Maintenance section
  - Notes: ________________________________________________

- [ ] **HK-20** `reported_by_staff_id` set to current user (if implemented — verify in DB)
  - Notes: ________________________________________________

---

## 14. Equipment Rentals (`/dashboard/equipment`)

- [ ] **EQ-01** Panel loads with active rentals count and "New Rental" button
  - Notes: ________________________________________________

- [ ] **EQ-02** New Rental dialog: Category select shows all categories with daily price
  - Notes: ________________________________________________

- [ ] **EQ-03** After selecting category, Unit dropdown shows only that category's units
  - Notes: ________________________________________________

- [ ] **EQ-04** Retired units excluded from unit dropdown
  - Notes: ________________________________________________

- [ ] **EQ-05** Guest dropdown shows guest name (and email if present)
  - Notes: ________________________________________________

- [ ] **EQ-06** Start date and end date required
  - Notes: ________________________________________________

- [ ] **EQ-07** End date >= start date validation: "End date must be on or after start date"
  - Notes: ________________________________________________

- [ ] **EQ-08** Price calculated = days × category price_per_day
  - Notes: ________________________________________________

- [ ] **EQ-09** Create Rental → success toast, appears in active rentals table
  - Notes: ________________________________________________

- [ ] **EQ-10** Availability: requesting already-booked unit for same dates handled (verify RPC is called or not — **potential gap**: panel may not check availability)
  - Notes: ________________________________________________

- [ ] **EQ-11** Active rentals table: Guest, Unit, Dates, Price, Status, Return button
  - Notes: ________________________________________________

- [ ] **EQ-12** Return button → status → `removed` from active list, toast "Equipment returned"
  - Notes: ________________________________________________

- [ ] **EQ-13** Returned rental status in DB = `returned`
  - Notes: ________________________________________________

- [ ] **EQ-14** No rentals → "No rentals."
  - Notes: ________________________________________________

- [ ] **EQ-15** Cross-check: price matches days × rate in DB
  - Notes: ________________________________________________

---

## 15. Airport Transfers (`/dashboard/transfers`)

- [ ] **TR-01** Panel loads with date filter (defaults to today) and "New Transfer" button
  - Notes: ________________________________________________

- [ ] **TR-02** Date filter shows only transfers on selected date
  - Notes: ________________________________________________

- [ ] **TR-03** New Transfer dialog opens
  - Notes: ________________________________________________

- [ ] **TR-04** Route dropdown shows airport name and fixed price
  - Notes: ________________________________________________

- [ ] **TR-05** Inactive routes not shown (filtered by `active = true`)
  - Notes: ________________________________________________

- [ ] **TR-06** Guest dropdown shows all guests by name
  - Notes: ________________________________________________

- [ ] **TR-07** Direction options: Arrival (Airport → Hotel), Departure (Hotel → Airport)
  - Notes: ________________________________________________

- [ ] **TR-08** Flight number optional
  - Notes: ________________________________________________

- [ ] **TR-09** Date & Time required — validation error if empty
  - Notes: ________________________________________________

- [ ] **TR-10** Create Transfer → price auto-set from route's fixed_price_usd
  - Notes: ________________________________________________

- [ ] **TR-11** New transfer status = `scheduled`
  - Notes: ________________________________________________

- [ ] **TR-12** Success toast "Transfer created"
  - Notes: ________________________________________________

- [ ] **TR-13** Table: Guest, Direction (with plane icon), Flight, Time, Route, Status badge
  - Notes: ________________________________________________

- [ ] **TR-14** Scheduled transfers show "Done" and "Cancel" action buttons
  - Notes: ________________________________________________

- [ ] **TR-15** "Done" → status → `completed`, toast success
  - Notes: ________________________________________________

- [ ] **TR-16** "Cancel" (X) → status → `cancelled`, toast success
  - Notes: ________________________________________________

- [ ] **TR-17** Completed/cancelled transfers → no action buttons
  - Notes: ________________________________________________

- [ ] **TR-18** Status badge: scheduled (outline), completed (default), cancelled (destructive)
  - Notes: ________________________________________________

- [ ] **TR-19** No transfers for date → "No transfers for this date."
  - Notes: ________________________________________________

- [ ] **TR-20** Date filter on past date shows historical transfers
  - Notes: ________________________________________________

---

## 16. Admin Panel (`/dashboard/admin`) — Admin Only

### Staff Accounts

- [ ] **AD-01** Table lists all staff: Name, Role, Status badge, Action button
  - Notes: ________________________________________________

- [ ] **AD-02** Active staff shows "Deactivate" (destructive button)
  - Notes: ________________________________________________

- [ ] **AD-03** Inactive staff shows "Activate" (outline button)
  - Notes: ________________________________________________

- [ ] **AD-04** Deactivate → status badge changes to "Inactive", toast success
  - Notes: ________________________________________________

- [ ] **AD-05** Activate → status badge changes to "Active", toast success
  - Notes: ________________________________________________

- [ ] **AD-06** Cross-check: deactivated staff cannot access dashboard (login as them)
  - Notes: ________________________________________________

- [ ] **AD-07** Staff with no full_name shows capitalized role as fallback name
  - Notes: ________________________________________________

### Room Categories — Pricing

- [ ] **AD-08** All categories listed with editable price inputs
  - Notes: ________________________________________________

- [ ] **AD-09** Input shows current base_price_usd
  - Notes: ________________________________________________

- [ ] **AD-10** Enter price < 0 → validation error "Price must be 0 or higher"
  - Notes: ________________________________________________

- [ ] **AD-11** Save Pricing → all prices updated, toast "Prices updated"
  - Notes: ________________________________________________

- [ ] **AD-12** Cross-check: new booking uses updated price
  - Notes: ________________________________________________

- [ ] **AD-13** Price = 0 allowed (free room?)
  - Notes: ________________________________________________

### Room Management

- [ ] **AD-14** Room table: Room number, Category, Status badge, Action button
  - Notes: ________________________________________________

- [ ] **AD-15** Active room → "Retire" button (destructive)
  - Notes: ________________________________________________

- [ ] **AD-16** Retired room → "Activate" button (outline)
  - Notes: ________________________________________________

- [ ] **AD-17** Retire → status changes to `retired`, toast success
  - Notes: ________________________________________________

- [ ] **AD-18** Add Room: enter room number, select category → inserts room
  - Notes: ________________________________________________

- [ ] **AD-19** Add Room without number → error "Room number is required"
  - Notes: ________________________________________________

- [ ] **AD-20** Add Room without category → error "Category is required"
  - Notes: ________________________________________________

- [ ] **AD-21** Duplicate room number → DB constraint error shown as toast
  - Notes: ________________________________________________

- [ ] **AD-22** New room default operational_status = `active`, housekeeping = `dirty`
  - Notes: ________________________________________________

- [ ] **AD-23** Retired room disappears from booking form selector
  - Notes: ________________________________________________

### Hotel Settings

- [ ] **AD-24** Check-in time picker loads current value
  - Notes: ________________________________________________

- [ ] **AD-25** Check-out time picker loads current value
  - Notes: ________________________________________________

- [ ] **AD-26** Surcharge % input loads current value
  - Notes: ________________________________________________

- [ ] **AD-27** Min Deposit % input loads current value
  - Notes: ________________________________________________

- [ ] **AD-28** Surcharge % out of range (negative or > 100) → validation error
  - Notes: ________________________________________________

- [ ] **AD-29** Min Deposit % out of range → validation error
  - Notes: ________________________________________________

- [ ] **AD-30** Save Settings → toast "Settings saved"
  - Notes: ________________________________________________

- [ ] **AD-31** Cross-check: changed surcharge% reflected on next invoice generation
  - Notes: ________________________________________________

- [ ] **AD-32** Cross-check: changed min deposit% reflected on booking detail deposit calculation
  - Notes: ________________________________________________

- [ ] **AD-33** Time format saved correctly (HH:MM:00 in DB)
  - Notes: ________________________________________________

### Maintenance Requests

- [ ] **AD-34** Table shows only open/in_progress requests (resolved/closed hidden)
  - Notes: ________________________________________________

- [ ] **AD-35** Columns: Room, Issue, Priority badge, Status badge, Reported By, Resolve button
  - Notes: ________________________________________________

- [ ] **AD-36** Priority badges: urgent (destructive), high (default), normal/low (secondary)
  - Notes: ________________________________________________

- [ ] **AD-37** Status badges: open (destructive), in_progress (secondary)
  - Notes: ________________________________________________

- [ ] **AD-38** Resolve button → status = `resolved`, resolved_at set, row removed from list (filtered out)
  - Notes: ________________________________________________

- [ ] **AD-39** Toast "Marked resolved"
  - Notes: ________________________________________________

- [ ] **AD-40** Resolved request → no Resolve button shown
  - Notes: ________________________________________________

- [ ] **AD-41** Empty state: "No maintenance requests"
  - Notes: ________________________________________________

- [ ] **AD-42** `resolved_by_staff_id` — verify it's set (or note if gap)
  - Notes: ________________________________________________

### Equipment Units

- [ ] **AD-43** Table: Label, Category, Condition badge, Delete button
  - Notes: ________________________________________________

- [ ] **AD-44** Condition badges: good (default), needs_maintenance (destructive)
  - Notes: ________________________________________________

- [ ] **AD-45** Retire unit → condition = `retired`, row removed from list, toast success
  - Notes: ________________________________________________

- [ ] **AD-46** Retired units excluded from equipment rental selector
  - Notes: ________________________________________________

- [ ] **AD-47** Add Unit: label + category → inserts with condition `good`
  - Notes: ________________________________________________

- [ ] **AD-48** Add Unit without label → validation error
  - Notes: ________________________________________________

- [ ] **AD-49** Add Unit without category → validation error
  - Notes: ________________________________________________

- [ ] **AD-50** Category dropdown in Add Unit shows room categories (NOTE: this may be a bug — should show equipment categories. Verify!)
  - Notes: ________________________________________________

### Contact Messages

- [ ] **AD-51** Table: Date, Name, Email, Message (truncated), Status badge, Action
  - Notes: ________________________________________________

- [ ] **AD-52** Unread messages highlighted with subtle background
  - Notes: ________________________________________________

- [ ] **AD-53** "Mark read" → badge → "Read", background cleared
  - Notes: ________________________________________________

- [ ] **AD-54** "Mark unread" → badge → "New", background restored
  - Notes: ________________________________________________

- [ ] **AD-55** Status badge: New (default), Read (secondary)
  - Notes: ________________________________________________

- [ ] **AD-56** Empty state: "No messages yet"
  - Notes: ________________________________________________

- [ ] **AD-57** Long messages truncated (not breaking layout)
  - Notes: ________________________________________________

---

## 17. End-to-End Workflows

### WF-01: Full Walk-in Guest Stay

- [ ] Create walk-in booking for today → status `confirmed`
  - Notes: ________________________________________________

- [ ] Booking appears on Overview (Arriving) and Calendar
  - Notes: ________________________________________________

- [ ] Check In from booking detail (with NIC) → status `checked_in`
  - Notes: ________________________________________________

- [ ] Room status on Overview → "Occupied"
  - Notes: ________________________________________________

- [ ] Post 2 charges (dinner \$45 meal, airport taxi \$30 transport)
  - Notes: ________________________________________________

- [ ] Generate Invoice → verify grand total = room + charges + surcharge (manual math)
  - Notes: ________________________________________________

- [ ] Record full payment (cash) → invoice status → `paid`
  - Notes: ________________________________________________

- [ ] Check Out → status `checked_out`
  - Notes: ________________________________________________

- [ ] Room becomes "Dirty" on Overview
  - Notes: ________________________________________________

- [ ] Housekeeping marks room: Dirty → Cleaning → Ready
  - Notes: ________________________________________________

- [ ] Room shows "Vacant" on Overview
  - Notes: ________________________________________________

- [ ] Operations timeline today: arrival (14:00) + departure (11:00) appear
  - Notes: ________________________________________________

### WF-02: OTA Booking with Bank Transfer

- [ ] Create booking with source "OTA (Manual)" + OTA name → status `confirmed` (dashboard creates confirmed, not pending_payment)
  - Notes: ________________________________________________

- [ ] NOTE: Dashboard form creates `confirmed` directly. Online website bookings create `pending_payment`. Test online flow separately if applicable.
  - Notes: ________________________________________________

- [ ] For `pending_payment` with bank_transfer: Confirm Payment button works
  - Notes: ________________________________________________

- [ ] Booking → `confirmed` after confirmation
  - Notes: ________________________________________________

### WF-03: Multi-room Group Booking

- [ ] Create booking with 2 rooms → shared `group_booking_id`
  - Notes: ________________________________________________

- [ ] Both bookings appear in list and calendar
  - Notes: ________________________________________________

- [ ] Guest created once (not duplicated)
  - Notes: ________________________________________________

- [ ] Equipment linked to first booking only (verify this is correct behavior)
  - Notes: ________________________________________________

### WF-04: Cancellation

- [ ] Cancel a `confirmed` booking → status `cancelled`
  - Notes: ________________________________________________

- [ ] Cancelled booking disappears from Calendar
  - Notes: ________________________________________________

- [ ] Cancelled booking does not block room availability for new bookings
  - Notes: ________________________________________________

- [ ] Related equipment rental — verify status (gap check)
  - Notes: ________________________________________________

- [ ] Related transfer — verify status (gap check)
  - Notes: ________________________________________________

### WF-05: Room Move

- [ ] Check in a guest → Move Room → select available room → confirm
  - Notes: ________________________________________________

- [ ] Booking detail shows new room number
  - Notes: ________________________________________________

- [ ] Old room available for new bookings
  - Notes: ________________________________________________

- [ ] Calendar shows booking in new room
  - Notes: ________________________________________________

### WF-06: Equipment Rental Lifecycle

- [ ] Create equipment rental (new rental panel) → status `active`
  - Notes: ________________________________________________

- [ ] Rental appears in Operations timeline if end_date = today
  - Notes: ________________________________________________

- [ ] Return → status `returned`
  - Notes: ________________________________________________

- [ ] Unit available for new rental
  - Notes: ________________________________________________

### WF-07: Transfer Lifecycle

- [ ] Create arrival transfer → status `scheduled`
  - Notes: ________________________________________________

- [ ] Appears in Operations timeline for that date
  - Notes: ________________________________________________

- [ ] Mark Done → status `completed`
  - Notes: ________________________________________________

- [ ] Create departure transfer → mark Done
  - Notes: ________________________________________________

### WF-08: PayHere Refund Flow

- [ ] Booking with completed `card_payhere` payment → Refund button visible
  - Notes: ________________________________________________

- [ ] Click Refund → PayHere API called → payment status `refunded`
  - Notes: ________________________________________________

- [ ] Toast success
  - Notes: ________________________________________________

- [ ] Second refund attempt → error "No completed PayHere payment found"
  - Notes: ________________________________________________

### WF-09: Maintenance Report → Admin Resolution

- [ ] Housekeeping reports issue on room → `maintenance_requests` created
  - Notes: ________________________________________________

- [ ] Admin panel shows request in Maintenance section
  - Notes: ________________________________________________

- [ ] Admin clicks Resolve → status `resolved`, removed from list
  - Notes: ________________________________________________

---

## 18. Edge Cases & Error Handling

- [ ] **EC-01** Network offline → error toasts, no white screen crash
  - Notes: ________________________________________________

- [ ] **EC-02** Invalid UUID in URL (`/dashboard/bookings/not-a-uuid`) → 404, no crash
  - Notes: ________________________________________________

- [ ] **EC-03** Very long guest name (100 chars) → layout not broken
  - Notes: ________________________________________________

- [ ] **EC-04** Very long description/notes → layout not broken
  - Notes: ________________________________________________

- [ ] **EC-05** Negative payment amount rejected by validation
  - Notes: ________________________________________________

- [ ] **EC-06** Charge with qty=0 → rejected
  - Notes: ________________________________________________

- [ ] **EC-07** Double-click any submit button → no duplicate records
  - Notes: ________________________________________________

- [ ] **EC-08** Two browsers: book same room simultaneously → second gets conflict error
  - Notes: ________________________________________________

- [ ] **EC-09** Booking with all-null optional guest fields → renders "—" not crash
  - Notes: ________________________________________________

- [ ] **EC-10** Payment amount = 0.01 (minimum) → accepted
  - Notes: ________________________________________________

- [ ] **EC-11** Surcharge = 0% → invoice has no surcharge line
  - Notes: ________________________________________________

- [ ] **EC-12** Min deposit = 0% → deposit card shows met immediately
  - Notes: ________________________________________________

- [ ] **EC-13** Check-in date = today (same day booking) → works
  - Notes: ________________________________________________

- [ ] **EC-14** Booking ending today still shows in calendar today
  - Notes: ________________________________________________

- [ ] **EC-15** Equipment end_date in the past still allows Return button
  - Notes: ________________________________________________

---

## 19. Performance & Responsiveness

- [ ] **PF-01** Overview loads in < 2 seconds on local
  - Notes: ________________________________________________

- [ ] **PF-02** Calendar with 30 rooms × 30 days renders without lag
  - Notes: ________________________________________________

- [ ] **PF-03** Guest search filters responsively with 100+ guests
  - Notes: ________________________________________________

- [ ] **PF-04** Mobile (375px): sidebar collapses to hamburger menu
  - Notes: ________________________________________________

- [ ] **PF-05** Mobile: all forms usable, no horizontal overflow
  - Notes: ________________________________________________

- [ ] **PF-06** Loading skeletons shown while data fetches
  - Notes: ________________________________________________

- [ ] **PF-07** Toast notifications appear and auto-dismiss
  - Notes: ________________________________________________

- [ ] **PF-08** Keyboard: can tab through form fields and press Enter to submit
  - Notes: ________________________________________________

---

## 20. Smoke Test (Run After Every Deploy)

- [ ] Login as admin → Overview loads with data
- [ ] Create booking → appears in Calendar and Overview
- [ ] Check In → room shows Occupied
- [ ] Post charge → included in next invoice
- [ ] Generate invoice → print works
- [ ] Record payment → outstanding updates
- [ ] Check Out → room shows Dirty
- [ ] Housekeeping marks ready → Overview shows Vacant
- [ ] Admin changes price → new booking uses new price
- [ ] Equipment rental → return → unit available again
- [ ] Transfer create → complete → Operations timeline correct

**Notes:** ________________________________________________

---

## Bug Reports

> Copy this template for each failure.

```markdown
### Bug: [Test ID] - [Brief Title]
**Severity:** Critical / High / Medium / Low
**Module:** [Auth / Overview / Calendar / Bookings / Guests / Operations / Housekeeping / Equipment / Transfers / Admin]
**Role affected:** [Admin / Receptionist / Housekeeping / All]
**Status:** 🔴 Open / 🟡 In Progress / 🟢 Fixed / ⚪ Won't Fix

**Steps to Reproduce:**
1.
2.
3.

**Expected:**

**Actual:**

**Environment:** Local / Staging / Prod
**Browser:** Chrome / Firefox / Safari / Edge
**Screenshot / Video:**

**Notes:**
```

### Bug List

| # | Test ID | Severity | Summary | Status |
|---|---------|----------|---------|--------|
| 1 | | | | 🔴 |
| 2 | | | | 🔴 |
| 3 | | | | 🔴 |
| 4 | | | | 🔴 |
| 5 | | | | 🔴 |
| 6 | | | | 🔴 |
| 7 | | | | 🔴 |
| 8 | | | | 🔴 |
| 9 | | | | 🔴 |
| 10 | | | | 🔴 |

---

## Summary

| Section | Total Tests | Passed | Failed | Blocked | Not Run |
|---------|------------|--------|--------|---------|---------|
| Auth & Access Control | 10 | | | | |
| Overview | 32 | | | | |
| Calendar | 16 | | | | |
| Bookings List | 8 | | | | |
| New Booking | 41 | | | | |
| Booking Detail | 74 | | | | |
| Quick Check-in | 10 | | | | |
| Quick Check-out | 14 | | | | |
| Mark Clean | 7 | | | | |
| Guests List | 12 | | | | |
| Guest Profile | 15 | | | | |
| Operations | 13 | | | | |
| Housekeeping | 20 | | | | |
| Equipment | 15 | | | | |
| Transfers | 20 | | | | |
| Admin | 57 | | | | |
| End-to-End Workflows | 40+ | | | | |
| Edge Cases | 15 | | | | |
| Performance | 8 | | | | |
| Smoke Test | 11 | | | | |
| **TOTAL** | **~430** | | | | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Reviewer | | | |
