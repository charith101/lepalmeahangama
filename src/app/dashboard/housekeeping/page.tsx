import { createClient } from "@/lib/supabase/server"
import { HousekeepingCard } from "@/components/dashboard/HousekeepingCard"

export default async function HousekeepingPage() {
  const supabase = await createClient()

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*, room_categories(name)")
    .eq("operational_status", "active")
    .order("room_number")

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Housekeeping</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {(rooms ?? []).map((room) => (
          <HousekeepingCard
            key={room.id}
            roomId={room.id}
            roomNumber={room.room_number}
            categoryName={room.room_categories.name}
            status={room.housekeeping_status}
          />
        ))}
      </div>
    </div>
  )
}
