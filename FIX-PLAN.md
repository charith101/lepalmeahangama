# FIX-PLAN — Functional bug fixes from FEATURE-TEST-REPORT.md

> **Goal:** every functional 🐛/⚠️ defect in `FEATURE-TEST-REPORT.md` fixed with minimal, clean code.
> **Explicitly deferred (per owner):** security architecture (`uh01` `uh02` `uh03`), CSP (`N12`),
> visual contrast / Lighthouse cosmetics, perf tuning, owner-config items (PayHere merchant limit,
> deposit-% intent, footer email choice, extra transfer routes).
> **Rule:** nothing that works today may regress. Server pricing stays server-side. No new deps.

## Bug inventory → work packages

| WP | Bugs | Scope (files) |
|----|------|---------------|
| **W1 Core booking/payment actions** | `bk01` `bk02` `bk03` `N4`-server `py01` `py06` `cancelBooking` release `bk11` `bk12` | `src/lib/actions/bookings.ts`, `src/app/api/payhere/cancel/route.ts`, `src/app/api/payhere/notify/route.ts`, `src/lib/email.ts` |
| **W2 Billing actions** | `py02` `py03` `py04` | `src/lib/actions/billing.ts` |
| **W3 Rooms/maintenance actions** | `N1` `N2`-server `op17`-server `py05` `ad05`-server | `src/lib/actions/rooms.ts` (`requireAnyStaff`, move-room recompute), `src/lib/actions/maintenance.ts` (reporter, resolved_by) |
| **W4 Content pages** | `wb01` `wb02` `wb03` | `HotelIntroSection.tsx`, `experiences/page.tsx`, `dine/page.tsx`, `contact/page.tsx` (shared `?subject=`/`?experience=` prefill) |
| **W5 Calendar** | `op06` | `calendar/page.tsx`, `CalendarGrid.tsx` (all statuses, cancelled/no-show styling, legend, filter chips) |
| **W6 Equipment panel** | `op08` `op09` `op10` `N8` `N9`-equipment `15.8` | `EquipmentPanel.tsx`, `equipment/page.tsx` (availability pre-check via existing RPC, active-only count, confirm+friendly errors, guest dedup) |
| **W7 Transfers panel** | `op12` `N5` `16.8` | `TransferPanel.tsx`, `transfers/page.tsx`, new `src/lib/datetime.ts` (Asia/Colombo store+format helper), guest dedup |
| **W8 Admin panel** | `ad02` `ad05` `ad06` `ad08`-admin `N6` `N9`-rooms `N2`-display `N10`-labels `17.2` `17.14` `18.7` | `AdminPanel.tsx`, `admin/page.tsx` (+ contact DELETE policy migration) |
| **W9 Confirmation & portal** | `bk09` `N11` `5.4` `5.5` `5.10` `5.11` `5.13` `ad08`-guest | `booking/confirmation/[id]/page.tsx`, `booking/[ref]/page.tsx`, `booking-detail-client.tsx` |
| **W10 Overview & operations** | `N7`-pending `ds04`-buttons `op01` `op02` `op07` `N10`-timeline `9.9` `9.10` | `dashboard/(main)/page.tsx`, `RoomStatusBoard.tsx`, `RevenueCard.tsx`, `operations/page.tsx`, `OperationsTimeline.tsx` |
| **W11 Bookings list & form** | `ds03` `ds04` `ds05` | `bookings/page.tsx` (+ filters), `BookingForm.tsx`, `GuestProfile.tsx` |
| **W12 Guest profile totals** | `N7`-totals (`12.5` `12.6`) | `guests/[id]/page.tsx` (exclude cancelled/no-show; billed total incl. board/extras) |
| **W13 Booking wizard** | `bk01` `bk05` `bk02`-UI `bk03`-UI `N4`-race `bk04` `3.9` `1.10` | `booking/page.tsx`, `BookingWizard.tsx`, `DateStep.tsx` (qty race), `GuestDetailsStep.tsx`, `PaymentReview.tsx` |
| **W14 Booking detail & checkout** | `py01`-UI `py02`-UI `py03`-UI `py04`-UI `py05`-UI `py06`-UI `ds09` `11.10` | `BookingDetail.tsx`, `ChargeForm.tsx`, `InvoiceView.tsx`, `QuickCheckoutSheet.tsx` |
| **D1 DB (owner executes)** | `N3` `N5`-data `ad06`-policy | cron job rewrite (release `equipment_bookings`/`airport_transfers` on cancelled bookings — also sweeps historical orphans), transfer datetime +5:30 correction, `contact_messages` staff DELETE policy — via Supabase MCP migration + migration file in `supabase/migrations/` |

