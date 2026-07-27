"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/supabase/database.types"
import { transferSchema } from "@/lib/validations"
import { requireStaff } from "@/lib/auth"

export async function getTransferRoutes() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("airport_transfer_routes").select("*").eq("active", true)
  return error ? { error: error.message } : { data }
}

export async function createTransfer(data: {
  route_id: string; guest_id: string; booking_id?: string
  direction: "arrival" | "departure"; flight_number?: string; transfer_datetime: string; price_usd: number
}) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const result = transferSchema.safeParse({
    routeId: data.route_id, guestId: data.guest_id,
    direction: data.direction, flightNumber: data.flight_number ?? "",
    datetime: data.transfer_datetime,
  })
  if (!result.success) return { error: result.error.issues.map((i) => i.message).join("; ") }
  const supabase = createAdminClient()
  const { error } = await supabase.from("airport_transfers").insert({ ...data, status: "scheduled" })
  if (error) return { error: error.message }
  revalidatePath("/dashboard/transfers")
  return { data: null }
}

export async function updateTransferStatus(id: string, status: Database["public"]["Enums"]["transfer_status"]) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { error } = await supabase.from("airport_transfers").update({ status }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard/transfers")
  return { data: null }
}

export async function getSchedule(date: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("airport_transfers")
    .select("*, airport_transfer_routes(*), guests(full_name)")
    .gte("transfer_datetime", `${date}T00:00:00Z`)
    .lte("transfer_datetime", `${date}T23:59:59Z`)
    .order("transfer_datetime")
  return error ? { error: error.message } : { data }
}
