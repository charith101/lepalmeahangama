import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { lookupBookingByGroupId } from "@/lib/actions/bookings"
import { BookingDetailClient } from "./booking-detail-client"

export const metadata: Metadata = {
  title: "My Booking",
  description: "View your booking details at Le Palme Ahangama.",
}

export default async function BookingRefPage(props: {
  params: Promise<{ ref: string }>
  searchParams: Promise<{ email?: string }>
}) {
  const { ref } = await props.params
  const { email } = await props.searchParams

  if (!email) redirect("/booking/lookup")

  const result = await lookupBookingByGroupId(ref, email)
  if (result.error || !result.data) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <BookingDetailClient bookings={result.data as any[]} />
}
