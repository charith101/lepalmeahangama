import { createClient } from "@/lib/supabase/server"
import { GuestTable } from "@/components/dashboard/GuestTable"

export default async function GuestsPage() {
  const supabase = await createClient()
  const { data: guests } = await supabase
    .from("guests")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Guest Register</h1>
      <GuestTable guests={guests ?? []} />
    </div>
  )
}
