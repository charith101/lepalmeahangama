# Le Palme Ahangama — Security Findings Report

- **Date:** 2026-09-07
- **Scope:** Current local codebase (working tree = last commit `9c42919`) + production Supabase project `le-palme-ahangama-3` (live schema/policies as queried).
- **Verification:** Every issue below was re-confirmed against the live database (triggers, `pg_policies`, function grants) and the current source files on the same day this report was written.
- **Status:** All issues still present. None fixed.

| # | Severity | Issue | Where |
|---|----------|-------|-------|
| 1 | 🔴 CRITICAL | Privilege escalation at signup | DB trigger `handle_new_user` + RLS |
| 2 | 🔴 CRITICAL | Payment amount tampering / underpayment | `/api/payhere/*`, `bookings.ts`, `PaymentReview.tsx` |
| 3 | 🟠 HIGH | RLS too loose — staff data surface | DB policies |
| 4 | 🟠 HIGH | RPC functions executable by anon | DB grants |
| 5 | 🟡 MEDIUM | Missing security headers | `next.config.ts` |
| 6 | 🟡 MEDIUM | Leaked-password protection disabled | Supabase Auth setting |
| 7 | 🟡 MEDIUM | Session refresh cookie persistence broken | `src/lib/supabase/server.ts` |
| 8 | 🟡 MEDIUM | No login rate limiting | `/auth/login` + Supabase Auth |

---

## 1. 🔴 CRITICAL — Privilege escalation at signup

**Live SQL for `public.handle_new_user()` (SECURITY DEFINER):**

```sql
insert into public.profiles (id, full_name, role)
values (
  new.id,
  coalesce(new.raw_user_meta_data ->> 'full_name', 'Staff'),
  coalesce((new.raw_user_meta_data ->> 'role')::public.staff_role, 'receptionist'::public.staff_role)
);
```

