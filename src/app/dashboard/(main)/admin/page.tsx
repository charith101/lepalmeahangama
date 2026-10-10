import { createClient } from "@/lib/supabase/server"
import { AdminPanel } from "@/components/dashboard/AdminPanel"

export default async function AdminPage() {
  const supabase = await createClient()

  const [profilesRes, categoriesRes, equipmentCategoriesRes, settingsRes, roomsRes, unitsRes, maintRes, contactRes] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("room_categories").select("*").order("name"),
    supabase.from("equipment_categories").select("*").order("name"),
    supabase.from("settings").select("*").single(),
    supabase.from("rooms").select("*, category:room_categories(*)").order("room_number"),
    supabase.from("equipment_units").select("*, category:equipment_categories(*)").order("unit_label"),
    supabase.from("maintenance_requests")
      .select("*, rooms(room_number, room_categories(name)), profiles!reported_by_staff_id(full_name)")
      .not("status", "in", '("resolved","closed")')
      .order("created_at", { ascending: false }),
    supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Admin Settings</h1>
      <AdminPanel
        profiles={profilesRes.data ?? []}
        categories={categoriesRes.data ?? []}
        equipmentCategories={equipmentCategoriesRes.data ?? []}
        settings={settingsRes.data!}
        rooms={roomsRes.data ?? []}
        units={unitsRes.data ?? []}
        maintenance={maintRes.data ?? []}
        contactMessages={contactRes.data ?? []}
      />
    </div>
  )
}
