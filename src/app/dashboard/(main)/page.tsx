import Link from "next/link"
import { CalendarDays, CalendarPlus, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { OverviewCards } from "@/components/dashboard/OverviewCards"
import { QuickCheckinSheet } from "@/components/dashboard/QuickCheckinSheet"
import { QuickCheckoutSheet } from "@/components/dashboard/QuickCheckoutSheet"
import { MarkCleanSheet } from "@/components/dashboard/MarkCleanSheet"
import { RoomStatusBoard } from "@/components/dashboard/RoomStatusBoard"
import { RevenueCard } from "@/components/dashboard/RevenueCard"
import { ShiftNotes } from "@/components/dashboard/ShiftNotes"

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const todayStart = `${today}T00:00:00Z`
  const todayEnd = `${today}T23:59:59Z`

  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString().split("T")[0]

  // Overview counts
  const { count: arrivals } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("check_in", today)
    .in("status", ["confirmed", "checked_in"])

  const { count: departures } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("check_out", today)
    .in("status", ["checked_in", "checked_out"])

  const { count: totalRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("operational_status", "active")

  const { count: occupiedRooms } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .lte("check_in", today)
    .gte("check_out", today)
    .eq("status", "checked_in")

  const occupancy =
    totalRooms && totalRooms > 0
      ? Math.round(((occupiedRooms ?? 0) / totalRooms) * 100)
      : 0

  const { count: dirtyRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("operational_status", "active")
    .in("housekeeping_status", ["dirty", "cleaning"])

  const { count: pendingCheckins } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "confirmed")
    .lte("check_in", today)

  // Room Status Board: rooms
  const { data: roomsData } = await supabase
    .from("rooms")
    .select("*, room_categories(name)")
    .eq("operational_status", "active")
    .order("room_number")

  // Room Status Board: active bookings
  const { data: activeBookingsData } = await supabase
    .from("bookings")
    .select("id, room_id, check_in, check_out, status, guests(id, full_name)")
    .in("status", ["confirmed", "checked_in"])
    .lte("check_in", today)
    .gte("check_out", today)

  const roomStatuses = (roomsData ?? []).map((r) => {
    const booking = (activeBookingsData ?? []).find((b) => b.room_id === r.id)
    return {
      id: r.id,
      room_number: r.room_number,
      housekeeping_status: r.housekeeping_status,
      operational_status: r.operational_status,
      room_categories: r.room_categories,
      current_booking: booking
        ? {
            id: booking.id,
            guest_name: (booking.guests as { full_name: string } | null)?.full_name ?? null,
            status: booking.status,
            check_in: booking.check_in,
            check_out: booking.check_out,
          }
        : null,
    }
  })

  // Revenue: today's payments
  const { data: todayPmts } = await supabase
    .from("payments")
    .select("amount_usd")
    .eq("status", "completed")
    .gte("paid_at", todayStart)
    .lte("paid_at", todayEnd)

  // Revenue: month-to-date payments
  const { data: monthPmts } = await supabase
    .from("payments")
    .select("amount_usd")
    .eq("status", "completed")
    .gte("paid_at", `${monthStartStr}T00:00:00Z`)

  const todayRevenue = (todayPmts ?? []).reduce((s, p) => s + Number(p.amount_usd || 0), 0)
  const monthToDate = (monthPmts ?? []).reduce((s, p) => s + Number(p.amount_usd || 0), 0)

  // Revenue: outstanding (issued invoices - paid)
  const { data: issuedInvs } = await supabase
    .from("invoices")
    .select("grand_total_usd, booking_id")
    .eq("status", "issued")

  const issuedBids = (issuedInvs ?? []).map((i) => i.booking_id).filter(Boolean)
  let invoicePayments: { amount_usd: number | null; booking_id: string | null }[] = []
  if (issuedBids.length > 0) {
    const { data: ip } = await supabase
      .from("payments")
      .select("amount_usd, booking_id")
      .eq("status", "completed")
      .in("booking_id", issuedBids)
    invoicePayments = ip ?? []
  }
  const invoiceTotal = (issuedInvs ?? []).reduce((s, i) => s + Number(i.grand_total_usd || 0), 0)
  const paidOnInvoices = invoicePayments.reduce((s, p) => s + Number(p.amount_usd || 0), 0)
  const outstanding = Math.max(0, invoiceTotal - paidOnInvoices)

  // Shift notes
  const { data: shiftData } = await supabase
    .from("shift_notes")
    .select("*, profiles!created_by_staff_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <OverviewCards
        arrivals={arrivals ?? 0}
        departures={departures ?? 0}
        occupancy={occupancy}
        dirtyRooms={dirtyRooms ?? 0}
        pendingCheckins={pendingCheckins ?? 0}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <RoomStatusBoard rooms={roomStatuses} />

          <div className="flex flex-wrap items-center gap-2">
            <QuickCheckinSheet />
            <QuickCheckoutSheet />
            <MarkCleanSheet />
            <Button render={<Link href="/dashboard/bookings/new" />}>
              <UserPlus className="size-4" />
              Walk-in
            </Button>
            <Button variant="outline" render={<Link href="/dashboard/bookings/new" />}>
              <CalendarPlus className="size-4" />
              New Booking
            </Button>
            <Button variant="outline" render={<Link href="/dashboard/calendar" />}>
              <CalendarDays className="size-4" />
              Calendar
            </Button>
          </div>

        </div>

        <div className="space-y-6">
          <RevenueCard
            todayRevenue={todayRevenue}
            monthToDate={monthToDate}
            outstanding={outstanding}
          />
          <ShiftNotes notes={shiftData ?? []} />
        </div>
      </div>
    </div>
  )
}
