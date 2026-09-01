import { createClient } from "@/lib/supabase/server"
import { BookingForm } from "@/components/dashboard/BookingForm"

export default async function NewBookingPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: rooms }] = await Promise.all([
    supabase.from("room_categories").select("id, name, base_price_usd"),
    supabase.from("rooms").select("id, room_number, category_id, operational_status").eq("operational_status", "active"),
  ])

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">New Booking</h1>
      <BookingForm categories={categories ?? []} rooms={rooms ?? []} />
    </div>
  )
}
