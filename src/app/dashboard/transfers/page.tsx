import { createClient } from "@/lib/supabase/server"
import { TransferPanel } from "@/components/dashboard/TransferPanel"

export default async function TransfersPage() {
  const supabase = await createClient()

  const [transfersRes, routesRes, guestsRes] = await Promise.all([
    supabase
      .from("airport_transfers")
      .select("*, guest:guests(*), route:airport_transfer_routes(*)")
      .order("transfer_datetime", { ascending: true }),
    supabase.from("airport_transfer_routes").select("*").eq("active", true),
    supabase.from("guests").select("*").order("full_name"),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Airport Transfers</h1>
      <TransferPanel
        transfers={transfersRes.data ?? []}
        routes={routesRes.data ?? []}
        guests={guestsRes.data ?? []}
      />
    </div>
  )
}
