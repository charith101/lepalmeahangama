import { NextRequest, NextResponse } from "next/server"
import { verifyNotification } from "@/lib/payhere"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeBookingTotal } from "@/lib/booking-pricing"
import { sendBookingConfirmation } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const merchant_id = (formData.get("merchant_id") as string) || ""
    const order_id = (formData.get("order_id") as string) || ""
    const payment_id = (formData.get("payment_id") as string) || ""
    const payhere_amount = (formData.get("payhere_amount") as string) || ""
    const payhere_currency = (formData.get("payhere_currency") as string) || ""
    const status_code = (formData.get("status_code") as string) || ""
    const md5sig = (formData.get("md5sig") as string) || ""
    const custom_1 = (formData.get("custom_1") as string) || ""
    const custom_2 = (formData.get("custom_2") as string) || ""

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || ""
    const isValid = verifyNotification(merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig, merchantSecret)
    if (!isValid) {
      return NextResponse.json({ status: "error", message: "Invalid signature" }, { status: 400 })
    }

    if (status_code !== "2") {
      return NextResponse.json({ status: "ok" })
    }

    if (payhere_currency.toUpperCase() !== "USD") {
      return NextResponse.json({ status: "error", message: "Currency mismatch" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Resolve the booking group this payment is for.
    let groupBookingId = custom_1
    if (!groupBookingId) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("group_booking_id")
        .eq("id", custom_2)
        .single()
      if (!booking?.group_booking_id) {
        return NextResponse.json({ status: "error", message: "Booking not found" }, { status: 404 })
      }
      groupBookingId = booking.group_booking_id
    }
    if (!groupBookingId) {
      return NextResponse.json({ status: "error", message: "Missing order reference" }, { status: 400 })
    }

    // Reconcile the paid amount against the expected server-computed total.
    // A signature only proves PayHere signed *that* amount — not that the
    // amount is correct. Any mismatch means underpayment: reject and do NOT
    // confirm the booking.
    const totalResult = await computeBookingTotal(groupBookingId)
    if ("error" in totalResult) {
      return NextResponse.json({ status: "error", message: totalResult.error }, { status: 500 })
    }
    const expected = totalResult.total.toFixed(2)
    const paid = Number(payhere_amount).toFixed(2)
    if (paid !== expected) {
      return NextResponse.json({ status: "error", message: "Amount mismatch" }, { status: 400 })
    }

    const { data: bookings } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("group_booking_id", groupBookingId)
      .eq("status", "pending_payment")
      .select("id")

    if (bookings?.length) {
      // payments.booking_id is no longer unique (a booking can hold a deposit
      // and a balance). Webhook retries would otherwise double-record the same
      // charge, so only record/activate/email when this charge is new.
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("booking_id", bookings[0].id)
        .maybeSingle()
      if (!existing) {
        await supabase.from("payments").insert({
          booking_id: bookings[0].id,
          amount_usd: Number(payhere_amount),
          method: "card_payhere",
          status: "completed",
          paid_at: new Date().toISOString(),
          payhere_payment_id: payment_id,
        })

        await supabase
          .from("equipment_bookings")
          .update({ status: "active" })
          .eq("booking_id", bookings[0].id)
          .eq("status", "pending")

        await sendBookingConfirmation(bookings[0].id)
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}