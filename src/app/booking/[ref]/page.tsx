import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { lookupBookingByGroupId } from "@/lib/actions/bookings"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeBookingTotal } from "@/lib/booking-pricing"
import { BookingDetailClient } from "./booking-detail-client"

export const metadata: Metadata = {
  title: "My Booking",
  description: "View your booking details at Le Palme Ahangama.",
  robots: { index: false, follow: false },
}

// "14:00:00" (settings wall-clock value) → "2:00 PM"
function formatWallClock(value: string | null | undefined): string {
  const [h, m] = (value ?? "").split(":")
  const hour = Number(h)
  if (!h || Number.isNaN(hour)) return ""
  return `${((hour + 11) % 12) + 1}:${m || "00"} ${hour >= 12 ? "PM" : "AM"}`
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

  const supabase = createAdminClient()
  const [settingsRes, totalResult] = await Promise.all([
    supabase.from("settings").select("check_in_time, check_out_time").eq("id", true).maybeSingle(),
    computeBookingTotal(ref),
  ])

  const checkInTime = formatWallClock(settingsRes.data?.check_in_time)
  const checkOutTime = formatWallClock(settingsRes.data?.check_out_time)
  const stayTimes = [
    checkInTime && `Check-in from ${checkInTime}`,
    checkOutTime && `Check-out by ${checkOutTime}`,
  ].filter(Boolean).join(" · ")

  return (
    <BookingDetailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bookings={result.data as any[]}
      grandTotal={"total" in totalResult ? totalResult.total : null}
      stayTimes={stayTimes}
    />
  )
}
