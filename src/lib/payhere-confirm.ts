import { computeBookingTotal } from "@/lib/booking-pricing"
import { sendBookingConfirmation } from "@/lib/email"
import { createAdminClient } from "@/lib/supabase/admin"

// Both the webhook and the return/verify paths land here, so a booking can
// never be confirmed twice and can never stay unconfirmed because one of the
// two PayHere callbacks was late, retried or lost.
export type ConfirmOutcome =
  | { confirmed: true; groupBookingId: string; bookingId: string; recordedCharge: boolean }
  | { confirmed: false; reason: ConfirmFailureReason; detail?: string }

type ConfirmFailureReason =
  | "currency_mismatch"
  | "amount_mismatch"
  | "booking_not_found"
  | "total_unavailable"
  | "update_failed"

export async function confirmPayHerePayment(input: {
  groupBookingId: string
  paymentId: string
  amount: number
  currency: string
  paidAt?: string | null
}): Promise<ConfirmOutcome> {
  if (input.currency.toUpperCase() !== "USD") {
    return { confirmed: false, reason: "currency_mismatch", detail: input.currency }
  }

  // A signature only proves PayHere signed *that* amount. Re-check it against
  // the server-computed total so an underpayment can never confirm a booking.
  const total = await computeBookingTotal(input.groupBookingId)
  if ("error" in total) {
    return { confirmed: false, reason: "total_unavailable", detail: total.error }
  }

  const expected = total.total.toFixed(2)
  const paid = Number(input.amount)
  if (!Number.isFinite(paid) || paid.toFixed(2) !== expected) {
    return { confirmed: false, reason: "amount_mismatch", detail: `expected ${expected}, paid ${input.amount}` }
  }

  const supabase = createAdminClient()
  const { data: group, error: groupError } = await supabase
    .from("bookings")
    .select("id, status, created_at")
    .eq("group_booking_id", input.groupBookingId)
    .order("created_at", { ascending: true })

  if (groupError) {
    return { confirmed: false, reason: "booking_not_found", detail: groupError.message }
  }
  if (!group?.length) {
    return { confirmed: false, reason: "booking_not_found" }
  }

  const bookingIds = group.map((booking) => booking.id)
  const primaryBookingId = bookingIds[0]

  // Webhook retries and the return-page poll both arrive here. Key on the
  // gateway payment id so the charge and the email happen exactly once: a
  // `failed` row from an earlier attempt must not block a later success, so
  // only a completed charge counts as "already recorded".
  const { data: recorded, error: recordedError } = await supabase
    .from("payments")
    .select("id, status")
    .eq("payhere_payment_id", input.paymentId)
    .limit(1)

  if (recordedError) {
    console.error("[payhere/confirm] Payment lookup failed", {
      group: input.groupBookingId,
      paymentId: input.paymentId,
      error: recordedError.message,
    })
  }

  const recordedRow = recorded?.[0]
  if (recordedRow?.status === "refunded") {
    // The money was returned; a delayed PayHere retry must never re-apply it.
    return { confirmed: true, groupBookingId: input.groupBookingId, bookingId: primaryBookingId, recordedCharge: false }
  }
  const alreadyRecorded = recordedRow?.status === "completed"

  // `cancelled` is included on purpose: expire_pending_bookings cancels stale
  // holds 15 minutes after checkout starts. If PayHere says the guest paid, the
  // payment wins over that automatic cancellation - but only for a charge we
  // have not seen before, so a later staff cancellation is never resurrected.
  const revivableStatuses: Array<"pending_payment" | "cancelled"> = alreadyRecorded
    ? ["pending_payment"]
    : ["pending_payment", "cancelled"]
  const needsConfirmation = group.some(
    (booking) => booking.status === "pending_payment" || (!alreadyRecorded && booking.status === "cancelled"),
  )

  if (!needsConfirmation && alreadyRecorded) {
    return { confirmed: true, groupBookingId: input.groupBookingId, bookingId: primaryBookingId, recordedCharge: false }
  }

  // The room exclusion constraint rejects a revive when another guest took the
  // room after the expiry cron released this one. Never drop the charge in that
  // case: record the money below and let staff sort out the clash/refund.
  let confirmedNow = false
  let confirmationError = ""
  if (needsConfirmation) {
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("group_booking_id", input.groupBookingId)
      .in("status", revivableStatuses)

    if (updateError) {
      confirmationError = updateError.message
      console.error("[payhere/confirm] Booking could not be confirmed", {
        group: input.groupBookingId,
        paymentId: input.paymentId,
        error: updateError.message,
      })
    } else {
      confirmedNow = true
    }
  }

  let recordedCharge = false
  // A guest can pay twice (two tabs, retried card) and a crashed run can be
  // recovered by PayHere retrying the notification. Only the first successful
  // charge for the group owns the confirmation email.
  let firstChargeForGroup = false
  if (!alreadyRecorded) {
    const { data: priorCharges } = await supabase
      .from("payments")
      .select("id")
      .in("booking_id", bookingIds)
      .eq("status", "completed")
    firstChargeForGroup = !priorCharges?.length

    const charge = {
      amount_usd: paid,
      method: "card_payhere" as const,
      status: "completed" as const,
      paid_at: input.paidAt ?? new Date().toISOString(),
      payhere_payment_id: input.paymentId,
    }

    const { error: chargeError } = recordedRow
      ? await supabase.from("payments").update(charge).eq("id", recordedRow.id)
      : await supabase.from("payments").insert({ booking_id: primaryBookingId, ...charge })

    if (chargeError) {
      // A concurrent notify/return can insert between our select and insert.
      // The unique index on payhere_payment_id rejects the loser; the winner
      // owns the confirmation email.
      if (chargeError.code !== "23505") {
        console.error("[payhere/confirm] Failed to record the charge", {
          group: input.groupBookingId,
          paymentId: input.paymentId,
          error: chargeError.message,
        })
      }
    } else {
      recordedCharge = true
    }
  }

  // Never release holds on a group we did not actually confirm (or one that is
  // no longer live); a cancelled booking must stay cancelled.
  const holdsLive =
    confirmedNow || group.some((booking) => booking.status === "confirmed" || booking.status === "checked_in")

  if (holdsLive) {
    // Equipment holds start as `pending` (staff-created bookings start
    // `active`), so activating a pending row also heals a retry where an
    // earlier call stopped between confirming and releasing them.
    const { error: equipmentError } = await supabase
      .from("equipment_bookings")
      .update({ status: "active" })
      .in("booking_id", bookingIds)
      .in("status", confirmedNow ? ["pending", "cancelled"] : ["pending"])

    if (equipmentError) {
      console.error("[payhere/confirm] Failed to activate equipment holds", {
        group: input.groupBookingId,
        error: equipmentError.message,
      })
    }
  }

  // Transfers and cron-released holds are only revived by the run that actually
  // confirms the group. A late webhook retry on an already-confirmed booking
  // must never resurrect something staff cancelled afterwards.
  if (confirmedNow) {
    const { error: transferError } = await supabase
      .from("airport_transfers")
      .update({ status: "scheduled" })
      .in("booking_id", bookingIds)
      .in("status", ["scheduled", "cancelled"])

    if (transferError) {
      console.error("[payhere/confirm] Failed to restore transfer holds", {
        group: input.groupBookingId,
        error: transferError.message,
      })
    }
  }

  // Email once, on the first successful charge for the group. A duplicate
  // payment is still recorded (staff will see it and refund), but it must not
  // send a second "you're confirmed" email.
  if (recordedCharge && firstChargeForGroup && holdsLive) {
    try {
      await sendBookingConfirmation(primaryBookingId)
    } catch (error) {
      console.error("[payhere/confirm] Confirmation email failed", {
        bookingId: primaryBookingId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (needsConfirmation && !confirmedNow) {
    return { confirmed: false, reason: "update_failed", detail: confirmationError }
  }

  return { confirmed: true, groupBookingId: input.groupBookingId, bookingId: primaryBookingId, recordedCharge }
}

/** Record a verified failure so staff can see the attempt. Returns true when a new row was written. */
export async function recordFailedPayHerePayment(input: {
  bookingId: string
  paymentId: string
  amount: number
}): Promise<boolean> {
  if (!input.bookingId || !Number.isFinite(input.amount) || input.amount <= 0) return false

  const supabase = createAdminClient()
  const { data: existing, error: lookupError } = await supabase
    .from("payments")
    .select("id")
    .eq("payhere_payment_id", input.paymentId)
    .limit(1)

  if (lookupError) {
    console.error("[payhere/confirm] Failed to check failed-payment record", {
      paymentId: input.paymentId,
      error: lookupError.message,
    })
    return false
  }
  if (existing?.length) return false

  const { error: insertError } = await supabase.from("payments").insert({
    booking_id: input.bookingId,
    amount_usd: input.amount,
    method: "card_payhere",
    status: "failed",
    payhere_payment_id: input.paymentId || null,
  })

  if (insertError) {
    console.error("[payhere/confirm] Failed to record failed payment", {
      paymentId: input.paymentId,
      error: insertError.message,
    })
    return false
  }

  return true
}