## Key design decisions (theory before code)

1. **N1** — `updateRoomHousekeepingStatus` + `reportMaintenanceIssue` switch `requireStaff()` → `requireAnyStaff()`
   (RLS already permits housekeeping on both; auth layer was the only blocker — verified).
2. **N3** — fix at *three* layers so orphans can never recur: cron sweep (DB, also cleans past orphans),
   `cancelBooking` action, PayHere cancel route. Equipment only touches `pending`; transfers only `scheduled`.
3. **bk03/N4** — client blocks payment with an explicit message when stock < requested (spec allows block),
   *and* server rejects mismatches (charged amount can never diverge from displayed amount).
   DateStep qty race: keep last known availability while a refetch is in flight instead of falling back to 99.
4. **N5** — one shared `src/lib/datetime.ts`: store input as `+05:30`, format all transfer times in
   `Asia/Colombo`; one-time data shift `transfer_datetime -= 5h30m` (all rows were written by the same bug).
5. **py02** — invoice stays `issued` until summed completed payments ≥ total; balance shown in UI.
6. **ds09** — single `checkOut` server action (generate invoice if absent + mark room dirty), used by both
   the detail page and QuickCheckoutSheet (consistency rule from spec).
7. **bk09/N11** — heading/subtitle derived from live status + small client `StatusRefresher` polling
   `router.refresh()` every 5 s while `pending_payment` (cap ~2 min); confirmation "Grand Total" sums the
   whole group (all rooms + extras + surcharge, mirroring `computeBookingTotal`); all datetimes formatted.
8. **N7 numbers** — pending check-ins = `confirmed AND check_in <= today AND check_out >= today`
   (stale months-old stays drop out); guest totals exclude `cancelled`/`no_show` and use billed amounts.
9. **ad06 delete** — needs a staff-only `DELETE` policy on `contact_messages` first (none exists today).

## Execution order (subagents, parallel where files don't overlap)

```
Pre:  owner adds schemas (validations.ts) + datetime helper + DB migrations (D1)
W1  W2  W3  W4  W5  W6  W7  W8  W9  W10  W11  W12      ← wave 1, disjoint files
W13 W14                                                   ← wave 2 (depend on W1/W2/W3 signatures)
Verify: npm run lint && npm test && npm run build
Then: browser re-test in Chrome DevTools MCP, then commit (no push).
```

## Verification per WP
- Type-checks via `npm run build`; `npm test` (vitest pricing suite) must stay green.
- Each fix re-tested in the browser afterwards: role logins (admin/reception/housekeeping), full booking
  wizard → PayHere → confirmation, money flows on a test booking, panels CRUD, calendar, ops timeline.

## Known exclusions (stated, not forgotten)
`uh01` `uh02` `uh03` (security — deferred by owner) · `N12` CSP · `color-contrast` (visual) ·
Lighthouse/lab perf · PayHere merchant cap (owner config) · `4.7` deposit-% intent (owner decision) ·
footer email discrepancy (content) · `16.7` more routes (data) · loading skeletons/kill-switch (env).
`ad03` seasonal rates = new feature, not a bug → out of scope.
