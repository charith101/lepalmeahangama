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

  // 365-day window of completed payments for the revenue drill-down dialog.
  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const yearAgoStr = yearAgo.toISOString().split("T")[0]

  // Kick off all independent queries in parallel (single roundtrip each,
  // no sequential waterfall). Only the outstanding-revenue query depends on
  // prior results and runs in a second batch.
  const [
    arrivalsRes,
    departuresRes,
    totalRoomsRes,
    occupiedRoomsRes,
    dirtyRoomsRes,
    pendingCheckinsRes,
    roomsDataRes,
    activeBookingsRes,
    todayPmtsRes,
    monthPmtsRes,
    issuedInvsRes,
    shiftRes,
    drillPmtsRes,
  ] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("check_in", today).in("status", ["confirmed", "checked_in"]),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("check_out", today).in("status", ["checked_in", "checked_out"]),
    supabase.from("rooms").select("*", { count: "exact", head: true }).eq("operational_status", "active"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).lte("check_in", today).gte("check_out", today).eq("status", "checked_in"),
    supabase.from("rooms").select("*", { count: "exact", head: true }).eq("operational_status", "active").in("housekeeping_status", ["dirty", "cleaning"]),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed").lte("check_in", today).gte("check_out", today),
    supabase.from("rooms").select("*, room_categories(name)").eq("operational_status", "active").order("room_number"),
    supabase.from("bookings").select("id, room_id, check_in, check_out, status, guests(id, full_name)").in("status", ["confirmed", "checked_in"]).lte("check_in", today).gte("check_out", today),
    supabase.from("payments").select("amount_usd").eq("status", "completed").gte("paid_at", todayStart).lte("paid_at", todayEnd),
    supabase.from("payments").select("amount_usd").eq("status", "completed").gte("paid_at", `${monthStartStr}T00:00:00Z`),
    supabase.from("invoices").select("grand_total_usd, booking_id").eq("status", "issued"),
    supabase.from("shift_notes").select("*, profiles!created_by_staff_id(full_name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("payments").select("id, amount_usd, paid_at, method, booking_id, bookings(guests(full_name))").eq("status", "completed").gte("paid_at", `${yearAgoStr}T00:00:00Z`).order("paid_at", { ascending: false }),
  ])

  const arrivals = arrivalsRes.count
  const departures = departuresRes.count
  const totalRooms = totalRoomsRes.count
  const occupiedRooms = occupiedRoomsRes.count
  const dirtyRooms = dirtyRoomsRes.count
  const pendingCheckins = pendingCheckinsRes.count

  const occupancy =
    totalRooms && totalRooms > 0
      ? Math.round(((occupiedRooms ?? 0) / totalRooms) * 100)
      : 0

  const roomStatuses = (roomsDataRes.data ?? []).map((r) => {
    const candidates = (activeBookingsRes.data ?? []).filter((b) => b.room_id === r.id)
    // Prefer the in-house guest, else today's arrival, else the next overlapping booking.
    const booking =
      candidates.find((b) => b.status === "checked_in") ??
      candidates.find((b) => b.check_in === today) ??
      candidates[0]
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

  const todayRevenue = (todayPmtsRes.data ?? []).reduce((s, p) => s + Number(p.amount_usd || 0), 0)
  const monthToDate = (monthPmtsRes.data ?? []).reduce((s, p) => s + Number(p.amount_usd || 0), 0)

  const drillPayments = (drillPmtsRes.data ?? []).map((p) => ({
    id: p.id,
    amount_usd: Number(p.amount_usd),
    paid_at: p.paid_at,
    method: p.method,
    booking_id: p.booking_id,
    guest_name: p.bookings?.guests?.full_name ?? null,
  }))

  // Revenue: outstanding (issued invoices - paid)
  const issuedInvs = issuedInvsRes.data ?? []
  const issuedBids = issuedInvs.map((i) => i.booking_id).filter(Boolean)
  let invoicePayments: { amount_usd: number | null; booking_id: string | null }[] = []
  if (issuedBids.length > 0) {
    const { data: ip } = await supabase
      .from("payments")
      .select("amount_usd, booking_id")
      .eq("status", "completed")
      .in("booking_id", issuedBids)
    invoicePayments = ip ?? []
  }
  const invoiceTotal = issuedInvs.reduce((s, i) => s + Number(i.grand_total_usd || 0), 0)
  const paidOnInvoices = invoicePayments.reduce((s, p) => s + Number(p.amount_usd || 0), 0)
  const outstanding = Math.max(0, invoiceTotal - paidOnInvoices)

  const shiftData = shiftRes.data

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
            <Button render={<Link href="/dashboard/bookings/new?source=walk_in" />}>
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
            payments={drillPayments}
            today={today}
            monthStart={monthStartStr}
            issuedBookingIds={issuedBids}
          />
          <ShiftNotes notes={shiftData ?? []} />
        </div>
      </div>
    </div>
  )
}
