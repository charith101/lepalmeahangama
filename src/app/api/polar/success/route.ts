import { NextRequest, NextResponse } from "next/server"
import { getPolarClient } from "@/lib/polar"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendBookingConfirmation } from "@/lib/email"

export async function GET(request: NextRequest) {
  const checkoutId = request.nextUrl.searchParams.get("checkout_id")
  if (!checkoutId) {
    return NextResponse.redirect(new URL("/booking", request.url))
  }

  try {
    const polar = getPolarClient()
    const checkout = await polar.checkouts.get({ id: checkoutId })

    const groupBookingId = checkout.metadata?.group_booking_id as string | undefined
    const bookingId = checkout.metadata?.booking_id as string | undefined

    const supabase = createAdminClient()

    if (groupBookingId) {
      const { data: bookings } = await supabase
        .from("bookings").update({ status: "confirmed" })
        .eq("group_booking_id", groupBookingId)
        .eq("status", "pending_payment")
        .select("id")

      if (bookings?.length) {
        const amountCents = typeof checkout.amount === "number" ? checkout.amount : 0
        await supabase.from("payments").upsert({
          booking_id: bookings[0].id,
          amount_usd: amountCents / 100,
          method: "card_polar",
          status: "completed",
          paid_at: new Date().toISOString(),
          polar_order_id: checkout.id ?? null,
        }, { onConflict: "booking_id", ignoreDuplicates: true })

        await supabase.from("equipment_bookings")
          .update({ status: "active" })
          .eq("booking_id", bookings[0].id)
          .eq("status", "pending")

        await sendBookingConfirmation(bookings[0].id)
      }

      return NextResponse.redirect(new URL(`/booking/confirmation/${bookings?.[0]?.id || ""}`, request.url))
    }

    if (bookingId) {
      const { data: booking } = await supabase
        .from("bookings").update({ status: "confirmed" })
        .eq("id", bookingId).eq("status", "pending_payment")
        .select("id")
        .single()

      if (booking) {
        const amountCents = typeof checkout.amount === "number" ? checkout.amount : 0
        await supabase.from("payments").upsert({
          booking_id: booking.id,
          amount_usd: amountCents / 100,
          method: "card_polar",
          status: "completed",
          paid_at: new Date().toISOString(),
          polar_order_id: checkout.id ?? null,
        }, { onConflict: "booking_id", ignoreDuplicates: true })

        await supabase.from("equipment_bookings")
          .update({ status: "active" })
          .eq("booking_id", booking.id)
          .eq("status", "pending")

        await sendBookingConfirmation(booking.id)
      }

      return NextResponse.redirect(new URL(`/booking/confirmation/${bookingId}`, request.url))
    }

    return NextResponse.redirect(new URL("/booking", request.url))
  } catch {
    return NextResponse.redirect(new URL("/booking", request.url))
  }
}
