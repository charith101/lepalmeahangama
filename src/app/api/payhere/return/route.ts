import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get("booking_id")
  if (!bookingId) {
    return NextResponse.redirect(new URL("/booking", request.url))
  }
  return NextResponse.redirect(new URL(`/booking/confirmation/${bookingId}`, request.url))
}
