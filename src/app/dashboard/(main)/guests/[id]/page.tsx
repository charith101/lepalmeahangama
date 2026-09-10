import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GuestProfile } from "@/components/dashboard/GuestProfile"

export default async function GuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [guestRes, bookingsRes] = await Promise.all([
    supabase.from("guests").select("*").eq("id", id).single(),
    supabase
      .from("bookings")
      .select("*, rooms(room_number, room_categories(name))")
      .eq("guest_id", id)
      .order("check_in", { ascending: false }),
  ])

  const { data: guest } = guestRes
  if (!guest) notFound()

  const { data: bookings } = bookingsRes

  const bookingIds = (bookings ?? []).map((b) => b.id)
  let paymentsData: { amount_usd: number | null; status: string }[] = []
  if (bookingIds.length > 0) {
    const { data: pd } = await supabase
      .from("payments")
      .select("amount_usd, status")
      .in("booking_id", bookingIds)
    paymentsData = pd ?? []
  }

  const totalSpent = (bookings ?? []).reduce(
    (s, b) => s + Number(b.room_total_usd || 0), 0
  )
  const totalPaid = paymentsData
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount_usd || 0), 0)

  return (
    <GuestProfile
      data={{
        guest,
        bookings: bookings ?? [],
        totalSpent,
        totalPaid,
        outstanding: totalSpent - totalPaid,
      }}
    />
  )
}
