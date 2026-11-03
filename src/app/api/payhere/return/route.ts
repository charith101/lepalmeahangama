import { NextRequest, NextResponse } from "next/server"
import { isUuid } from "@/lib/payhere"

// PayHere sends the guest here after a payment attempt. The booking itself is
// confirmed by notify_url - the documented server-to-server callback - so this
// route only forwards the guest. The confirmation page reads the live booking
// status and refreshes itself while a payment is still settling, which covers
// the case where PayHere's notification lands a moment after the redirect.
export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get("booking_id")

  if (!bookingId || !isUuid(bookingId)) {
    return NextResponse.redirect(new URL("/booking", request.url))
  }

  return NextResponse.redirect(new URL(`/booking/confirmation/${bookingId}`, request.url))
}
