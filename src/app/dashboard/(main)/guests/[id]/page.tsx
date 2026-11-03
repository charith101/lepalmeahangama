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
  const allBookings = bookings ?? []

  const billable = allBookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "no_show"
  )
  const billableIds = billable.map((b) => b.id)

  let invoicesData: { booking_id: string; grand_total_usd: number | null }[] = []
  let chargesData: { booking_id: string; line_total_usd: number | null }[] = []
  if (billableIds.length > 0) {
    const [invRes, chgRes] = await Promise.all([
      supabase.from("invoices").select("booking_id, grand_total_usd").in("booking_id", billableIds),
      supabase.from("booking_charges").select("booking_id, line_total_usd").in("booking_id", billableIds),
    ])
    invoicesData = invRes.data ?? []
    chargesData = chgRes.data ?? []
  }

  const invoiceByBooking = new Map(
    invoicesData.map((i) => [i.booking_id, Number(i.grand_total_usd || 0)])
  )
  const chargesByBooking = new Map<string, number>()
  for (const c of chargesData) {
    chargesByBooking.set(c.booking_id, (chargesByBooking.get(c.booking_id) ?? 0) + Number(c.line_total_usd || 0))
  }

  const bookingIds = allBookings.map((b) => b.id)
  let paymentsData: { amount_usd: number | null; status: string }[] = []
  if (bookingIds.length > 0) {
    const { data: pd } = await supabase
      .from("payments")
      .select("amount_usd, status")
      .in("booking_id", bookingIds)
    paymentsData = pd ?? []
  }

  const totalSpent = billable.reduce((s, b) => {
    const invoiceTotal = invoiceByBooking.get(b.id)
    if (invoiceTotal !== undefined) return s + invoiceTotal
    return (
      s +
      Number(b.room_total_usd || 0) +
      Number(b.board_total_usd || 0) +
      (chargesByBooking.get(b.id) ?? 0)
    )
  }, 0)
  const totalPaid = paymentsData
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount_usd || 0), 0)
  const outstanding = Math.max(0, totalSpent - totalPaid)

  return (
    <GuestProfile
      data={{
        guest,
        bookings: allBookings,
        totalSpent,
        totalPaid,
        outstanding,
      }}
    />
  )
}
