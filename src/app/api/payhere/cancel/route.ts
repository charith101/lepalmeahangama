import { NextRequest, NextResponse } from "next/server"
import { isUuid } from "@/lib/payhere"
import { createAdminClient } from "@/lib/supabase/admin"

// PayHere drops the guest here when they abandon the payment page (cancel_url
// carries ?group=). Release the abandoned group's holds - but never touch a
// booking that notify_url already confirmed, and send that guest to their
// confirmation page instead of telling them the booking was cancelled.
export async function GET(request: NextRequest) {
  const group = request.nextUrl.searchParams.get("group")

  if (!group || !isUuid(group)) {
    return NextResponse.redirect(new URL("/booking?payment=cancelled", request.url))
  }

  const supabase = createAdminClient()
  const { data: groupBookings, error: groupError } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("group_booking_id", group)
    .order("created_at", { ascending: true })

  if (groupError) {
    console.error("[payhere/cancel] Failed to load booking group", { group, error: groupError.message })
  }

  const paidBooking = groupBookings?.find(
    (booking) => booking.status === "confirmed" || booking.status === "checked_in",
  )
  if (paidBooking) {
    return NextResponse.redirect(new URL(`/booking/confirmation/${paidBooking.id}`, request.url))
  }

  const { data: cancelled, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("group_booking_id", group)
    .eq("status", "pending_payment")
    .select("id")

  if (error) {
    console.error("[payhere/cancel] Failed to cancel pending group", { group, error: error.message })
  } else if (cancelled?.length) {
    const ids = cancelled.map((booking) => booking.id)
    // Release the holds - equipment only while `pending`, transfers only while
    // `scheduled`, so a hold that is already active is never clobbered.
    const { error: equipmentError } = await supabase
      .from("equipment_bookings")
      .update({ status: "cancelled" })
      .in("booking_id", ids)
      .eq("status", "pending")
    if (equipmentError) {
      console.error("[payhere/cancel] Failed to release equipment holds", { group, error: equipmentError.message })
    }

    const { error: transferError } = await supabase
      .from("airport_transfers")
      .update({ status: "cancelled" })
      .in("booking_id", ids)
      .eq("status", "scheduled")
    if (transferError) {
      console.error("[payhere/cancel] Failed to release transfer holds", { group, error: transferError.message })
    }
  }

  return NextResponse.redirect(new URL("/booking?payment=cancelled", request.url))
}
