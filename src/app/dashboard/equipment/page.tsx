import { createClient } from "@/lib/supabase/server"
import { EquipmentPanel } from "@/components/dashboard/EquipmentPanel"

export default async function EquipmentPage() {
  const supabase = await createClient()

  const [bookingsRes, categoriesRes, unitsRes, guestsRes] = await Promise.all([
    supabase
      .from("equipment_bookings")
      .select("*, guest:guests(*), unit:equipment_units(*, category:equipment_categories(*))")
      .order("start_date", { ascending: false }),
    supabase.from("equipment_categories").select("*"),
    supabase.from("equipment_units").select("*, category:equipment_categories(*)").neq("condition_status", "retired"),
    supabase.from("guests").select("*").order("full_name"),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Equipment Rentals</h1>
      <EquipmentPanel
        bookings={bookingsRes.data ?? []}
        categories={categoriesRes.data ?? []}
        units={unitsRes.data ?? []}
        guests={guestsRes.data ?? []}
      />
    </div>
  )
}
