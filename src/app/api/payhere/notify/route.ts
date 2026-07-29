import { NextRequest, NextResponse } from "next/server"
import { verifyNotification } from "@/lib/payhere"
import { createAdminClient } from "@/lib/supabase/admin"

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

    const supabase = createAdminClient()
    const groupBookingId = custom_1
    const bookingId = custom_2

    if (groupBookingId) {
      const { data: bookings } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("group_booking_id", groupBookingId)
        .eq("status", "pending_payment")
        .select("id")

      if (bookings?.length) {
        await supabase.from("payments").upsert(
          {
            booking_id: bookings[0].id,
            amount_usd: Number(payhere_amount),
            method: "card_payhere",
            status: "completed",
            paid_at: new Date().toISOString(),
            payhere_payment_id: payment_id,
          },
          { onConflict: "booking_id", ignoreDuplicates: true },
        )

        await supabase
          .from("equipment_bookings")
          .update({ status: "active" })
          .eq("booking_id", bookings[0].id)
          .eq("status", "pending")
      }
    } else if (bookingId) {
      const { data: booking } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId)
        .eq("status", "pending_payment")
        .select("id")
        .single()

      if (booking) {
        await supabase.from("payments").upsert(
          {
            booking_id: booking.id,
            amount_usd: Number(payhere_amount),
            method: "card_payhere",
            status: "completed",
            paid_at: new Date().toISOString(),
            payhere_payment_id: payment_id,
          },
          { onConflict: "booking_id", ignoreDuplicates: true },
        )

        await supabase
          .from("equipment_bookings")
          .update({ status: "active" })
          .eq("booking_id", booking.id)
          .eq("status", "pending")
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}
