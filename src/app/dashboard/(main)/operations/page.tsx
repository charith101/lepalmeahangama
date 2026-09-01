import { createClient } from "@/lib/supabase/server"
import { OperationsTimeline } from "@/components/dashboard/OperationsTimeline"

export default async function OperationsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const todayStart = `${today}T00:00:00Z`
  const todayEnd = `${today}T23:59:59Z`

  const [arrRes, depRes, transferRes, equipRes] = await Promise.all([
    supabase.from("bookings").select("id, guests(full_name), rooms(room_number)").eq("check_in", today).in("status", ["confirmed", "checked_in"]),
    supabase.from("bookings").select("id, guests(full_name), rooms(room_number)").eq("check_out", today).in("status", ["checked_in", "checked_out"]),
    supabase.from("airport_transfers").select("id, direction, flight_number, transfer_datetime, guests(full_name), airport_transfer_routes(airport_name)").gte("transfer_datetime", todayStart).lte("transfer_datetime", todayEnd).eq("status", "scheduled"),
    supabase.from("equipment_bookings").select("id, guests(full_name), equipment_units(unit_label, equipment_categories(name))").eq("end_date", today).eq("status", "active"),
  ])

  const timelineEvents = [
    ...(arrRes.data ?? []).map((b) => ({
      id: `arr-${b.id}`,
      type: "arrival" as const,
      time: "14:00",
      title: `${b.guests?.full_name ?? "Guest"} — Room ${b.rooms?.room_number ?? "?"}`,
      subtitle: "Check-in today",
    })),
    ...(depRes.data ?? []).map((b) => ({
      id: `dep-${b.id}`,
      type: "departure" as const,
      time: "11:00",
      title: `${b.guests?.full_name ?? "Guest"} — Room ${b.rooms?.room_number ?? "?"}`,
      subtitle: "Check-out today",
    })),
    ...(transferRes.data ?? []).map((t) => ({
      id: `trn-${t.id}`,
      type: "transfer" as const,
      time: new Date(t.transfer_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      title: `${t.guests?.full_name ?? "Guest"} — ${t.direction === "arrival" ? "Arrival" : "Departure"}`,
      subtitle: `${t.airport_transfer_routes?.airport_name ?? "Airport"}${t.flight_number ? ` (${t.flight_number})` : ""}`,
    })),
    ...(equipRes.data ?? []).map((e) => ({
      id: `eq-${e.id}`,
      type: "equipment_return" as const,
      time: "12:00",
      title: `${e.guests?.full_name ?? "Guest"} — ${e.equipment_units?.unit_label ?? "Item"}`,
      subtitle: "Return due today",
    })),
  ].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Today&apos;s Operations</h1>
      <div className="max-w-lg">
        <OperationsTimeline events={timelineEvents} />
      </div>
    </div>
  )
}
