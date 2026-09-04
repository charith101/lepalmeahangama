# Le Palme Ahangama — Bug Report

Generated: 2026-09-04

---

## BUG-001: Dashboard missing motorbike/car rentals in booking form
- **Severity**: High
- **Location**: `src/components/dashboard/BookingForm.tsx`
- **Expected**: Dashboard new booking should offer motorbike (3 models) and car (8 models) rental, matching guest website options.
- **Actual**: Only surfboard and bicycle are available in dashboard booking form.
- **Reference**: Website extras at `src/components/public/ExtrasStep.tsx` has full motorbike/car options.

## BUG-002: Dashboard missing multi-room booking
- **Severity**: Medium
- **Location**: `src/components/dashboard/BookingForm.tsx`
- **Expected**: Ability to book multiple rooms in a single booking, like the guest website.
- **Actual**: Single room selection only (one roomId state variable).
- **Reference**: Website `DateStep.tsx` supports multiple room selections with quantities.

## BUG-003: Surfboard pricing differs between website and dashboard
- **Severity**: Medium
- **Location**:
  - Website: `src/components/public/ExtrasStep.tsx` (tiered: $25/day 1-6d, $14 7-13d, $12 14-20d, $10 21-29d, $8 30+d)
  - Dashboard: `src/components/dashboard/BookingForm.tsx` (flat $15/day)
- **Expected**: Consistent pricing across both interfaces.
- **Actual**: Website uses tiered pricing; dashboard uses flat rate.
- **Reference**: Constants at `src/lib/constants.ts` — `SURFBOARD_TIERS` vs `EQUIPMENT_SURFBOARD`.

## BUG-004: Guest data inconsistent — dashboard missing nationality/NIC fields
- **Severity**: Medium
- **Location**: `src/components/dashboard/BookingForm.tsx` (lines 48-51)
- **Expected**: Dashboard guest form should collect nationality and NIC/passport, matching website requirements.
- **Actual**: Dashboard only collects name, email, phone, notes. No nationality or NIC/passport fields.
- **Reference**: Website `GuestInfoStep.tsx` collects: fullName, email, phone, nationality, nic_passport.

## BUG-005: Dashboard hardcodes num_guests to 1
- **Severity**: Low
- **Location**: `src/components/dashboard/BookingForm.tsx` (booking creation logic)
- **Expected**: Allow specifying number of guests.
- **Actual**: Always set to 1.

## BUG-006: Airport transfer gap in dashboard
- **Severity**: Low
- **Location**: `src/app/dashboard/(main)/transfers/page.tsx`
- **Expected**: Transfers should be linkable to a specific booking.
- **Actual**: Transfers page exists but may not integrate with booking flow.

## BUG-007: Admin page accessible by Receptionist role
- **Severity**: High
- **Location**: `src/app/dashboard/(main)/admin/page.tsx` or layout route guard
- **Expected**: Admin page should be restricted to Admin role only. Receptionist should see a 403 or be redirected.
- **Actual**: Receptionist can access and modify admin settings (pricing, room management, staff accounts, hotel settings).
- **How to test**: Login as `receptionist`/`reception123`, navigate to `/dashboard/admin`.

## BUG-008: Admin staff accounts all show "Staff" as name
- **Severity**: Low
- **Location**: `src/app/dashboard/(main)/admin/page.tsx` (staff accounts section)
- **Expected**: Each staff entry should display the actual staff name (e.g., "admin", "receptionist").
- **Actual**: All 4 entries display "Staff" as the name.
- **How to test**: Login as admin, go to Admin Settings > Staff Accounts.

## BUG-009: Admin Equipment Units — category column shows full label instead of category
- **Severity**: Low
- **Location**: `src/app/dashboard/(main)/admin/page.tsx` (equipment units section)
- **Expected**: Category column should show "Car", "Motorbike", "Surfboard", "Bicycle".
- **Actual**: Shows full label like "Car — HONDA FIT GP5" in the category column.
- **How to test**: Login as admin, go to Admin Settings > Equipment Units.

## BUG-010: PayHere sandbox returns "Unauthorized payment request"
- **Severity**: High (blocks online payments)
- **Location**: `src/app/api/payhere/hash/route.ts` or PayHere sandbox config
- **Expected**: PayHere sandbox should process test payments successfully.
- **Actual**: Returns "Unauthorized payment request" error on button click.
- **Test card**: 4916211234567892, CVV 879, Exp 12/25
- **Merchant ID**: 1236547
- **Note**: Likely a sandbox account configuration issue, not a code bug.

---

## Guest Website Bugs

### BUG-W001: PayHere sandbox "Unauthorized payment request" error
- **Severity**: High (blocks all online payments)
- **Location**: `src/app/api/payhere/hash/route.ts`, `src/lib/payhere.ts`
- **Steps to reproduce**:
  1. Go to `/booking`
  2. Select dates (e.g., Sep 5-8), pick Deluxe room
  3. Select board plan, extras, fill guest info
  4. On Review step, click "Pay with PayHere"
  5. PayHere checkout opens but returns error immediately
- **Expected**: PayHere sandbox processes test payment with card 4916211234567892
- **Actual**: "Unauthorized payment request" error displayed
- **Root cause**: Likely sandbox merchant account config (Merchant ID 1236547) — may need hash generation fix or sandbox activation
- **Test credentials**: Card `4916211234567892`, CVV `879`, Exp `12/25`

### BUG-W002: Booking lookup requires exact email match
- **Severity**: Low
- **Location**: `src/app/booking/lookup/page.tsx`, `src/lib/actions/bookings.ts`
- **Steps to reproduce**:
  1. Go to `/booking/lookup`
  2. Enter a valid booking reference but wrong email
  3. Submit
- **Expected**: Show "Booking not found or email does not match" (current behavior is correct, but UX could be improved)
- **Actual**: Shows generic error — no indication whether booking exists but email is wrong
- **Note**: This is a security feature (prevents email enumeration) but could be confusing for users

---

## Additional Observations

### Contact form test message visible in Admin
- **Status**: Working as designed (not a bug)
- **Detail**: Public contact form submissions appear in Admin panel under "Contact Messages". Pipeline works correctly.

### Mobile responsiveness
- **Website**: Tested at 375px — works correctly
- **Dashboard**: Not tested yet — pending

### Dev server
- Running on `http://localhost:3000` (PID 35985)
- PayHere sandbox mode with Merchant ID `1236547`
