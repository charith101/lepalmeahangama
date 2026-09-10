import { createClient } from "@/lib/supabase/server"
import { CalendarGrid } from "@/components/dashboard/CalendarGrid"

export default async function CalendarPage() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 30)

  const todayStr = today.toISOString().split("T")[0]
  const endStr = endDate.toISOString().split("T")[0]

  const [{ data: bookings }, { data: rooms }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `id,
      check_in,
      check_out,
      status,
      room_id,
      guests (full_name),
      rooms!inner (
        room_number,
        category_id,
        room_categories!inner (name)
      )`,
      )
      .lte("check_in", endStr)
      .gte("check_out", todayStr)
      .in("status", ["pending_payment", "confirmed", "checked_in", "maintenance_block"]),
    supabase
      .from("rooms")
      .select(
        `id,
      room_number,
      category_id,
      room_categories!inner (name)`,
      )
      .eq("operational_status", "active")
      .order("room_number"),
  ])

  return <CalendarGrid bookings={bookings ?? []} rooms={rooms ?? []} startDate={todayStr} />
}
