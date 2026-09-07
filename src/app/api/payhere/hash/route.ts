import { NextRequest, NextResponse } from "next/server"
import { generateHash } from "@/lib/payhere"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeBookingTotal } from "@/lib/booking-pricing"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const { order_id, currency } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: "Missing required field: order_id" }, { status: 400 })
    }
    if (currency !== "USD") {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 })
    }

    // order_id = "BOOK-<group_booking_id>". We only sign the server-computed
    // total for an existing, unpaid booking — never a client-supplied amount.
    if (!order_id.startsWith("BOOK-")) {
      return NextResponse.json({ error: "Invalid order reference" }, { status: 400 })
    }
    const groupBookingId = order_id.slice("BOOK-".length)
    if (!UUID_RE.test(groupBookingId)) {
      return NextResponse.json({ error: "Invalid order reference" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("group_booking_id", groupBookingId)
      .eq("status", "pending_payment")

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ error: "Order not found or not payable" }, { status: 404 })
    }

    const totalResult = await computeBookingTotal(groupBookingId)
    if ("error" in totalResult) {
      return NextResponse.json({ error: totalResult.error }, { status: 500 })
    }

    const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID || ""
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || ""
    const amount = totalResult.total.toFixed(2)
    const hash = generateHash(merchantId, order_id, amount, currency, merchantSecret)

    return NextResponse.json({ hash, merchant_id: merchantId, amount })
  } catch {
    return NextResponse.json({ error: "Failed to generate hash" }, { status: 500 })
  }
}