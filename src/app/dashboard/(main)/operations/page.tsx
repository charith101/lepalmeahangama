import { createClient } from "@/lib/supabase/server"
import { OperationsTimeline } from "@/components/dashboard/OperationsTimeline"
import { formatHotelTime, HOTEL_TZ } from "@/lib/datetime"

/** Minutes since midnight of an "HH:MM[:SS]" wall-clock setting value. */
function parseClock(t: string) {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Minutes since midnight of a stored ISO timestamp, in hotel-local time. */
function isoToHotelMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HOTEL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso))
  const [h, m] = parts.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const { date: dateParam } = await searchParams
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today
  const isToday = date === today
  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  const [arrRes, depRes, transferRes, equipRes, settingsRes] = await Promise.all([
    supabase.from("bookings").select("id, guests(full_name), rooms(room_number)").eq("check_in", date).in("status", ["confirmed", "checked_in"]),
    supabase.from("bookings").select("id, guests(full_name), rooms(room_number)").eq("check_out", date).in("status", ["checked_in", "checked_out"]),
    supabase.from("airport_transfers").select("id, direction, flight_number, transfer_datetime, guests(full_name), airport_transfer_routes(airport_name)").gte("transfer_datetime", dayStart).lte("transfer_datetime", dayEnd).eq("status", "scheduled"),
    supabase.from("equipment_bookings").select("id, guests(full_name), equipment_units(unit_label, equipment_categories(name))").eq("end_date", date).eq("status", "active"),
    supabase.from("settings").select("check_in_time, check_out_time").eq("id", true).single(),
  ])

  const checkInTime = settingsRes.data?.check_in_time?.slice(0, 5) ?? "14:00"
  const checkOutTime = settingsRes.data?.check_out_time?.slice(0, 5) ?? "11:00"
  const when = isToday ? "today" : `on ${date}`

  const timelineEvents = [
    ...(arrRes.data ?? []).map((b) => ({
      id: `arr-${b.id}`,
      type: "arrival" as const,
      time: checkInTime,
      sortMin: parseClock(checkInTime),
      url: `/dashboard/bookings/${b.id}`,
      title: `${b.guests?.full_name ?? "Guest"} — Room ${b.rooms?.room_number ?? "?"}`,
      subtitle: `Check-in ${when}`,
    })),
    ...(depRes.data ?? []).map((b) => ({
      id: `dep-${b.id}`,
      type: "departure" as const,
      time: checkOutTime,
      sortMin: parseClock(checkOutTime),
      url: `/dashboard/bookings/${b.id}`,
      title: `${b.guests?.full_name ?? "Guest"} — Room ${b.rooms?.room_number ?? "?"}`,
      subtitle: `Check-out ${when}`,
    })),
    ...(transferRes.data ?? []).map((t) => ({
      id: `trn-${t.id}`,
      type: "transfer" as const,
      time: formatHotelTime(t.transfer_datetime),
      sortMin: isoToHotelMinutes(t.transfer_datetime),
      url: "/dashboard/transfers",
      title: `${t.guests?.full_name ?? "Guest"} — ${t.direction === "arrival" ? "Arrival" : "Departure"}`,
      subtitle: `${t.airport_transfer_routes?.airport_name ?? "Airport"}${t.flight_number ? ` (${t.flight_number})` : ""}`,
    })),
    ...(equipRes.data ?? []).map((e) => ({
      id: `eq-${e.id}`,
      type: "equipment_return" as const,
      time: "12:00",
      sortMin: 12 * 60,
      title: `${e.guests?.full_name ?? "Guest"} — ${e.equipment_units?.unit_label ?? "Item"}`,
      subtitle: `Return due ${when}`,
    })),
  ].sort((a, b) => a.sortMin - b.sortMin)

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">{isToday ? "Today's Operations" : "Operations"}</h1>
      <div className="max-w-lg">
        <OperationsTimeline events={timelineEvents} date={date} isToday={isToday} />
      </div>
    </div>
  )
}
