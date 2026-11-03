import { NextRequest, NextResponse } from "next/server"
import { groupIdFromOrderId, isPayHereFailureStatus, PAYHERE_STATUS_SUCCESS, verifyNotification } from "@/lib/payhere"
import { confirmPayHerePayment, recordFailedPayHerePayment } from "@/lib/payhere-confirm"
import { sendPaymentFailedEmail } from "@/lib/email"
import { createAdminClient } from "@/lib/supabase/admin"

// PayHere calls this server-to-server after a payment attempt, so it is the
// source of truth for the booking. return_url only redirects the guest; the
// confirmation page keeps refreshing until this notification lands.
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
    if (!merchantSecret) {
      console.error("[payhere/notify] PAYHERE_MERCHANT_SECRET is not configured - refusing every notification")
      return NextResponse.json({ status: "error", message: "Payment verification is not configured" }, { status: 500 })
    }

    const isValid = verifyNotification(
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      merchantSecret,
    )
    if (!isValid) {
      console.error("[payhere/notify] Invalid signature", { order_id, payment_id, status_code })
      return NextResponse.json({ status: "error", message: "Invalid signature" }, { status: 400 })
    }

    const amount = Number(payhere_amount)

    // Resolve the booking group this payment is for.
    const groupBookingId = custom_1 || groupIdFromOrderId(order_id) || (await groupIdForBookingId(custom_2))

    if (status_code === PAYHERE_STATUS_SUCCESS) {
      if (!groupBookingId || !payment_id) {
        console.error("[payhere/notify] Could not resolve the payment", { order_id, payment_id, custom_2 })
        return NextResponse.json({ status: "error", message: "Missing order reference" }, { status: 400 })
      }

      const outcome = await confirmPayHerePayment({
        groupBookingId,
        paymentId: payment_id,
        amount,
        currency: payhere_currency,
      })

      if (!outcome.confirmed) {
        console.error("[payhere/notify] Verified payment was not applied", {
          order_id,
          payment_id,
          reason: outcome.reason,
          detail: outcome.detail,
        })
        return NextResponse.json({ status: "error", message: outcome.reason }, { status: 400 })
      }

      return NextResponse.json({ status: "ok" })
    }

    if (isPayHereFailureStatus(status_code)) {
      const bookingId = custom_2 || (groupBookingId ? await firstBookingIdInGroup(groupBookingId) : "")
      if (bookingId) {
        const isNew = await recordFailedPayHerePayment({ bookingId, paymentId: payment_id, amount })
        if (isNew) {
          try {
            await sendPaymentFailedEmail(bookingId)
          } catch (error) {
            console.error("[payhere/notify] Failed-payment email failed", {
              bookingId,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      } else {
        console.warn("[payhere/notify] Failed payment has no booking to record", { order_id, payment_id, status_code })
      }
      return NextResponse.json({ status: "ok" })
    }

    // status_code 0 (pending) or anything unexpected: acknowledge and wait.
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("[payhere/notify] Unhandled error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}

async function groupIdForBookingId(bookingId: string): Promise<string> {
  if (!bookingId) return ""
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("bookings")
    .select("group_booking_id")
    .eq("id", bookingId)
    .single()
  return data?.group_booking_id ?? ""
}

async function firstBookingIdInGroup(groupBookingId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("group_booking_id", groupBookingId)
    .order("created_at", { ascending: true })
    .limit(1)
  return data?.[0]?.id ?? ""
}