**Why it's exploitable today**
- `raw_user_meta_data` is supplied by the user at signup time. Supabase Auth passes it straight through from `signup({ data: {...} })` — it is NOT trusted input.
- The trigger takes the role from that user-controlled field: `role: 'admin'` in metadata → full admin.
- The default fallback is `receptionist` — so even a plain signup with no role gives every new user access to the whole staff data surface (see #3).
- There is **no signup UI** in the app (`src/app/auth/` only has `login` and `callback`), but the Supabase Auth endpoint `POST /auth/v1/signup` is public because the Email provider allows new users. Anyone can self-register without any UI.
- RLS makes it worse: `bookings`, `guests`, `invoices`, `payments`, `booking_charges` all allow any `authenticated` user with `get_staff_role() <> 'housekeeping'` to SELECT/INSERT/UPDATE. With #1, that set = every self-registered account.

**Realistic attack**
```
POST {project}/auth/v1/signup
{ "email": "attacker@x.com", "password": "…", "data": { "role": "admin" } }
→ profile.id=attacker, role=admin
→ full admin: edit pricing, settings, rooms, staff accounts, read all guest PII.
```

**Recommended fix (do in order)**
1. **Block the root cause — disable public signup.** In Supabase Dashboard → Auth → Providers → Email: turn **off "Allow new users to sign up"**. The app has no signup flow, so this breaks nothing.
2. Rewrite the trigger so role is never read from `raw_user_meta_data`. If staff are admin-created via the service role / admin SDK, derive the role from what admin set (e.g. `raw_app_meta_data`), else default to a **non-privileged** state.
3. Add a staff-creation path that is admin-gated (admin panel page) and creates the Auth user + profile server-side with an explicit role.
4. Delete or deactivate any profiles created by the (pre-fix) public signup if any unintended accounts exist.
5. Defense-in-depth: tighten RLS (see #3) so no "default" role grants broad access.

---

## 2. 🔴 CRITICAL — Payment amount tampering / underpayment fraud

**Evidence (current source)**
- `src/app/api/payhere/hash/route.ts` — `POST`, **no authentication**, signs whatever it's given:
  ```ts
  const { order_id, amount, currency } = await request.json()
  // only checks amount > 0 — never verifies order_id is a real booking or amount matches it
  const hash = generateHash(merchantId, order_id, String(amountNum), currency, merchantSecret)
  ```
- `src/lib/actions/bookings.ts`
  - `:235` `return { data: { bookingIds, groupBookingId, grandTotal: data.grand_total_usd ?? 0 } }` — client-supplied grand total passed through unvalidated.
  - `:95`/`:216` `price_usd: eq.price_usd ?? 0` — equipment prices come from the client request body.
  - `:108`/`:229` `price_usd: data.transfer.price_usd ?? 0` — transfer price client-supplied.
  - The client can also send its own `price_usd` for equipment/transfers; nothing cross-checks against `equipment_categories.price_per_day_usd` or the transfers table.
- `src/components/public/PaymentReview.tsx` — computes the grand total client-side and calls the hash endpoint with it.
- `src/app/api/payhere/notify/route.ts`
  - `:13` reads `payhere_amount` from PayHere form data; `:21` verifies the MD5 signature (which proves PayHere signed *that amount* — not that the amount is correct).
  - `:46`/`:76` records `amount_usd: Number(payhere_amount)` and confirms the booking.
  - **There is never a comparison of `payhere_amount` against the booking's real computed total.**

**Realistic attack**
```
1. Book the $1,000 stay (or a stay + equipment + transfers).
2. Tamper grand_total_usd → 1.
3. Ask the hash endpoint to sign order_id=…, amount=1 → valid signature.
4. Pay $1 via PayHere (sandbox). Signature passes because PayHere signed the $1 you supplied.
5. /notify validates the signature, records $1, and confirms the booking.
```

**Recommended fix**
1. **Recompute the total server-side** in `createPayHereBooking` from DB rows: room rate × nights + board + extras + equipment (look up `equipment_categories.price_per_day_usd` × qty × days) + transfer (look up `transfers.price`). Ignore `grand_total_usd` from the client.
2. **Validate equipment and transfer prices on the server** — never store a client-sent price.
3. **Hash generation must only sign the server-computed total** for an order_id that exists, is unpaid, and belongs to the current session. Move signing into the server action or make the endpoint authenticated + ownership-checked and reject amount mismatches.
4. **`/notify` must reconcile**: load the booking + its charges, compute the expected total, and require `payhere_amount == expected_total` (and currency match) before confirming. Any mismatch → reject as underpaid and do NOT flip the booking to confirmed. Keep response to PayHere idempotent on retries.

---

## 3. 🟠 HIGH — RLS too loose: whole staff data surface readable/writable by any signed-up user

**Evidence — live `pg_policies`**

| Table | Policy | Command | Condition |
|-------|--------|---------|-----------|
| `contact_messages` | `Staff can view contact messages` | SELECT | `true` (any authenticated) |
| `contact_messages` | `Staff can update contact messages` | UPDATE | `using true / with check true` |
| `shift_notes` | `staff_read_notes` | SELECT | `auth.role() = 'authenticated'` |
| `maintenance_requests` | `staff_read_maintenance` | SELECT | `auth.role() = 'authenticated'` |
| `profiles` | `read profiles` | SELECT | `auth.role() = 'authenticated'` → whole staff directory incl. roles |
| `rooms` | `staff_update_housekeeping` | UPDATE | `auth.role() = 'authenticated'` — **no role check** |
| `bookings` / `guests` / `invoices` / `payments` / `booking_charges` | staff SELECT/INSERT/UPDATE | — | `authenticated AND get_staff_role() <> 'housekeeping'` (compounds #1) |

`profiles` INSERT and UPDATE are correctly restricted to `get_staff_role() = 'admin'`, so there is no direct self-promote via `profiles` — but combined with #1 (any signup = receptionist/mass-PII) the read exposure is the problem.

**Recommended fix**
- `contact_messages`: SELECT/UPDATE require a staff role → `get_staff_role() IS NOT NULL` (keep INSERT `using(true)` for the public contact form).
- `shift_notes`, `maintenance_requests`: require staff (receptionist/housekeeping/admin) — `get_staff_role() IS NOT NULL`.
- `profiles`: SELECT only for staff; re-check `active` where relevant.
- `rooms.staff_update_housekeeping`: add `get_staff_role() IS NOT NULL` (housekeeping/receptionist/admin may mark clean).
- Keep genuinely public reads anon-friendly on the catalog only: `rooms`, `room_categories`, `equipment_categories`, `transfers`, `settings` (public SELECT) — non-PII by design.
- Consider adding and checking an `active` flag on `get_staff_role()` so deactivated staff lose access.

---

## 4. 🟠 HIGH — RPC functions executable by anon / every authenticated user

**Evidence — live grants**
`EXECUTE` granted to `anon` and `authenticated` on:
- `global_search`
- `lookup_booking_by_ref`
- `get_available_rooms`
- `get_available_equipment_units`
- `handle_new_user`

`global_search` has **no `search_path` set** (mutable) — flagged by Supabase advisors along with `anon_security_definer_function_executable`. Combined with #1/#3, a signed-up attacker gets a working guest-PII search tool (`global_search`) that they did not need.

**Recommended fix**
- `REVOKE EXECUTE ON FUNCTION global_search FROM anon` (staff only). Also re-verify with `get_staff_role() IS NOT NULL` or rate-limit + scope in code.
- `handle_new_user`: revoke from `anon`/`authenticated` entirely (trigger invocation doesn't need explicit grants).
- `lookup_booking_by_ref`: confirm the function enforces `p_ref` + `p_email` matching a real booking and returns minimal data (no NIC/passport/payment rows). If the guest-lookup page needs anon access, keep it only if it returns a safe subset; otherwise route it through a server action.
- `get_available_rooms` / `get_available_equipment_units`: keep anon only if the public booking form uses them client-side; otherwise serve via service-role server actions and revoke.
- `SET search_path = public` (or fully qualify) on **every** function, especially any `SECURITY DEFINER`.
- Prefer `SECURITY INVOKER` for functions unless definer is strictly required.

---

## 5. 🟡 MEDIUM — Missing security headers

**Evidence**
- `next.config.ts` has no `headers()` export. Confirmed absent both in source and on `lepalmeahangama.com` (pentest-ai scan): no Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Note: the live scan was against the previous build; the source confirms the *current* code ships the same gaps.

**Recommended fix**
Add `async headers()` in `next.config.ts` returning, for all routes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security` (only meaningful over HTTPS/production)
- `Content-Security-Policy` — start with `Content-Security-Policy-Report-Only` and iterate; next build injects inline hydration scripts, so collect violations before enforcing. Base shape: `default-src 'self'; img-src 'self' data: https:; connect-src 'self' <SUPABASE_URL> https:; style-src 'self' 'unsafe-inline'; script-src 'self'` then relax only what the app actually needs.

---

## 6. 🟡 MEDIUM — Leaked-password protection disabled

**Evidence**
- Supabase advisor WARN: `auth_leaked_password_protection` is off. No code change can fix this — it's a project setting.

**Recommended fix**
- Supabase Dashboard → Authentication → Security → enable **compromised password protection**. Dashboard action, no repo code.

---

## 7. 🟡 MEDIUM — Session refresh cookie persistence broken

**Evidence — `src/lib/supabase/server.ts`**
```ts
cookies: {
  getAll: () => cookieStore.getAll(),
  setAll: () => {},   // <- no-op: refreshed tokens never persisted
}
```
Tokens are created server-side on each request, but when the session refreshes (access token expiry), the new tokens are **never written back** to the browser cookies. Sessions silently expire after the refresh window; users get logged out unexpectedly; the refresh flow itself is degraded.

**Recommended fix**
- Implement `setAll` properly by writing each cookie back through `cookieStore.set(...)` (looping `setAll([{ name, value, options }])`), remembering that cookie mutations are only allowed from Server Actions / Route Handlers / middleware-compatible contexts — call it inside the actual mutation path rather than blocking in RSC.
- Verify refresh works by logging in locally, letting the access token expire/refresh, and confirming the user stays logged in across a reload.

---

## 8. 🟡 MEDIUM — No login rate limiting

**Evidence**
- `src/app/auth/login/page.tsx` calls `signInWithPassword` directly from the client → hits Supabase Auth's `/auth/v1/token?grant_type=password`. No captcha, no throttling, no attempt limiting in the app, and no evidence of the project's Auth rate limits being tuned.

**Recommended fix**
- Supabase Dashboard → Authentication → **Rate Limits**: configure email sign-in attempt limiting (per IP / per email).
- Optional: enable Supabase **bot protection** (Turnstile) on the email provider.
- Optional hardening: route login through a server action with a simple in-memory/per-IP limiter (advisory only — Auth endpoint is still reachable directly).

---

## Remediation order

1. #1 disable public signup + rewrite `handle_new_user` (kills the blast radius of #3/#4).
2. #2 payment-integrity fixes (money).
3. #3 RLS tightening, then #4 function grants (defense-in-depth for any residual signup hole).
4. #5 next.config headers, #7 server.ts cookies (small, safe, fast).
5. #6 and #8 are dashboard settings — do alongside a normal deploy.

## Notes for how to apply DB changes

- The repo has **no `supabase/migrations/` directory**. Apply DB fixes either as a new migration file (create `supabase/migrations/`) so the schema is reproducible, or directly in the Supabase dashboard SQL editor — and **back up / snapshot before applying**.
- The e2e tests use `test@lepalme.com`, `receptionist@lepalme.com`, `housekeeping@lepalme.com` / `password123`. If you disable public signup, ensure these test accounts still exist before running Playwright.
- Validate any RLS/trigger change against the Playwright suite (`npx playwright test`) — especially booking flow and role-based access.